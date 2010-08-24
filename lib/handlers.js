var fs = require("fs");
var sys = require("sys");
var http = require("http");
var helpers = require("helpers");
var applescript = require("applescript");
var nSpecifier = require("nTunes-specifier");
var plsParser = require("pls-parser");
var radioRedirecter = require("radio-redirecter");

module.exports = function(nClass) {
  
  
  // A handler for "file tracks" which first looks up the 'location' of the
  // track via AppleScript, then streams the file to the HTTP client.
  // Meant to be used with HTML5 <audio> or Flash.
  nClass.getClass("track").addHandler("raw", function(req, res) {
    
    // First we're gonna want to make a specifier that generates the
    // AppleScript code to get the location of the requested track.    
    // TODO: Add a check to ensure that this is a single track, and not a list.
    var locationSpecifier = new nSpecifier(this.input.substring(0, this.input.lastIndexOf("/")+1)+"location");
    
    // Next actually execute the AppleScript code to get the location of
    // the track.
    applescript.execString('tell application "iTunes"\n'+locationSpecifier.vars+'get '+locationSpecifier.finalVar+'\nend tell\n', function(exit, rtn) {
      
      // Make sure that we got a String, and not an Array.
      // An array would mean it requested a list (we can't do that).
      if (typeof rtn != 'string') {
        res.writeHead(400, {});
        res.end('cannot call "raw" on lists.');
        return;
      }
      
      // Now that we have a filename, we must serve the static media file from the disk.
      helpers.serveStaticFile(req, res, rtn);
      
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
