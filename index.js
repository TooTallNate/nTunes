var url = require('url')
  , iTunes  = require('iTunes')
  , express = require('express')

module.exports = function setup (options) {
  options = options || {};
  var conn = null
    , app  = express.createServer()

  // First order of business is connecting to the iTunes instance.
  if (options.host) {
    iTunes.createConnection(options, onConn);
  } else {
    // connect to the local iTunes installation by default
    iTunes.createConnection(onConn);
  }
  function onConn (err, c) {
    if (err) throw err;
    conn = c;
  }

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

    var nextCalled = false

    function dontCallNextMoreThanOnce(err) {
      if (nextCalled) return;
      nextCalled = true;
      next(err);
    }

    req.parsedUrl = url.parse(req.url);

    // The 'api' is the broken down request URL
    req.api = req.parsedUrl.pathname.split('/').slice(1);
    req.apiIndex = 0;

    // The 'Application' base class is the "starting point" for the API.
    req.currentItem = conn;

    // Kick things off...
    resolveNextItem();

    function resolveNextItem () {
      // First get the next part of the API request. It will be the name of the
      // next item to get.
      var apiFunction = req.api[req.apiIndex++]
        , args = []

      // Fast case for when 'apiFunction' is undefined or an empty String...
      if (!apiFunction) {
        return respond(req.currentItem);
      }

      // Handle the case of the 'length' property on Arrays
      if (/^(length|count)$/.test(apiFunction)) {
        if (Array.isArray(req.currentItem)) {
          return respond(req.currentItem.length);
        } else {
          // If length was reqested on a non-Array, then next()
          return next();
        }
      }

      // If 'apiFunction' contains a comma (,) then the String should be split
      // on that and each value should be the name of a property to get
      if (~apiFunction.indexOf(',')) {
        apiFunction = apiFunction.split(',');
      }

      // Also peek at the next part of the API request. If it's a number or
      // a part of a query-string ("artist=Tool&name=Lateralus") then also grab
      // that as part of the next request (for filtering down an Array)
      if (req.api.length > req.apiIndex) {
        var secItem = req.api[req.apiIndex];
        if (isNumber(secItem)) {
          args.push(Number(secItem));
          req.apiIndex++;
        } else if (~secItem.indexOf('=')) {
          // TODO: Parse the query-string into an Object.
          args.push(secItem);
          req.apiIndex++;
        }
      }

      if (Array.isArray(apiFunction)) {
        var counter = apiFunction.length
          , results = []
        apiFunction.forEach(function (funcName, i) {
          doRequest(req.currentItem, funcName, args, function (err, part) {
            if (err) return dontCallNextMoreThanOnce(err);
            results[i] = part;
            --counter || onNextItem(null, results);
          });
        });
      } else {
        doRequest(req.currentItem, apiFunction, args, onNextItem);
      }
    }

    function doRequest (item, apiFunction, args, callback) {
      // 'item' may be an Array, or a regular iTunesItem instance
      if (Array.isArray(item)) {
        var counter = item.length
          , results = []
        item.forEach(function (item, i) {
          doRequestSingleItem(item, apiFunction, args, function (err, part) {
            if (err) return dontCallNextMoreThanOnce(err);
            if (!part) return dontCallNextMoreThanOnce();
            results[i] = part;
            --counter || callback(null, results);
          });
        });
      } else {
        doRequestSingleItem(item, apiFunction, args, callback);
      }
    }

    function doRequestSingleItem (item, apiFunction, args, callback) {
      // Check first that the API function exists on the item. next() if not.
      if (!item[apiFunction]) return dontCallNextMoreThanOnce();

      item[apiFunction].apply(item, args.concat([callback]));
    }

    function onNextItem (err, part) {
      if (err) return dontCallNextMoreThanOnce(err);
      if (!part) return dontCallNextMoreThanOnce();
      // If this is the last part of the API request, then send the response
      // back to the client.
      if (req.api.length === req.apiIndex) {
        respond(part);
      } else {
      // Otherwise, set this returned item as the 'currentItem' of the request,
      // and continue attempting to resolve the API request.
        req.currentItem = part;
        resolveNextItem();
      }
    }

    function respond (body) {
      // TODO: Implement a JSON response when "Accept: application/json" is
      // present
      // Plain-Text mode (for curl, etc.)
      res.header('Content-Type', 'text/plain');
      res.send(String(body) + '\n');
    }

  });

  return app;
}


// Returns true if a given String is a Number
function isNumber (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
