var fs = require("fs");
var sys = require("sys");
var http = require("http");
var applescript = require("applescript");
var nSpecifier = require("nTunes-specifier");
var plsParser = require("pls-parser");
var radioRedirecter = require("radio-redirecter");

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
  nClass.getClass("track").addHandler("raw", function(req, res) {
    
    // First we're gonna want to make a specifier that generates the
    // AppleScript code to get the location of the requested track.    
    // TODO: Add a check to ensure that this is a single track, and not a list.
    var locationSpecifier = new nSpecifier(this.input.substring(0, this.input.lastIndexOf("/")+1)+"location");
    
    // Next actually execute the AppleScript code to get the location of
    // the track.
    applescript.execString('tell application "iTunes"\n'+locationSpecifier.vars+'get '+locationSpecifier.finalVar+'\nend tell\n', function(exit, rtn) {
      
      rtn = "/Users/nrajlich/Epoq-Lepidoptera.ogg";
      
      // Make sure that we got a String, and not an Array.
      // An array would mean it requested a list (we can't do that).
      if (typeof rtn != 'string') {
        res.writeHead(400);
        res.end('cannot call "raw" on lists.');
        return;
      }
      
      // Stat the file in order to ensure it exists, get the total size, and
      // and last modification time.
      fs.stat(rtn, function(err, stat) {
        if (err) {
          var jsonErr = JSON.stringify(err);
          res.writeHead(500, {
            'Content-Length': Buffer.byteLength(jsonErr)
          });
          res.end(jsonErr);
          return;
        }

        // The options for the read stream. If "range" was requested, a
        // 'start' and 'end' option will need to be added.
        var readOpts = {};
        // The HTTP response code.
        var responseCode = 200;
        // The HTTP response headers.
        var responseHeaders = {
          'Date': (new Date).toUTCString(),
          'Keep-Alive': "timeout=15, max=100",
          'Etag': '"1f128b-427f68-dc112400"',
          'Accept-Ranges': 'bytes',
          'Content-Type': 'application/ogg',
          'Content-Length': stat.size,
          'Connection': "Keep-Alive",
          'Last-Modified': stat.mtime.toUTCString(),
          // Cache in browser for 1 year
          'Cache-Control': 'public max-age=' + 31536000
        };
        // Now check if the client requested a "range", and modify
        // the response accordingly.
        if (req.headers.range) {
          var range = req.headers.range;

          console.log(range);

          if (range.substring(0,6) == 'bytes=') {
            range = range.substring(6).split(',')[0];
            range = range.split("-");
            var start = range[0];
            var end = range[1];
            if (isNaN(start) || start == '') {
              start = stat.size-end-1;
              end = stat.size-1;
            }
            if (isNaN(end) || end == '') {
              end = stat.size-1;
            }
            responseCode = 206;
            responseHeaders['Content-Length'] = end - start + 1;
            responseHeaders['Content-Range'] = "bytes " + start + "-" + end + "/" + stat.size;
            readOpts.start = start;
            readOpts.end = end;
          }
        }
        
        // Now finally stream the file contents out to the client.
        //var rs = fs.createReadStream(rtn, readOpts);
        //res.writeHead(200, responseHeaders);
        //rs.on('data', function(chunk) {
          //res.write(chunk);
        //});
        //rs.on('end', function() {
          //res.end();
        //});
        
        fs.open(rtn, 'r', 0666, function(err, fd) {
          
          if (err) {
            throw err;
          }
          
          var buf = new Buffer(responseHeaders['Content-Length']);
          fs.read(fd, buf, 0, responseHeaders['Content-Length'], start, function(err, bytesRead) {
            
            console.log(bytesRead);
            
            res.writeHead(responseCode, responseHeaders);
            res.end(buf);
          
            fs.close(fd, function(err) {
              
            });
            
          });
          
          
        });
        
        
      });
    });
  });
  
  
  
  
  // The 'playlist' handler on 'URL track's first retrieves the "address" of
  // URL track, which is a URL to an iTunes redirecting service (see
  // "radio-redirecter.js"). Once the redirected URL is know, "pls-parser.js"
  // retrieves the PLS file and parses it into a native JS object to send
  // to the client.
  nClass.getClass("track").addHandler("playlist", function(req, res, nTunes) {

    // First we're gonna want to make a specifier that generates the
    // AppleScript code to get the address of the requested URL track.
    // TODO: Add a check to ensure that this is a single track, and not a list.
    var addressSpecifier = new nSpecifier(this.input.substring(0, this.input.lastIndexOf("/")+1)+"address");
    
    // Next actually execute the AppleScript code to get the location of
    // the track.
    applescript.execString('tell application "iTunes"\n'+addressSpecifier.vars+'get '+addressSpecifier.finalVar+'\nend tell\n', function(exit, rtn, stderr) {
      
      if (exit) {
        return nTunes.sendNTunesResponse(res, 500, null, {
          error: new Error(stderr)
        });
      }
      
      radioRedirecter.getRadioLocation(rtn, function(err, radioLoc) {
        
        if (err) {
          return nTunes.sendNTunesResponse(res, 500, null, {
            error: err
          });
        }

        plsParser.parsePls(radioLoc, function(err, pls) {

          if (err) {
            return nTunes.sendNTunesResponse(res, 500, null, {
              error: err
            });
          }

          nTunes.sendNTunesResponse(res, 200, null, pls);
          
        });
        
      });
      
    });
    
  });
}
