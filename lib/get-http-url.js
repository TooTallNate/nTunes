const parse = require("url").parse;
const http = require("http");

// High level function that accepts an http: url, and GETs the response and
// returns in in 'callback'. Callback has the usual (err, body) signature.
exports.getUrl = function(url, callback) {
  
  var parsedUrl = parse(url);
  var conn = http.createClient(parsedUrl.port || (parsedUrl.protocol == "http:" ? 80 : 443), parsedUrl.hostname);
  var request = conn.request('GET', parsedUrl.pathname + (parsedUrl.search ? parsedUrl.search : ""), {
    'Host': parsedUrl.host,
    'Connection': 'close'
  });

  request.on('error', function(error) {
    callback(error);
  });

  request.on('response', function(response) {
    // Build up the output, this could probably be faster with Buffers.
    var body = "";
    response.setEncoding('utf8');
    response.on('data', function(chunk) { body += chunk; });

    // When the response is done, invoke 'callback' with the response body.
    response.on('end', function() {
      callback(null, body);
    });
  });
  
  // No request body necessary
  request.end();
}
