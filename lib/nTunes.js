require.paths.unshift(__dirname);
var sys = require("sys");
var fs = require("fs");
var connect = require("connect");
var applescript = require("applescript");
require.paths.shift();

// The 'nTunes' constructor is a full subclass of 'connect', but allows the
// ability to add aditional layers in front of the nTunes layers, in case you
// would like to serve other content on urls not in use by nTunes (be careful!)
function nTunes(layers) {
  var self = this;
  
  // Concat nTunes layers to the end of 'layers' here
  layers = layers.concat([
    connect.router(function(app) {
      app.get("/volume", function(req, res, next){
        console.log(req.url);
        next();
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
