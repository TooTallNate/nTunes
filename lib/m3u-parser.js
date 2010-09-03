var getUrl = require("get-http-url").getUrl;

// Unofficial M3U and PLS Specifications
// http://forums.winamp.com/showthread.php?threadid=65772

// Gets a remote M3U playlist from an HTTP url, parses the result into an Array
// of links (presumably to internet streams) and return to 'callback'.
exports.parseM3u = function(m3uUrl, callback) {

  getUrl(m3uUrl, function(err, body) {

    if (err) return callback(err);

    var rtn = [];
    body.split("\n").forEach(function(line) {
      line = line.trim();
      if (line.length > 0 && line[0] != "#") {
        rtn.push(line);
      }
    });
    callback(null, rtn);
    
  });

}
