var fs = require("fs");
var sys = require("sys");
var http = require("http");
var helpers = require("helpers");
var applescript = require("applescript");
var nSpecifier = require("nTunes-specifier");
var playlistParser = require("radio-playlist-parser");

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
    applescript.execString('tell application "iTunes"\n'+addressSpecifier.vars+'get '+addressSpecifier.finalVar+'\nend tell\n', function(exit, address, stderr) {
      
      if (exit) {
        return nTunes.sendNTunesResponse(res, 500, null, {
          error: new Error(stderr)
        });
      }
      
      playlistParser.getPlaylist(address, function(err, playlist) {
        nTunes.sendNTunesResponse(res, 200, null, playlist);
      });
      
    });
  });




  // The 'raw' handler on the 'artwork' class has a similar concept to the raw
  // for the 'tracks' class: it returns a browser-ready Image with the proper
  // "Content-Type" header (determined from the 'format' property), etc.
  //
  // TODO: I want to get server-size resizing and format converting for
  //       artwork (some of my embedded artwork are fucking BIG! >3mb!).
  nClass.getClass("artwork").addHandler("raw", function(req, res, nTunes) {

    // First we're gonna want to make a specifier that generates the
    // AppleScript code to get the "format" and the "raw data" of the
    // requested "artwork".
    var formatSpecifier = new nSpecifier(this.input.substring(0, this.input.lastIndexOf("/")+1)+"format,raw data");
    
    // Next actually execute the AppleScript code to get both the "format"
    // and "raw data" of the "artwork".
    applescript.execString('tell application "iTunes"\n'+formatSpecifier.vars+'get '+formatSpecifier.finalVar+'\nend tell\n', function(exit, rtn, stderr) {
      
      var responseHeaders = {};
      // So first inspect the "format" property to determine whether it's a
      // JPEG or PNG, and set the "Content-Type" appropriately.
      if (/JPEG/i.test(rtn[0])) {
        responseHeaders['Content-Type'] = 'image/jpeg';
      } else if (/PNG/i.test(rtn[0])) {
        responseHeaders['Content-Type'] = 'image/png';
      }
      // Send the binary image data back to the HTTP client.
      nTunes.sendNTunesResponse(res, 200, responseHeaders, rtn[1]);

    });
  });
  
  
}
