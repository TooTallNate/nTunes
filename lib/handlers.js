const fs = require("fs");
const sys = require("sys");
const http = require("http");
const helpers = require("helpers");
const nSpecifier = require("nTunes-specifier");
const playlistParser = require("radio-playlist-parser");

/* Sets up the custom "handlers" built into nTunes. The ones built-in
 * are generally missing functionality from the standard iTunes API.
 */
module.exports = function(nClass) {
  
  // A handler for "file tracks" which first looks up the 'location' of the
  // specified track, then streams the file to the HTTP client.
  // Meant to be played back with HTML5 <audio>, <video>, Flash, etc.
  nClass["track"].addHandler("raw", function(req, res, nTunes) {
    
    // First we get the "location" and "kind" of the specified track.
    // TODO: Add a pre-check to ensure that this is a single track, and not a list.
    this.item().get("location", "kind" , function(err, rtn) {
      if (err) {
        return nTunes.sendNTunesResponse(res, 500, null, {
          error: err
        });
      }
      
      // Make sure that we got a String, and not an Array.
      // An array would mean the user requested 'raw' on a list of tracks (we
      // can only do single tracks).
      if (Array.isArray(rtn.location)) {
        res.writeHead(400, {});
        return res.end('cannot call "raw" on lists.');
      }
      
      // Now that we have a filename, we must serve the raw media file back
      // to the client over HTTP.
      helpers.serveStaticFile(req, res, rtn.location);
      
    });
  });
  
  
  
  
  // The 'streams' handler on 'URL track's first retrieves the "address" of
  // URL track, which is a URL to an iTunes redirecting service.
  // "radio-playlist-parser.js" retrieves the remote file and parses it,
  // ultimately returning an Array of absolute URLs to infinite audio streams
  // of the 'URL track'.
  nClass["track"].addHandler("streams", function(req, res, nTunes) {

    // First we're gonna want to get the address of the requested URL track.
    // TODO: Add a check to ensure that this is a single track, and not a list.
    this.item().get("address", function(err, address) {
      if (err) {
        return nTunes.sendNTunesResponse(res, 500, null, {
          error: err
        });
      }
      
      playlistParser.getPlaylist(address, function(err, playlist) {
        if (err) {
          return nTunes.sendNTunesResponse(res, 500, null, {
            error: err
          });
        }
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
  nClass["artwork"].addHandler("raw", function(req, res, nTunes) {

    // First we're gonna get the "format" and the "raw data" of the
    // requested "artwork".
    this.item().get("format", "raw data", function(err, rtn) {
      if (err) {
        return nTunes.sendNTunesResponse(res, 500, null, {
          error: err
        });
      }
      
      var responseHeaders = {};
      // So first inspect the "format" property to determine whether it's a
      // JPEG or PNG, and set the "Content-Type" appropriately.
      if (/JPEG/i.test(rtn.format)) {
        responseHeaders['Content-Type'] = 'image/jpeg';
      } else if (/PNG/i.test(rtn.format)) {
        responseHeaders['Content-Type'] = 'image/png';
      }
      // Send the binary image data back to the HTTP client.
      nTunes.sendNTunesResponse(res, 200, responseHeaders, rtn['raw data']);

    });
  });
  
  
}
