var getUrl = require("get-http-url").getUrl;

// Unofficial M3U and PLS Specifications
// http://forums.winamp.com/showthread.php?threadid=65772

// Parse the output into the PLS url into a native JS object. PLS files are
// just key=value pairs, with a header [playlist].
exports.parsePls = function(plsUrl, callback) {
  
  getUrl(plsUrl, function(err, body) {

    if (err) return callback(err);
    
    var pls = {}, lines = body.split(/\s+/);
    if (!(/playlist/i.test(lines[0]))) {
      return callback(new Error("Not a valid PLS file (does not begin with [playlist])."));
    }
    lines.slice(1).forEach(function(line) {
      if (line.length > 0) {
        var divider = line.indexOf("=");
        pls[line.substring(0, divider)] = line.substring(divider+1);
      }
    });
    callback(null, pls);    
  });
  
}
