require.paths.unshift(require("path").join(__dirname, "../lib"));
var playlistParser = require("radio-playlist-parser");
require.paths.shift();

exports.test = function(done) {
  
  var testUrls = [
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
    "http://pri.kts-af.net/redir/index.pls?esid=c4e41af2e0b1a281c171de42f674a31c&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml",
    // FeelingFloyd - Returns a link to an M3U playlist containing a raw Stream.
    // Raw Stream HTTP Headers. Works with Safari and iPhone:
    //   HTTP/1.0 200 OK
    //   Content-Type: audio/mpeg
    //   icy-br:128
    //   ice-audio-info: bitrate=128;samplerate=44100;channels=2
    //   icy-br:128
    //   icy-description:LA radio Number 1 sur Le Rock !!   Pink floyd et les autres groupes Rock .  Music Soft Zen Peace Sexy
    //   icy-genre:pink-floyd
    //   icy-name:FeelingFloyd
    //   icy-pub:1
    //   icy-url:http://www.radionomy.com
    //   Server: Icecast 2.3.2
    //   Cache-Control: no-cache
    "http://pri.kts-af.net/redir/index.pls?esid=2b411edcf75b37da521c104a208212ce&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml",
    // 4 Ever Floyd - Returns a link directly to an ICY stream.
    "http://pri.kts-af.net/redir/index.pls?esid=0fd603b4a384b0a60521f7e131a4fd69&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml",
    // Cringe Humor Radio - Returns a link to a PLS playlist containing an ICY stream.
    "http://pri.kts-af.net/redir/index.pls?esid=164f28ee02eeb73851bf9240adc92183&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml",
    // 4U Classic Rock - Returns a link to an (extended) M3U playlist containing an ICY stream.
    "http://pri.kts-af.net/redir/index.pls?esid=105253c25beb2298740b3243c251bdf8&url_no=1&client_id=7&uid=68efed4d03ec7e45fd3978262c107180&clicksrc=xml"
  ];
  
  function doTest(url) {
    playlistParser.getPlaylist(url, function(err, playlist) {
      if (err) throw err;
      console.log("\ngetPlaylist returned:");
      console.log(playlist);
      console.log("\n");
      
      var next = testUrls.shift();
      if (next) {
        doTest(next);
      } else {
        done();
      }
    });
  }
  doTest(testUrls.shift());
}
