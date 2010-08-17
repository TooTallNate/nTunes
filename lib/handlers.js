var fs = require("fs");
var applescript = require("applescript");
var nSpecifier = require("nTunes-specifier");

module.exports = function(nClass) {
  
  // Stupid "hello world" custom handler attached to the "root" application.
  nClass.getClass("application").addHandler("hello", function(req, res) {
    var r = "Hello nTunes!\n";
    res.writeHead(200, {
      'Content-Length': Buffer.byteLength(r)
    });
    res.end(r);
  });
  
  // A handler for "file tracks" which first looks up the 'location' of the
  // track via AppleScript, then streams the file to the HTTP client.
  // Meant to be used with HTML5 <audio>.
  nClass.getClass("track").addHandler("data", function(req, res) {
    var locationSpecifier = new nSpecifier(this.input.substring(0, this.input.lastIndexOf("/")+1)+"location");
    applescript.execString('tell application "iTunes"\n'+locationSpecifier.vars+'get '+locationSpecifier.finalVar+'\nend tell\n', function(exit, rtn) {
      if (typeof rtn != 'string') {
        res.writeHead(400);
        res.end();
        return;
      }
      
      fs.stat(rtn, function(err, stat) {
        if (err) {
          //if (err.errno === process.ENOENT) {
          //  next();
          //} else {
            var jsonErr = JSON.stringify(err);
            res.writeHead(500, {
              'Content-Length': Buffer.byteLength(jsonErr)
            });
            res.end(jsonErr);
            return;
          //}
        }
        fs.readFile(rtn, function(err, data) {
          res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Content-Length': data.length,
            'Last-Modified': stat.mtime.toUTCString(),
            // Cache in browser for 1 year
            'Cache-Control': 'public max-age=' + 31536000
          });
          res.end(data);
        });
      });
    });
  });
  
}
