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
    console.log(req.api);
    req.apiIndex = 0;

    // The 'Application' base class is the "starting point" for the API.
    req.currentItem = conn;

    // Kick things off...
    resolve();

    // The 'resolve' function is async-recursively called to chew down the
    // 'req.api' Array. It first gets the next part of the API request, and
    // verifies that the api part exists as a function of 'req.currentItem'
    function resolve () {
      // First check out the type of 'currentItem'. There's a chance that it's
      // an Array, in which case we should grab the next part of the API
      // request and attempt to use it as well
      if (Array.isArray(req.currentItem)) {
        // TODO: Move the Array by Index specifying moved when it can be
        // specifie in the node-iTunes API call.
        var item = req.api[req.apiIndex++];
        if (isNumber(item)) {
          item = Number(item);
          if (item < 0 || item >= req.currentItem.length) return next();
          req.currentItem = req.currentItem[item];
          processSingleItem(req.currentItem, req.api[req.apiIndex++], onNextPart);
        } else {
          processArray(item, onNextPart);
        }
      } else {
        processSingleItem(req.currentItem, req.api[req.apiIndex++], onNextPart);
      }
    }

    // When the currentItem is an Array, then the apiFunction should be
    // called on *all* the entries of the array, and the processing shouldn't
    // continue until that's done.
    function processArray (apiFunction, callback) {
      console.log('processArray:', apiFunction);
      var counter = req.currentItem.length
        , result = []

      // Fast case for when the currentItem has 0 entries in the array
      if (counter === 0) return callback(null, result);

      var args = []

      // Iterate through the item's entries, and call the api function on each
      req.currentItem.forEach(function (item, i) {

        // Check first that the API function exists on the item. next() if not.
        if (!item[apiFunction]) return dontCallNextMoreThanOnce();

        item[apiFunction].apply(item, args.concat([function (err, part) {
          if (err) return dontCallNextMoreThanOnce(err);
          result[i] = part;
          --counter || callback(null, result);
        }]));
      });
    }

    // When currentItem is a regular iTunesItem reference, then get the next
    // part of the api request and process normally.
    function processSingleItem (item, apiFunction, callback) {
      console.log('processSingleItem:', item, apiFunction);
      // TODO: curry in the POST body params when req.api.length === 0
      var args = []

      // If the API request part contains a comma , then it should be split on
      // that and each item be processed individually
      if (~apiFunction.indexOf(',')) {
        var result = []
          , apiProps = apiFunction.split(',')
          , counter = apiProps.length
        apiProps.forEach(function (prop, i) {
          doRequest(item, prop, args, function (err, part) {
            if (err) return dontCallNextMoreThanOnce(err);
            result[i] = part;
            --counter || callback(null, result);
          });
        });
      } else {
        // Othewise, it's a single api request (i.e. name)
        doRequest(item, apiFunction, args, callback);
      }
    }

    function doRequest(item, apiFunction, args, callback) {
      // Check first that the API function exists on the item. next() if not.
      if (!item[apiFunction]) return dontCallNextMoreThanOnce();

      item[apiFunction].apply(item, args.concat([callback]));
    }

    // Gets called as the callback of every 'get___' API function call
    function onNextPart (err, part) {
      //console.log('got Callback!');
      if (err) return next(err);
      if (!part) return next();
      // If this is the last part of the API request, then send the response
      // back to the client.
      if (req.api.length === req.apiIndex) {
        respond(part);
      } else {
      // Otherwise, set this returned item as the 'currentItem' of the request,
      // and continue attempting to resolve the API request.
        req.currentItem = part;
        resolve();
      }
    }

    function respond (body) {
      // TODO: Implement a JSON response when "Accept: application/json" is
      // present
      // Plain-Text mode (for curl, etc.)
      res.send(String(body) + '\n');
    }

  });

  return app;
}


// Returns true if a given String is a Number
function isNumber (n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}
