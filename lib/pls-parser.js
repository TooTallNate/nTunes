var url = require("url");
var http = require("http");

exports.parsePls = function(plsUrl, callback) {
  
  var parsedUrl = url.parse(plsUrl);
  //console.log(parsedUrl);
  var conn = http.createClient(parsedUrl.port || (parsedUrl.protocol == "http:" ? 80 : 443), parsedUrl.hostname);
  var request = conn.request('GET', parsedUrl.pathname + (parsedUrl.search ? parsedUrl.search : ""), {
    'Host': parsedUrl.host,
    'Connection': 'close'
  });

  request.on('error', function(error) {
    callback(error);
  })

  request.on('response', function (response) {

    if (response.statusCode == 302) {
      
      exports.parsePls(response.headers['location'], callback);
      
    } else {

      // Build up the output
      var body = "";
      response.setEncoding('utf8');

      response.on('data', function (chunk) {
        body += chunk;
      });

      // When the response is complete, parse the output into a native JS
      // object. PLS files are just key=value pairs, with a header [playlist].
      response.on('end', function () {
        var pls = {};
        if (body.indexOf("[playlist]") !== 0) {
          return callback(new Error("Not a valid PLS file (does not begin with [playlist])."));
        }
        body.split(/\s+/).slice(1).forEach(function(line) {
          if (line.length > 0) {
            var divider = line.indexOf("=");
            pls[line.substring(0, divider)] = line.substring(divider+1);
          }
        });
        callback(null, pls);
      });

    }
  });
  request.end();
}
