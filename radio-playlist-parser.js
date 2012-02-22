const net = require("net");
const path = require("path");
const parse = require("url").parse;
const uniq = require("./helpers").arrayUniq;
const parseM3u = require("./m3u-parser").parseM3u;
const parsePls = require("./pls-parser").parsePls;

const R = '\r'.charCodeAt(0);
const N = '\n'.charCodeAt(0);

// Used by the "URL track" "playlist" handler. The problem is
// that the redirected value from "address" can be a link to
// either a PLS playlist, an M3U playlist, directly to an ICY stream,
// or even another 302 to any of those kinds.
//
// This module reads data using the "net" module until it reads
// a "\r\n\r\n" (end of header). From there is can determine
// which of the links was returned:
//    a PLS or M3U playlist:
//      be read, parsed, and put into an Array of urls.
//    a raw or ICY stream:
//      connection be aborted, and return an Array of the 'plsUrl'
exports.getPlaylist = function(plsUrl, callback) {
  
  console.log("Getting Playlist: " + plsUrl);
  var parsedUrl = parse(plsUrl);
  //console.log(parsedUrl);

  var conn = net.createConnection(parsedUrl.port || (parsedUrl.protocol == "https:" ? 443 : 80), parsedUrl.hostname, parsedUrl.hostname);
  conn.on("connect", function() {
    // Once connected, send a minimal HTTP response to the redirecter service.
    var w = 
      "GET " + (parsedUrl.pathname ? parsedUrl.pathname : "/") + (parsedUrl.search ? parsedUrl.search : "") + " HTTP/1.1\r\n"+
      "Host: " + parsedUrl.host + "\r\n"+
      "Connection: close\r\n"+
      "\r\n";
    
    //console.log("Sending to Server:");
    //console.log(w);

    conn.write(w);
  });
  
  // Build up the HTTP response (should only be a header).
  var response;
  conn.on("data", function(chunk) {
    
    // Append 'chunk' into the 'response' variable
    if (!response) {
      response = chunk;
    } else {
      var temp = new Buffer(response.length + chunk.length);
      response.copy(temp, 0, 0);
      chunk.copy(temp, response.length+1, 0);
      response = temp;
    }
    
    
    if (response.length > 4) {
      // Check to see if the end of the header has been reached.
      // If so we need to determine what kind of response we got.
      for (var i=0, l=Math.min(response.length-3, 8192); i<l; i++) {
        // Check for /r/n/r/n
        if (response[i] == R && response[i+1] == N && response[i+2] == R && response[i+3] == N) {
          // We found the end of the header!
          var header = response.slice(0, i).toString('utf8');
          //console.log(header);

          // Destory the connection.
          conn.destroy();

          // If it's an ICY stream / raw HTTP stream (check content-type), make return the URL itself
          var firstLine = header.substring(0, header.indexOf("\r")).split(" ");

          if (firstLine[0] == "ICY") {
            // It's an ICY stream
            console.log("Detected an ICY stream! Invoking 'callback'")
            callback(null, [plsUrl]);

          } else {
            // It's a regular HTTP response

            if (firstLine[1] == 302) {
              var loc = exports.getHeader(header, "location");

              // Invoke the algorithm again on the new Location
              console.log("Redirected to: " + loc);
              exports.getPlaylist(loc, callback);
              
            } else if (firstLine[1] == 200) {
              var type = exports.getHeader(header, "content-type"),
                extension = path.extname(plsUrl).toLowerCase();
              if (/mpegurl/i.test(type) || extension == ".m3u") {
                // It's an M3U playlist
                parseM3u(plsUrl, function(err, m3u) {
                  if (err) return callback(err);
                  callback(null, uniq(m3u));
                });
              } else if (/scpls/i.test(type) || extension == ".pls") {
                // It's a PLS playlist
                parsePls(plsUrl, function(err, pls) {
                  if (err) return callback(err);
                  var rtn = [];
                  Object.keys(pls).forEach(function(key) {
                    if (key.substring(0,4).toLowerCase() == "file") {
                      rtn.push(pls[key]);
                    }
                  });
                  callback(null, uniq(rtn));
                });
              } else {
                // Unknown Content-Type!!
                callback(new Error("Unknown Content-Type:" + type));
              }
              
            } else {
              // Some other kind of status code (404 maybe?)
              callback(new Error(header));
            }
          }
          
          return;
        }
      }
    }
    
  });
}

// Gets the value of a requested HTTP header, from an entire HTTP header string.
// TODO: This looks fragile... Make better?
exports.getHeader = function(entireHeader, requestedHeader) {
  requestedHeader = requestedHeader.toLowerCase();
  return entireHeader.split("\r\n").filter(function(line) {
    return line.toLowerCase().indexOf(requestedHeader + ":") === 0;
  })[0].substring(requestedHeader.length+1).trimLeft();
}
