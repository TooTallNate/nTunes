nTunes
======
A REST (HTTP) API for interacting with iTunes
---------------------------------------------

__nTunes__ (nodeTunes?) is an HTTP-based API for interacting with a live
[iTunes][] instance (currently only for Mac OSX), written with [NodeJS][].

In other words, it's the foundation for writing web applications based on
your [iTunes][] library. You could potentially write a website that remotely
controls the volume of the [iTunes][] on your computer.

Usage
-----

__nTunes__ itself is a [Connect HTTP Server][connect] subclass, which can
either be run stand-alone or created by your own NodeJS code, with the
capability to add layers (to serve your implementing website perhaps?).


### Stand-alone mode...

To play around, you can run it stand-alone. Make sure you have
[`connect`](http://github.com/senchalabs/connect) and
[`spark`](http://github.com/senchalabs/spark) from
[__npm__](http://github.com/isaacs/npm), and are running [NodeJS][] on OS X,
then from the __nTunes__ root directory (where this README is) invoke:

    spark

This starts __nTunes__ as a stand-alone HTTP server in development mode. While
the server is running you can interact with your [iTunes][] library through
simple HTTP requests sent to your computer. Here are some examples:

  To get the name of the currently play track with a GET request:
  
    curl localhost:3000/currentTrack/name
      // Returns "Lateralus"

  To set your iTunes' volume to 50% with through a POST request:
  
    curl -d 50 localhost:3000/volume
      // Returns 50

The API mostly returns JSON encoded values, and is mostly intended to be used
with the `XMLHttpRequest` object and `JSON.parse` function in the web browser.


### Adding 'layers' to the `nTunes` module...

For familiarity, creating your own __nTunes__ instance works _exactly_ the
same as creating a [connect][] server, except that __nTunes__' layers get
added after your passed layers, so be _very_ careful not to overwrite part of
the __nTunes__ API! Here's an example of serving an `index.html` file when
it's requested, otherwise falling-through to __nTunes__' layers:

    var nTunes = require("nTunes");

    nTunes.createServer(function(req, req, next) {
      if (req.url == "/index.html") {
        // Serve your index file...
      } else {
        // Fall-though to nTunes' API
        next();
      }
    }).listen(80);


[iTunes]: http://www.itunes.com
[NodeJS]: http://nodejs.org
[connect]: http://senchalabs.github.com/connect/