const fs = require("fs");
const timeEpoch = new Date(0); // Thu, 01 Jan 1970 00:00:00 GMT

// Accepts an Array, returns a new Array that contains only
// the unique items of the input Array.
// http://www.shamasis.net/2009/09/fast-algorithm-to-find-unique-items-in-javascript-array/
function arrayUniq(array) {
  var o = {}, i, l = array.length, r = [];
  for(i=0; i<l;i++) o[array[i]] = array[i];
  for(i in o) r.push(o[i]);
  return r;
}

// Accepts an Array, and returns an Array with only the deepest Arrays (that
// is, Arrays containing Strings, not other Arrays) uniquified.
function arrayUniqDeep(array) {
  if (Array.isArray(array[0])) {
    array.forEach(function(item, i) {
      array[i] = arrayUniqDeep(item);
    });
    return array;
  } else {
    return arrayUniq(array);
  }
}

// Serve a standard static file to an HTTP client.
// Respectfully borrowed and modified from:
//   http://github.com/biggie/biggie-router/blob/f31711ae7d8c3a10b0ff658d1ec5b3d02225b575/lib/biggie-router/modules/static.js
function serveStaticFile(request, response, filename) {

  fs.stat(filename, function (error, stat) {

    if (error || !stat.isFile()) {
      console.error(error.stack);
      return;
    }
    
    // Prepare for streaming file to client
    var responseCode = 200;
    var responseHeaders = {
      'Content-Type': mime(filename.indexOf(".") != -1 ? filename.substring(filename.lastIndexOf(".")+1) : filename),
      'Content-Length': stat.size,
      'Last-Modified': stat.mtime.toUTCString(),
      'Expires': timeEpoch.toUTCString(),
      'Cache-Control': 'no-cache'
    };
    var readOpts = {};
    
    // If the client requested a "Range", then prepare the headers
    // and set the read stream options to read the specified range.
    // Range is implemented for HTML5 <audio> and <video>. See note here:
    //    http://stackoverflow.com/questions/1995589/html5-audio-safari-live-broadcast-vs-not
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
mime.mp3 = 'audio/mpeg; codecs="Layer 3"';
mime.mp4 = 'application/mp4';
mime.m4p = 'application/mp4';
mime.m4a = 'audio/mp4';
mime.m4v = 'video/mp4';
mime.ogg = 'application/ogg';


// A stripped down "pump" function that only pumps the readable
// into the writable, but doesn't call .end() on the writable at
// the end. This allows to pump more streams, or whatever before closing.
function pump(readable, writable, cb) {
  readable.on('data', function (data) {
    if (!writable.write(data)) {
      readable.pause();
    }
  });
  writable.on('drain', function () {
    readable.resume();
  });
  if (cb) {
    readable.on('end', function () {
      cb();
    });
  }
};


// Export everything as a messy module...
module.exports = {
  arrayUniq: arrayUniq,
  arrayUniqDeep: arrayUniqDeep,
  mime: mime,
  pump: pump,
  serveStaticFile: serveStaticFile
}
