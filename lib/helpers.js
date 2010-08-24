var fs = require("fs");

// Accepts an Array, returns a new Array that contains only
// the unique items of the input Array.
// http://www.shamasis.net/2009/09/fast-algorithm-to-find-unique-items-in-javascript-array/
function arrayUniq(array) {
  var o = {}, i, l = array.length, r = [];
  for(i=0; i<l;i++) o[array[i]] = array[i];
  for(i in o) r.push(o[i]);
  return r;
}

// Serve a standard static file to an HTTP client.
// Respectfully borrowed and modified from:
//   http://github.com/biggie/biggie-router/blob/f31711ae7d8c3a10b0ff658d1ec5b3d02225b575/lib/biggie-router/modules/static.js
function serveStaticFile(request, response, filename) {

  fs.stat(filename, function (error, stat) {

    if (error) {
      //return next();
      console.error(error);
    }

    // Check for the 304 Not Modified case
    // Disable for now, since this trips up the dynamicism of the API. For example,
    // the browser will cache the media file at "/selection/1", even though the current
    // selection can change immediately after, and the browser cache will serve the wrong file.
    /*
    if (request.headers['if-modified-since']) {
      var if_modified_since = new Date(request.headers['if-modified-since']);
      if (stat.mtime.getTime() <= if_modified_since.getTime()) {
        response.writeHead(304, {
          'Expires': new Date(Date.now() + 31536000000).toUTCString(),
          'Cache-Control': 'public max-age=' + 31536000
        });
        return response.end();
      }
    }*/
    
    
    // Prepare for streaming file to client
    var responseCode = 200;
    var responseHeaders = {
      'Content-Type': mime(filename.indexOf(".") != -1 ? filename.substring(filename.lastIndexOf(".")+1) : filename),
      'Content-Length': stat.size,
      'Last-Modified': stat.mtime.toUTCString(),
      'Expires': new Date(Date.now() + 31536000000).toUTCString(),
      'Cache-Control': 'public max-age=' + 31536000
    };
    var readOpts = {};
    
    // If the client requested a "Range", then prepare the headers
    // and set the read stream options to read the specified range.
    if (request.headers['range']) {
      var range = request.headers['range'].substring(6).split('-');
      //console.log(range);
      readOpts.start = Number(range[0]);
      readOpts.end = Number(range[1]);
      if (range[1].length === 0) {
        readOpts.end = stat.size - 1;
      } else if (range[0].length === 0) {
        readOpts.end = stat.size - 1;
        readOpts.start = readOpts.end - range[1] + 1;
      }
      var contentLength = readOpts.end - readOpts.start + 1;
      responseCode = 206;
      responseHeaders['Accept-Ranges'] = "bytes";
      responseHeaders['Content-Length'] = contentLength;
      responseHeaders['Content-Range'] = "bytes " + readOpts.start + "-" + readOpts.end + "/" + stat.size;
    }

    // Stream the file
    response.writeHead(responseCode, responseHeaders);

    var file_stream = fs.createReadStream(filename, readOpts);
    file_stream.addListener('error', function (error) {
      //next(error);
      console.error(error);
      response.end();
    });
    pump(file_stream, response, function () {
      response.end();
    });
  });
  
}


// Accepts a file extension, returns the mime-type.
function mime(type) {
  return mime[type] || mime['buffer'];
}
mime.buffer = 'application/octet-stream';
mime.json = 'application/json';
mime.xml = 'text/xml';
mime.mp3 = 'audio/mpeg';
mime.ogg = 'application/ogg';


// This pump doesn't fully pump file, so you can end the writable whenever
function pump(readable, writable, cb) {
  readable.on('data', function (data) {
    if (!writable.write(data)) readable.pause();
  });
  readable.on('end', function () {
    if (cb) cb();
  });
  writable.on('drain', function () {
    readable.resume();
  });
};


// Export everything as a messy module...
module.exports = {
  arrayUniq: arrayUniq,
  mime: mime,
  pump: pump,
  serveStaticFile: serveStaticFile
}
