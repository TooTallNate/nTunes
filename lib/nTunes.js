require.paths.unshift(__dirname);
var fs = require("fs");
var sys = require("sys");
var Url = require("url");
var xml2js = require('xml2js');
var connect = require("connect");
var helpers = require("helpers");
var handlers = require("handlers");
var nClass = require("nTunes-class");
var nCommand = require("nTunes-command");
var querystring = require("querystring");
var applescript = require("applescript");
var nSpecifier = require("nTunes-specifier");
require.paths.shift();

// Before doing anything, the "iTunes.sdef" file must be read and
// parsed. The SDEF file dynamically builds the 'nTunes' API once
// the file has been parsed into memory.
var parser = new xml2js.Parser();
  
parser.on('end', function(result) {
  // With the parsed XML result, we need to format the object into
  // nClass and nCommand instances.
  var iTunesSuite = result.suite[1];
  nCommand.processCommands(iTunesSuite.command);
  nClass.processClasses(iTunesSuite['class']);
  nSpecifier.setNClass(nClass);
  
  // Add the custom nTunes class handlers from "handlers.js"
  handlers(nClass);
  
  parser = null;
});
fs.readFile(__dirname + '/iTunes.sdef', function(err, data) {
  parser.parseString(data);
});


// Patch "node-applescript"'s UndefinedParser to look for Specifiers
// in the result, and convert them to URIs for the API to use.
var oldUndefinedParser = applescript.Parsers.UndefinedParser;
applescript.Parsers.UndefinedParser = function() {
  var result = oldUndefinedParser.apply(this, arguments);
  if (result.substring(result.length-24) == ' of application "iTunes"') {
    result = nSpecifier.specifierFromApplescript(result);
  }
  return result;
}



// The 'nTunes' constructor is a full subclass of 'connect', but allows the
// ability to add aditional layers in front of the nTunes layers, in case you
// would like to serve other content on urls not in use by nTunes (be careful!)
function nTunes(layers) {
  var self = this;
  
  // Concat nTunes layers to the end of 'layers' here
  layers = layers.concat([
    function(req, res, next) {
      self.ensureSdefIsProcessed(req, res, next);
    },
    //function(req, res, next) {
      //self.handleNTunesAliases(req, res, next);
    //},
    function(req, res, next) {
      self.handleNTunesRequest(req, res, next);
    }
  ]);

  // Call the 'connect' Server constructor, to complete the subclassing.
  connect.Server.call(self, layers);
}

// Public API can use 'nTunes.createServer' for familiarity with the connect
// and http modules, or simply use the 'nTunes' module as a constructor.
nTunes.createServer = function() {
  return new nTunes(Array.prototype.slice.call(arguments));
}

// Don't use `sys.inherits`, since it might be removed. Inherit from the
// prototype of 'connect.Server'.
nTunes.prototype = Object.create(connect.Server.prototype, {
  constructor: {
    value: nTunes,
    enumerable: false
  }
});


nTunes.prototype.doNTunesCommand = function(command, params, res) {
  var ncommand = nCommand.getCommand(command);
  var asStr = command + ' ';
  var self = this;
  
  ncommand.parameters.forEach(function(parameter) {
    var userDidSupplyParam = parameter.name in params;
    if (!userDidSupplyParam && !parameter.optional) {
      // Return error, user did not supply required param
      var e = new Error("Required parameter \"" + parameter.name + "\" was not found.");
      self.sendNTunesResponse(res, 500, null, {
        error: e
      });
    }
    if (userDidSupplyParam) {
      if (parameter.name != "value") {
        asStr += parameter.name + " ";
      }
      if (parameter.type == "specifier") {
        var specifier = new nSpecifier(params[parameter.name]);
        asStr = specifier.vars + asStr + specifier.finalVar;
      } else if (parameter.type == "boolean") {
        asStr += String(params[parameter.name]).toLowerCase() == "true" ? "yes" : "no";
      }
      asStr += " ";
    }
  });
  self.doAppleScriptThenResponse(asStr, res);
}

// The first handler ensures that the .sdef XML file has been processed,
// and if it hasn't, it waits for it to finish before calling "next()".
nTunes.prototype.ensureSdefIsProcessed = function(req, res, next) {
  if (parser) {
    parser.on('end', function() {
      // Wait a tiny amount of time to ensure that the parsing handler
      // is the first 'end' handler for the parser.
      process.nextTick(next);
    });
  } else {
    next();
  }
}


// The primary handler for the nTunes API. 
nTunes.prototype.handleNTunesRequest = function(req, res, next) {
  var self = this,
    isValidApiRequest = false;
  req.parsedUrl = res.parsedUrl = Url.parse(req.url, true);
  
  // Each "/" in the request URI represents selecting a resource, narrowing
  // down the previous selection, or possibly calling a command.
  req.parsedUrl.request = req.parsedUrl.pathname.split("/").slice(1);
  
  // First check for the case of a "command", since it's only valid with a
  // single token in the URI, and a POST method request.
  if (req.method == "POST" && req.parsedUrl.request.length == 1 && nCommand.REGEXP.test(req.parsedUrl.request[0])) {
    isValidApiRequest = true;
    
    var body = "";
    req.setEncoding("utf8");
    req.on("data", function(chunk) {
      body += chunk;
    });
    req.on("end", function() {
      req.body = querystring.parse(querystring.unescape(body));
      self.doNTunesCommand(req.parsedUrl.request[0], req.body, res);
    });
    
  } else {
    // If it's not a command, then maybe it's a class/property lookup.
    // Attempt to resolve the url into a 'specifier'.
    var resolvedSpecifier;
    try {
      resolvedSpecifier = new nSpecifier(req.parsedUrl.pathname);
    } catch (e) {
      // If ' new nSpecifier' throws an error, then the user requested
      // an invalid specifier. nTunes should respond with a 400 status
      // code and an Error object.
      return self.sendNTunesResponse(res, 400, null, {
        error: e
      });
    }

    isValidApiRequest = true;
  
    // If this request is for a custom handler, then invoke the
    // custom callback.
    if (resolvedSpecifier.handler) {
      resolvedSpecifier.handler(req, res, self);
      
    } else {
      var as = resolvedSpecifier.vars;
  
      if (req.method == "POST") {
        var body = "";
        req.setEncoding("utf8");
        req.on("data", function(chunk) {
          body += chunk;
        });
        req.on("end", function() {
          req.body = querystring.parse(querystring.unescape(body));
          as += "set " + resolvedSpecifier.finalVar + " to " + req.body.value + "\n";
          as += "get " + resolvedSpecifier.finalVar;
          self.doAppleScriptThenResponse(as, res);
        });

      } else if (req.method == "GET") {
        as += 'get ' + resolvedSpecifier.finalVar;
        self.doAppleScriptThenResponse(as, res);
      }
    }
  }

  if (!isValidApiRequest) {
    next();
  }
}

// Performs the passed AppleScript code against the "iTunes" application,
// then sends the response from AppleScript to the HTTP client, ending
// the request.
nTunes.prototype.doAppleScriptThenResponse = function(as, res) {
  var self= this;
  as = 'tell application "iTunes"\n' + as + "\nend tell";
  applescript.execString(as, function(err, stdout, stderr) {
    if (err) {
      var e = new Error(stderr);
      e.appleScript = as;
      e.exitCode = err;
      self.sendNTunesResponse(res, 500, null, {
        error: e
      });
    } else {
      self.sendNTunesResponse(res, 200, null, stdout);
    }
  });
}

// Called whenever the nTunes API is ready to send a response to the client.
// It's a single shared function so that we can do last minute things like
// convert the data to a different transfer format if the client requested.
//   i.e. checks for ?format=xml to convert to XML
nTunes.prototype.sendNTunesResponse = function(res, code, headers, body) {
  var format = res.parsedUrl.query && res.parsedUrl.query.format ? res.parsedUrl.query.format : 'json';
  
  if (Buffer.isBuffer(body)) {
    format = "buffer";
  } else if (res.parsedUrl.query && res.parsedUrl.query.unique && Array.isArray(body)) {
    body = helpers.arrayUniqDeep(body);
  }

  headers = headers || {};
  if (!headers['Content-Type']) {
    headers['Content-Type'] = helpers.mime[format];
  }
  if (format == 'buffer') {
    headers['Content-Length'] = body.length;
  }

  res.writeHead(code, headers);
  // TODO: Implement body conversion to XML.
  res.end(format == 'buffer' ? body : JSON.stringify(body));
}

// Export the constructor itself since we're badass like that ☺
module.exports = nTunes;
