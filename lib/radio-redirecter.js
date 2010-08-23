var net = require("net");
var url = require("url");

// Pass in the result of a "URL track" 'address' to resolve the iTunesified
// URL to the actual location of the playlist file on the internet.
// The result of this should used with the 'pls-parser' helper to retrieve
// the final list of URLs appropriate for the radio stream.
function getRadioLocation(path, callback) {

  var parsedPath = url.parse(path);
  
  //console.log(parsedPath);
  
  var conn = net.createConnection(80, parsedPath.hostname);
  conn.setEncoding("utf8");
  conn.on("connect", function() {
    // Once connected, send a minimal HTTP response to the redirecter service.
    conn.write(
      "GET " + parsedPath.pathname + parsedPath.search + " HTTP/1.1\r\n"+
      "Host: " + parsedPath.host + "\r\n"+
      "Connection: close\r\n"+
      "\r\n"
    );
  });
  
  // Build up the HTTP response (should only be a header).
  var response = "";
  conn.on("data", function(chunk) {
    response += chunk;
  });
  
  // Once finished, parse the output and extract the "Location" header.
  conn.on("end", function() {
    var statusCode = Number(response.substring(9,12));
    if (statusCode != 302) {
      return callback(new Error("Expecting 302 response status code. Got: " + statusCode));
    }
    var done = false;
    response.split("\r\n").forEach(function(line) {
      if (line.indexOf("Location:") === 0) {
        var location = line.substring(line.indexOf(":")+1).trim();
        callback(null, location);
        done = true;
      }
    });
    if (!done) {
      callback(new Error('Could not find expected "Location" header'));
    }
    //console.log("Remote closed connection");
  });
}

exports.getRadioLocation = getRadioLocation;
