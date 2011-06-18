var iTunes = require('iTunes')
  , express = require('express')

module.exports = function setup (options) {
  var conn;
  iTunes.createConnection(function (err, c) {
    if (err) throw err;
    conn = c;
  });
  var app = express.createServer();
  
  app.configure(function () {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
  });

  // Simple middleware that returns a 503 HTTP error when the connection to the
  // iTunes instance is still being negotiated.
  app.use(function (req, res, next) {
    if (conn) return next();
    next(new Error('The iTunes instance hasn\'t been connected to yet'));
  });

  app.get('/currentTrack/^', function (req, res, next) {
    var track = conn.getCurrentTrackSync();
    console.log('hit route!');
  });

  return app;
}
