var fs = require("fs");
var sys = require("sys");
var http = require("http");
var Step = require("step");
var im = require("imagemagick");
var helpers = require("helpers");
var nSpecifier = require("nTunes-specifier");
var playlistParser = require("radio-playlist-parser");

/* Here are the custom "handlers" that come packaged with nTunes. These
 * are the most common functionality missing from the standard iTunes API.
 */
module.exports = function(CLASSES) {
  
  // A handler for "file tracks" which first looks up the 'location' of the
  // specified track, then streams the file to the HTTP client.
  // Meant to be played back with HTML5 <audio>, <video>, Flash, etc.
  CLASSES["track"].addHandler("raw", function(req, res, nTunes) {

    // First we get the "location" and "kind" of the specified track.
    // TODO: Add a pre-check to ensure that this is a single track, and not a list.
    var parent = this.parent();
    Step(
      function() {
        parent.get("location", "kind", this);
      },
      function(err, location, kind) {
        if (err) {
          return nTunes.sendNTunesResponse(res, 500, null, {
            error: err
          });
        }
        
        if (location == 'missing value') {
          return nTunes.sendNTunesResponse(res, 500, null, {
            error: new Error("Can't find track. Check file location.")
          });          
        }

        // Make sure that we got a String, and not an Array.
        // An array would mean the user requested 'raw' on a list of tracks (we
        // can only do single tracks).
        if (Array.isArray(location)) {
          res.writeHead(400, {});
          return res.end('cannot call "raw" on lists.');
        }

        // Now that we have a filename, we must serve the raw media file back
        // to the client over HTTP.
        helpers.serveStaticFile(req, res, location);
      }
    );
  });
  
  
  
  
  // The 'streams' handler on 'URL track's first retrieves the "address" of
  // URL track, which is a URL to an iTunes redirecting service.
  // "radio-playlist-parser.js" retrieves the remote file and parses it,
  // ultimately returning an Array of absolute URLs to infinite audio streams
  // of the 'URL track'.
  CLASSES["track"].addHandler("streams", function(req, res, nTunes) {

    // First we're gonna want to get the address of the requested URL track.
    // TODO: Add a check to ensure that this is a single track, and not a list.
    var parent = this.parent();
    Step(
      function() {
        parent.get("address", this);
      },
      function(err, address) {
        if (err) throw err;
        playlistParser.getPlaylist(address, this);
      },
      function(err, playlist) {
        if (err) {
          return nTunes.sendNTunesResponse(res, 500, null, {
            error: err
          });
        }        
        nTunes.sendNTunesResponse(res, 200, null, playlist);
      }
    );
  });




  // The 'raw' handler on the 'artwork' class has a similar concept to the raw
  // for the 'tracks' class: it returns a browser-ready Image with the proper
  // "Content-Type" header (determined from the 'format' property), etc.
  CLASSES["artwork"].addHandler("raw", function(req, res, nTunes) {

    // First we're gonna get the "format" and the "raw data" of the
    // requested "artwork".
    var parent = this.parent();
    Step(
      function() {
        parent.get("format", "raw data", this);
      },
      function(err, format, rawData) {
        if (err) throw err;
        // Inspect the "format" property to determine whether it's a
        // JPEG or PNG
        if (/JPEG/i.test(format)) {
          format = "jpg";
        } else if (/PNG/i.test(format)) {
          format = "png";
        } else {
          throw new Error("Unrecognized iTunes Artwork format: \"" + format +'"')
        }
        
        var args = req.parsedUrl.query;
        if (args) {
          if (args.size) args.width = args.height = args.size;
          this.parallel()(null, args.format || format);
          args.srcData = rawData.toString('binary');
          args.srcFormat = format;
          args.format = args.format || format;
          delete args.dstPath;
          im.resize(args, this.parallel());
        } else {
          // No query params given, just send the original image data.
          this.parallel()(null, format);
          this.parallel()(null, rawData);
        }
      },
      function(err, format, rawData) {
        if (err) {
          return nTunes.sendNTunesResponse(res, 500, null, {
            error: err
          });
        }

        if (!Buffer.isBuffer(rawData)) {
          rawData = new Buffer(rawData, 'binary');
        }

        // Send the binary image data back to the HTTP client.
        nTunes.sendNTunesResponse(res, 200, {
          "Content-Type": helpers.mime(format)
        }, rawData);
      }
    );      
  });


}
