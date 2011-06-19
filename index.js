var url = require('url')
  , iTunes  = require('iTunes')
  , express = require('express')
  , methodMap = {
      'get' : 'get'
    , 'post': 'set'
    , 'put' : 'set'
  }

module.exports = function setup (options) {
  var conn = null
    , app  = express.createServer()

  // First order of business is connecting to the iTunes instance.
  // TODO: Read 'host', 'username', and 'password' from the options for remote
  //       iTunes connection capabilities!
  iTunes.createConnection(function (err, c) {
    if (err) throw err;
    conn = c;
  });

  // Simple middleware that returns a 500 HTTP error while the connection to
  // the iTunes instance is still being negotiated.
  app.use(function (req, res, next) {
    if (conn) return next();
    next(new Error('The iTunes instance hasn\'t been connected to yet'));
  });

  // Set up the main handler. We can't utilize express' routing, as the nTunes
  // API is too dynamic, it would be impossible to set up the necessary routes.
  // Instead, we parse the url manually and ensure that the properites exist,
  // using the 'returnValue' properties of each getter and setter function, and
  // 'instanceof'.
  app.use(function (req, res, next) {
    req.parsedUrl = url.parse(req.url);

    req.api = req.parsedUrl.pathname.split('/').slice(1);

    // The 'Application' base class is the "starting point" for the API.
    req.currentItem = conn;

    // Kick things off...
    resolve();

    // The 'resolve' function is async-recursively called to chew down the
    // 'req.api' Array. It first gets the next part of the API request, and
    // verifies that the api part exists as a function of 'req.currentItem'
    //   So for example:
    //      GET  /volume   ->  Application#getVolume()
    //      POST /volume   ->  Application#setVolume()
    function resolve () {
      var part = req.api.shift()
        , method = req.api.length <= 0 ? req.method.toLowerCase() : 'get'
        , apiFunction = methodMap[method] + capitalize(part)
        , good = !!req.currentItem[apiFunction]
      //console.log(apiFunction, good);

      // If the current part of the API request isn't a function on
      // 'req.currentItem', then we can just call next().
      if (!good) return next();

      var args = [onNextPart];
      req.currentItem[apiFunction].apply(req.currentItem, args);
    }

    // Gets called as the callback of every 'get___' API function call
    function onNextPart (err, part) {
      //console.log('got Callback!');
      if (err) return next(err);
      if (!part) return next();
      // If this is the last part of the API request, then send the response
      // back to the client.
      if (req.api.length <= 0) {
        respond(part);
      } else {
      // Otherwise, set this returned item as the 'currentItem' of the request,
      // and continue attempting to resolve the API request.
        req.currentItem = part;
        resolve();
      }
    }

    function respond (body) {
      res.send(body);
    }

  });

  return app;
}


// Make the first letter of a String be capitalized.
function capitalize(str) {
  return (str[0]||'').toUpperCase() + str.slice(1);
}
