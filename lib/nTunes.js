require.paths.unshift(__dirname);
var fs = require("fs");
var sys = require("sys");
var Url = require("url");
var querystring = require("querystring");
var Buffer = require("buffer").Buffer;
var connect = require("connect");
var xml2js = require('xml2js');
var applescript = require("applescript");
var nClass = require("nTunes-class");
var nCommand = require("nTunes-command");
require.paths.shift();


// Before doing anything, let's import the "iTunes.sdef" file. The free
// variable 'SDEF' will contain the parsed object, which is used to
// dynamically build the nTunes API.
var parser = new xml2js.Parser(),
  SDEF,
  COMMANDS,
  CLASSES;

parser.on('end', function(result) {
  var iTunesSuite = result.suite[1];

  COMMANDS = processCommands(iTunesSuite.command);
  CLASSES = processClasses(iTunesSuite['class']);
  
  SDEF = result;

});
fs.readFile(__dirname + '/iTunes.sdef', function(err, data) {
  parser.parseString(data);
});




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

// For the most flexibility, pass this object in your middleware stack to
// represent where the nTunes layers go overall in the stack. This allows
// the end user to put layers both before and after the nTunes layers with
// the most flexibiltiy.
nTunes.LAYERS = {
  "id": "pass this in your middleware stack, represents the nTunes layer stack"
};

// Don't use `sys.inherits`, since it might be removed. Inherit from the
// prototype of 'connect.Server'.
nTunes.prototype = Object.create(connect.Server.prototype, {
  constructor: {
    value: nTunes,
    enumerable: false
  }
});


nTunes.prototype.doNTunesCommand = function(command, params, res, url) {
  var ncommand = COMMANDS[command];
  var asStr = 'tell application "iTunes" to ' + command + ' ';
  
  ncommand.parameters.forEach(function(parameter) {
    var userDidSupplyParam = parameter.name in params;
    if (!userDidSupplyParam && !parameter.optional) {
      // Return error, user did not supply required param
    }
    if (userDidSupplyParam) {
      if (parameter.name != "value") {
        asStr += parameter.name + " ";
      }
      if (parameter.type == "specifier") {
        asStr += resolveSpecifier(params[parameter.name]);
      } else if (parameter.type == "boolean") {
        asStr += String(params[parameter.name]).toLowerCase() == "true" ? "yes" : "no";
      }
      asStr += " ";
    }
  });
  
  //console.log(asStr);
  applescript.execString(asStr, function(err, out, stderr) {
    //console.
  });
}

// The first handler ensures that the SDEF XML file has been processed, and
// if it hasn't, it waits for it to finish before calling "next()".
nTunes.prototype.ensureSdefIsProcessed = function(req, res, next) {
  if (!SDEF) {
    parser.on('end', function(result) {
      setTimeout(function() {
        next();
      }, 10);
    });
  } else {
    next();
  }
}


// The primary handler for the nTunes API. 
nTunes.prototype.handleNTunesRequest = function(req, res, next) {
  var self = this,
    url = Url.parse(req.url, true),
    isValidApiRequest = false;
  
  url.decodedPath = decodeURIComponent(url.pathname);
  
  // Each "/" in the request URI represents selecting a resource, narrowing
  // down the previous selection, or possibly calling a command.
  url.request = url.decodedPath.split("/").slice(1);
  
  // First check for the case of a "command", since it's only valid with a
  // single token in the URI, and a POST method request.
  if (req.method == "POST" && url.request.length == 1 && COMMANDS.REGEXP.test(url.request[0])) {
    isValidApiRequest = true;
    
    var body = "";
    req.setEncoding("utf8");
    req.on("data", function(chunk) {
      body += chunk;
    });
    req.on("end", function() {
      req.body = querystring.parse(decodeURIComponent(body));
      self.doNTunesCommand(url.request[0], req.body, res, url);
    });
  }

  // If it's not a command, then maybe it's a class/property lookup.
  
  
  if (!isValidApiRequest) {
    next();
  }
}

// Check for nTunes API convenience aliases.
nTunes.prototype.handleNTunesAliases = function(req, res, next) {
  for (var i=0, l=this.aliases.length; i<l; i++) {
    if (this.aliases[i][1].test(req.url)) {
      req.url = req.url.replace(this.aliases[i][1], this.aliases[i][0]);
      break;
    }
  }
  next();
}

// Called whenever the nTunes API is ready to send a response to the client.
// It's a single shared function so that we can do last minute things like
// convert the data to a different transfer format if the client requested.
//   i.e. checks for ?format=xml to convert to XML
nTunes.prototype.sendNTunesResponse = function(res, responseBody, urlObj) {
  
}


// Export the constructor itself since we're badass like that ☺
module.exports = nTunes;





function processCommands(list) {
  var commands = {};
  for (var i=0, l=list.length; i<l; i++) {
    var c = new nCommand(list[i]);
    commands[c.name] = c;
  }
  Object.defineProperty(commands, "REGEXP", {
    value: new RegExp(Object.keys(commands).join("|")),
    enumerable: false
  });
  return commands;
}

function processClasses(list) {
  var classes = {};
  for (var i=0, l=list.length; i<l; i++) {
    var c = new nClass(list[i]);
    classes[c.name] = c;
  }
  return classes;
}

// Accepts a String of a REST request URI.
function resolveSpecifier(specifier) {
  var rtn = "";
  var chunks = specifier.split("/").splice(1);
  var currentObj = CLASSES.application;
  var i = 0;
  
  while (i < chunks.length) {
    var propOrClass = chunks[i++];
    if (propOrClass.indexOf(",") >= 0) {
      var propOrClass = propOrClass.split(",");
      var goodProps = true;
      propOrClass.forEach(function(prop) {
        if (!currentObj.hasProperty(prop)) {
          goodProps = false;
        }
      });
    }
    if (goodProps || currentObj.hasProperty(propOrClass)) {
      if (Array.isArray(propOrClass)) {
        rtn += "{";
        for (var j=0; j<propOrClass.length; j++) {
          rtn += propOrClass[j];
          if (j < propOrClass.length-1) rtn += ", ";
        }
        rtn += "} of ";
      } else {
        rtn += propOfClass + " of ";
      }
    } else if (currentObj.hasElement(propOrClass)) {
      currentObj = CLASSES[propOrClass];
      var specifier = chunks[i++];
      var newRtn = "(";
      var isNum = specifier == String(Number(specifier));
      
      if (isNum) {
        specifier = Number(specifier);
        newRtn += propOrClass + " ";
        if (specifier < 0) {
          newRtn += "id " + Math.abs(specifier);
        } else {
          newRtn += specifier;
        }
      } else {
        // Handle "Intro" (direct name selection) and name=blah (search API) cases
        newRtn += "every " + propOrClass;
      }
      if (rtn.length > 0) {
        newRtn += " of " + rtn;
      }
      newRtn += ")";
      rtn = newRtn;
    } else {
      // TODO: return error, 'currentObj' doesn't have prop or element
      // 'propOrClass'!
    }
  }
  rtn.type = currentObj;
  return rtn;
}
