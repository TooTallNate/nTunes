nTunes
======
### A REST (HTTP) API for interacting with iTunes

__nTunes__ (nodeTunes?) is an HTTP-based API for interacting with your
[iTunes][] installation (currently only for Mac OSX), written with [NodeJS][].

In other words, it's the foundation for writing web applications based on
your [iTunes][] library. You could potentially write a website that remotely
controls the volume of the [iTunes][] on your computer.

Installation
------------

If you're lazy, just use the awesome [__npm__](http://github.com/isaacs/npm) of course!

    npm install nTunes

Usage
-----

__nTunes__ itself is a [Connect HTTP Server][connect] subclass, which can
either be run stand-alone or created by your own NodeJS code, with the
capability to add layers (to serve your implementing website perhaps?).


### Stand-alone mode...

If you're only interested in __nTunes__ as-is, then it comes with a convenient
executable file to easily start the HTTP server for you to play with. Once
you've installed via __npm__, simply invoke:

    nTunes

This starts __nTunes__ as a stand-alone HTTP server in development mode. While
the server is running you can interact with your [iTunes][] library through
simple HTTP requests sent to your computer. Here are some examples:

  To get the `name` of the `current track` with a GET request:
  
    curl localhost:8888/current%20track/name
      // Returns "Lateralus"

  To set your iTunes' volume to 50% with through a POST request:
  
    curl -d value=50 localhost:8888/sound%20volume
      // Returns 50

The API mostly returns JSON encoded values, and is mostly intended to be used
with the `XMLHttpRequest` object and `JSON.parse` function in the web browser.


### Adding 'layers' to the `nTunes` module...

For familiarity, creating your own __nTunes__ instance works _exactly_ the
same as creating a [connect][] server, except that __nTunes__' layers get
added after your passed layers, so be _very_ careful not to overwrite part of
the __nTunes__ API! Here's an example of serving an `index.html` file when
it's requested, otherwise falling-through to the __nTunes__ layers:

    var nTunes = require("nTunes");

    nTunes.createServer(function(req, res, next) {
      if (req.url == "/index.html") {
        // Serve your index file...
      } else {
        // Fall-though to the nTunes API
        next();
      }
    }).listen(80);


[iTunes]: http://www.itunes.com
[NodeJS]: http://nodejs.org
[connect]: http://senchalabs.github.com/connect/