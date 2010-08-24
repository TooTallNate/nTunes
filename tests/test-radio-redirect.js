require.paths.unshift(require("path").join(__dirname, "../lib"));
var url = require("url");
var redirector = require("radio-redirecter");
require.paths.shift();

exports.test = function(callback) {

  // 4 Ever Floyd - Returns a link directly to an ICY server.
  var radioUrl = "http://pri.kts-af.net/redir/index.pls?esid=0fd603b4a384b0a60521f7e131a4fd69&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml";

  // 106.9 KFRC Classic Hits - Returns a link to a PLS playlist containing a raw strem.
  // Raw Stream HTTP Headers. Works with HTML5 Audio on Chrome and Safari (not iPhone?):
  //   HTTP/1.0 200 OK
  //   Expires: Thu, 01 Dec 2003 16:00:00 GMT
  //   Cache-Control: no-cache, must-revalidate
  //   Pragma: no-cache
  //   Content-Type: audio/mpeg
  //   icy-br: 67
  //   icy-genre: Misc
  //   icy-name: KFRC.com Classic Hits
  //   Server: MediaGateway 2.3.1-r01
  var radioUrl = "http://pri.kts-af.net/redir/index.pls?esid=c4e41af2e0b1a281c171de42f674a31c&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml";

  // Cringe Humor Radio - Returns a link to a PLS playlist containing an ICY stream.
  var radioUrl = "http://pri.kts-af.net/redir/index.pls?esid=164f28ee02eeb73851bf9240adc92183&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml";

  // 4U Classic Rock - Returns a link to an M3U playlist containing an ICY stream.
  var radioUrl = "http://pri.kts-af.net/redir/index.pls?esid=105253c25beb2298740b3243c251bdf8&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml";

  redirector.getRadioLocation(radioUrl, function(err, location) {
    if (err) throw err;
    console.log("Location: " + location);
  });
}

exports.test();
