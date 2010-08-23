require.paths.unshift(require("path").join(__dirname, "../lib"));
var url = require("url");
var redirector = require("radio-redirecter");
require.paths.shift();

exports.test = function(callback) {

  var radioUrl = url.format({
    protocol: "http:",
    hostname: "pri.kts-af.net",
    pathname: "/redir/index.pls",
    query: {
      "esid": "c4e41af2e0b1a281c171de42f674a31c",
      "url_no": 1,
      "client_id": 7,
      "uid": "68efed4d03ec7e45fd3978262c107180",
      "clicksrc": "xml"
    }
  });

  redirector.getRadioLocation(radioUrl, function(err, location) {
    if (err) throw err;
    console.log("Location: " + location);
  });
}

exports.test();