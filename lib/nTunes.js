require.paths.unshift(__dirname);
var sys = require("sys");
var fs = require("fs");
var connect = require("connect");
var xml2js = require('xml2js');
var applescript = require("applescript");
require.paths.shift();

// Before doing anything, let's import the "iTunes.sdef" file. The free
// variable 'sdef' will contain the parsed object, which is used to
// dynamically build the nTunes API.
var sdef, parser = new xml2js.Parser();
parser.on('end', function(result) {
  sdef = result;
  
  var iTunesSuite = sdef.suite[1];
  
  console.log("\nPUT command urls available:");
  iTunesSuite.command.forEach(function(command) {
    console.log("\t/" + command['@'].name);
  });
  
  console.log("\nGET (get) property urls available:");
  iTunesSuite['class'][0].property.forEach(function(property) {
    console.log("\t/" + property['@'].name);
  });

  console.log("\nPOST (set) property urls available:");
  iTunesSuite['class'][0].property.forEach(function(property) {
    if (property['@'].access != 'r') {
      console.log("\t/" + property['@'].name);
    }
  });
  
  console.log("\nGET and POST class urls (search API):");
  iTunesSuite['class'].slice(1).forEach(function(clazz) {
    console.log("\t/" + clazz['@'].name);
  });
    
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
      if (!sdef) {
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
    connect.router(function(app) {
      app.get("/volume", function(req, res){
        
      });
    })
  ]);
  
  // Call the 'connect' Server constructor, to complete the subclassing.
  connect.Server.call(self, layers);
}

// Public API can use 'nTunes.createServer' for familiarity with the connect
// and http modules, or simply use the 'nTunes' module as a constructor.
nTunes.createServer = function() {
  return new nTunes(Array.prototype.slice.call(arguments));
}

// Don't use `sys.inherits`, since it might be removed.
nTunes.prototype = Object.create(connect.Server.prototype, {
  constructor: {
    value: nTunes,
    enumerable: false
  }
});

// Export the constructor itself since we're badass like that ☺
module.exports = nTunes;
