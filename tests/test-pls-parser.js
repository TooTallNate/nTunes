require.paths.unshift(require("path").join(__dirname, "../lib"));
var plsParser = require("pls-parser");
require.paths.shift();

exports.test = function() {
  //var testUrl = "http://provisioning.streamtheworld.com/pls/KFRCFM.pls";
  //var testUrl = "http://www.mouse-mouse.co.uk/streamer/castcontrol/playlist.php?id=374&type=pls";
  var testUrl = "http://208.85.240.2:8134/listen.pls";
  
  plsParser.parsePls(testUrl, function(err, playlist) {
    if (err) throw err;
    console.log(playlist);
  });
}

exports.test();
