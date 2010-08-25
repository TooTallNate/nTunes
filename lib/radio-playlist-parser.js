const net = require("net");
const url = require("url");

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
  
  var parsedUrl = url.parse(plsUrl);
  //console.log(parsedUrl);

  var conn = net.createConnection(parsedUrl.port || (parsedUrl.protocol == "https:" ? 443 : 80), parsedUrl.hostname, parsedUrl.hostname);
  conn.on("connect", function() {
    // Once connected, send a minimal HTTP response to the redirecter service.
    var w = 
      "GET " + (parsedUrl.pathname ? parsedUrl.pathname : "/") + (parsedUrl.search ? parsedUrl.search : "") + " HTTP/1.1\r\n"+
      "Host: " + parsedUrl.host + "\r\n"+
      "Connection: close\r\n"+
      "\r\n";
    //console.log(w);
    conn.write(w);
  });
  
  // Build up the HTTP response (should only be a header).
  var response;
  conn.on("data", function(chunk) {
    
    // Append 'chunk' into the 'response' variable
    if (!response) response = chunk;
    else {
      var temp = new Buffer(response.length + chunk.length);
      response.copy(temp, 0, 0);
      chunk.copy(temp, response.length+1, 0);
      response = temp;
    }
    
    
    if (response.length > 4) {
      // Check to see if the end of the header has been reached.
      // If so we need to determine what kind of response we got.
      for (var i=0, l=Math.min(response.length-4, 8192); i<l; i++) {
        if (response[i] == R && response[i+1] == N && response[i+2] == R && response[i+3] == N) {
          // We found the end of the header!
          var header = response.slice(0, i).toString('utf8');
          // Destory the connection.
          conn.destroy();
          // If it's an ICY stream / raw HTTP stream (check content-type), make return the URL itself
          var firstLine = header.substring(0, header.indexOf("\r")).split(" ");
          if (firstLine[0] == "ICY") {
            // It's an ICY stream
            callback(null, [plsUrl]);
          } else {
            // It's a regular HTTP response

            if (firstLine[1] == 302) {
              // This looks fragile...
              var loc = header.split("\r\n").filter(function(line) {
                return line.toLowerCase().indexOf("location:") === 0;
              })[0].substring(9).trimLeft();
              console.log(loc);
              // Invoke the algorithm again on the new Location
              exports.getPlaylist(loc, callback);
              
            } else if (firstLine[1] == 200) {
              console.log(response.toString('utf8'));

            } else {
              // Some other kind of status code (404 maybe?)
              callback(new Error(header));
            }
          }
        }
      }
    }
    
  });
}
