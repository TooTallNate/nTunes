require.paths.unshift(__dirname);
var fs = require("fs");
var sys = require("sys");
var Url = require("url");
var Buffer = require("buffer").Buffer;
var connect = require("connect");
var xml2js = require('xml2js');
var applescript = require("applescript");
require.paths.shift();

// Before doing anything, let's import the "iTunes.sdef" file. The free
// variable 'SDEF' will contain the parsed object, which is used to
// dynamically build the nTunes API.
var parser = new xml2js.Parser(),
  SDEF,
  // Commands are POST or PUT only requests.
  COMMAND,
  // Properties are GET always, sometimes POST if prop is writable.
  PROPERTY,
  // Classes have a recursive search API. GET always works, certains
  // properties of retrieved objects have writable (POST) props.
  CLASS;
parser.on('end', function(result) {
  
  var iTunesSuite = result.suite[1];
  
  COMMAND = processXmlList(iTunesSuite.command);
  PROPERTY = processXmlList(iTunesSuite['class'][0].property);
  CLASS = processXmlList(iTunesSuite['class'].slice(1));

  console.log(Object.keys(PROPERTY));
  
  /*//console.log("\nPOST (set) property urls available:");
  iTunesSuite['class'][0].property.forEach(function(property) {
    if (property['@'].access != 'r') {
      //console.log("\t/" + property['@'].name);
    }
  });*/
  
  SDEF = result;

});
fs.readFile(__dirname + '/iTunes.sdef', function(err, data) {
  parser.parseString(data);
});


// Regexps to detect "aliases" in the API. For example:
//   /sound%20volume    sucks, so instead, we alias,
// and prefer to use /volume.
var VOLUME = /^\/volume/;


// The 'nTunes' constructor is a full subclass of 'connect', but allows the
// ability to add aditional layers in front of the nTunes layers, in case you
// would like to serve other content on urls not in use by nTunes (be careful!)
function nTunes(layers) {
  var self = this;
  
  // Concat nTunes layers to the end of 'layers' here
  layers = layers.concat([
    function(req, res, next) {
      if (!SDEF) {
        res.writeHead(500, {  
          "content-type": "application/json"
        });
        res.end(JSON.stringify({
          error: 'the "iTunes.sdef" definition file hasn\'t loaded yet'
        }));
      } else {
        next();
      }
    },
    function(req, res, next) {
      // Add URL alises here
      if (VOLUME.test(req.url)) {
        req.url = req.url.replace(VOLUME, "/sound%20volume");
      }
      next();
    },
    function(req, res, next) {
      var url = Url.parse(req.url);
      url.decodedPath = decodeURIComponent(url.pathname);
      var isValidApiRequest = false;
      switch(req.method) {
        case "GET":
          if (PROPERTY.REGEXP.test(url.decodedPath)) {
            // A top level property getter
            isValidApiRequest = true;

            var prop = url.decodedPath.match(PROPERTY.REGEXP)[1];
            
            var asCode = 'tell application "iTunes" to get ' + prop;
            
            applescript.execString(asCode, function(err, stdout, stderr) {
              
              //console.log(Object.prototype.toString.call(stdout));
              var outJSON = JSON.stringify(stdout);
              res.writeHead(200, {
                "Content-Length": Buffer.byteLength(outJSON)
              });
              res.end(outJSON);              
            });

          }
          break;
        case "POST":
          break;
        case "PUT":
          break;
        case "DELETE":
          break;
      }
      if (!isValidApiRequest) {
        next();
      }
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
  "id": "pass this in the middleware stack, represents the nTunes layer stack"
};

// Don't use `sys.inherits`, since it might be removed. Inherit from the
// prototype of 'connect.Server'.
nTunes.prototype = Object.create(connect.Server.prototype, {
  constructor: {
    value: nTunes,
    enumerable: false
  }
});

// Export the constructor itself since we're badass like that ☺
module.exports = nTunes;




// Accepts a parsed JS object from the XML .sdef file.
// Returns an object with the property names as keys,
// and it's contents as the value. A RegExp is also
// attached at RTN.REGEXP which matches valid 'req.url's.
function processXmlList(list) {
  var rtn = {}, name = null, regexp = "^/(";
  list.forEach(function(item) {
    name = item['@'].name;
    rtn[name] = item;
    regexp += name + "|";
  });
  rtn.REGEXP = new RegExp(regexp.substring(0, regexp.length-1) + ")");
  return rtn;
}
