require.paths.unshift(__dirname);
var xml2js = require("xml2js");
var parse = require("url").parse;
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
// Read the file synchronously, since the 'xml2js' parseString function is
// also synchronous. This is wanted behavior in this case though, since it's
// only the inital parsing of the classes, and we want them to be immediately
// available for extending by the user of the module.
parser.parseString(require("fs").readFileSync(__dirname + '/iTunes.sdef'));



// Patch "node-applescript"'s UndefinedParser to look for Specifiers
// in the result, and convert them to URIs for the API to use.
var oldUndefinedParser = applescript.Parsers.UndefinedParser;
var suffix = ' of application "iTunes"';
applescript.Parsers.UndefinedParser = function() {
  var result = oldUndefinedParser.apply(this, arguments);
  if (result.substring(result.length-suffix.length) == suffix) {
    result = nSpecifier.specifierFromApplescript(result);
  }
  return result;
}



// The 'nTunes' function is directly returned from the "nTunes" module. When
// it is called, it returns a connect layer that is the nTunes API. It usually
// goes at the bottom of your connect stack. See "bin/nTunes" for an example.
function nTunes() {
  function nTunesLayer(req, res, next) {
    var self = nTunesLayer;
    req.parsedUrl = res.parsedUrl = parse(req.url, true);

    // Each "/" in the request URI represents selecting a resource, narrowing
    // down the previous selection, or possibly calling a command.
    req.parsedUrl.request = req.parsedUrl.pathname.split("/").slice(1);

    // First check for the case of a "command", since it's only valid with a
    // single token in the URI, and a POST method request.
    if (req.method == "POST" && req.parsedUrl.request.length == 1 && nCommand.REGEXP.test(req.parsedUrl.request[0])) {
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
        // If 'new nSpecifier' throws an error, then the user requested
        // an invalid specifier. nTunes should respond with a 400 status
        // code and an Error object.
        return self.sendNTunesResponse(res, 400, null, {
          error: e
        });
      }

      // If this request is for a custom handler, then invoke the
      // custom callback.
      if (resolvedSpecifier.handler) {
        resolvedSpecifier.handler(req, res, self);

      } else {
        var as = resolvedSpecifier.vars;

        if (req.method == "POST") {
          req.body = "";
          req.setEncoding("utf8");
          req.on("data", function(chunk) { req.body += chunk; });
          req.on("end", function() {
            if (req.body.length > self.defaultValue.length+1 && req.body.substring(0, self.defaultValue.length) == self.defaultValue) {
              req.body = querystring.parse(req.body);
            } else {
              req.body = new String(req.body);
              req.body[self.defaultValue] = String(req.body);
            }
            var value = querystring.unescape(req.body[self.defaultValue]);
            as += "set " + resolvedSpecifier.finalVar + " to " + value + "\n";
            as += "get " + resolvedSpecifier.finalVar;
            self.doAppleScriptThenResponse(as, res);
          });

        } else if (req.method == "GET") {
          as += 'get ' + resolvedSpecifier.finalVar;
          self.doAppleScriptThenResponse(as, res);
        }
      }
    }
  }
  // Make the layer inherit everything that the normal 'nTunes' module has.
  // This way, you have the option of either modifying your layer instance,
  // or modifying the module itself globally.
  nTunesLayer.__proto__ = nTunes;
  return nTunesLayer;
}

// The value used in POST request when there is an unnamed parameter.
nTunes.defaultValue = "value";

nTunes.doNTunesCommand = function(command, params, res) {
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

// Performs the passed AppleScript code against the "iTunes" application,
// then sends the response from AppleScript to the HTTP client, ending
// the request.
nTunes.doAppleScriptThenResponse = function(as, res) {
  var self = this;
  as = 'tell application "iTunes"\n' + as + "\nend tell";
  applescript.execString(as, function(err, rtn) {
    if (err) {
      self.sendNTunesResponse(res, 500, null, {
        error: err
      });
    } else {
      self.sendNTunesResponse(res, 200, null, rtn);
    }
  });
}

// Called whenever the nTunes API is ready to send a response to the client.
// It's a single shared function so that we can do last minute things like
// convert the data to a different transfer format if the client requested.
//   i.e. checks for ?format=xml to convert to XML
nTunes.sendNTunesResponse = function(res, code, headers, body) {
  var format = res.parsedUrl.query && res.parsedUrl.query.format ? res.parsedUrl.query.format : 'json';

  headers = headers || {};
  if (Buffer.isBuffer(body)) {
    // Manually set the 'Content-Length' if the body is a Buffer.
    format = "buffer";
    headers['Content-Length'] = body.length;
  } else if (res.parsedUrl.query && res.parsedUrl.query.unique && Array.isArray(body)) {
    // Handle the 'unique' query parameter.
    body = helpers.arrayUniqDeep(body);
  }
  // Ensure there's a 'Content-Type'
  if (!headers['Content-Type']) {
    headers['Content-Type'] = helpers.mime(format);
  }

  res.writeHead(code, headers);
  // TODO: Implement body conversion to XML.
  res.end(format == 'buffer' ? body : JSON.stringify(body));
}

// The 'CLASSES' property contains all the 'nClass' instances parsed from the
// iTunes.sdef file. It is exported to the nTunes module so that the end user
// can add additional handlers to classes as needed.
nTunes.CLASSES = nClass;

module.exports = nTunes;
