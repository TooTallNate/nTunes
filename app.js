var connect = require("connect");

module.exports = require("./lib/nTunes").createServer(
  connect.logger(),
  connect.staticProvider(__dirname + "/www")
);
