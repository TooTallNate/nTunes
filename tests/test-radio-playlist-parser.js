require.paths.unshift(require("path").join(__dirname, "../lib"));
var playlistParser = require("radio-playlist-parser");
require.paths.shift();

exports.test = function() {
  // URL to a PLS playlist file
  //var testUrl = "http://provisioning.streamtheworld.com/pls/KFRCFM.pls";
  
  // URL to a redirect to a PLS playlist file
  var testUrl = "http://www.mouse-mouse.co.uk/streamer/castcontrol/playlist.php?id=374&type=pls";

  // URL to an ICY stream
  //var testUrl = "http://67.205.85.183:7714";
  
  playlistParser.getPlaylist(testUrl, function(err, playlist) {
    if (err) throw err;
    console.log(playlist);
  });
}

exports.test();
