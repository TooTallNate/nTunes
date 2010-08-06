var connect = require("connect");

module.exports = require("./lib/nTunes").createServer(
  connect.logger()
);
