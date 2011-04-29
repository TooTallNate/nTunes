nTunes
======
### A REST (HTTP) API for interacting with iTunes

__nTunes__ is an HTTP-based API for interacting with your [iTunes][]
installation (currently only for Mac OSX), written with [NodeJS][].

In other words, it's the foundation for writing web applications based on
your [iTunes][] library. You could potentially write a website that:
  
  * Remotely controls the volume of the [iTunes][] on your computer.
  * Acts as a remote interface for selecting music to play on your computer.
  * Accesses and plays back your library from the web interface itself (through `<audio>`?).
  * Automatically adds files added from a watched folder into your library.
  * Don't let this _list_ decide for you! Be creative!


Installation
------------

If you're lazy, just use the awesome [__npm__](http://github.com/isaacs/npm) of course!

    npm install -g nTunes

Otherwise feel free to check out this repo and inspect as you will.


Usage
-----

__nTunes__ itself is presented with the familiar `function(req, res, next)`
signature. This means it can be used in your Node code with the standard
Node HTTP server with a one-liner like this:
    
    require("http").createServer(require("nTunes")()).listen(80);

Or it can be used as a _layer_ in [connect][]:

    var connect = require("connect");
    connect.createServer(
      connect.logger(),
      connect.staticProvider(__dirname),
      require("nTunes")()
    ).listen(80);

Combining __nTunes__ with connect is the recommend practice.

### Stand-alone mode...

If you're only interested in seeing the examples __nTunes__ comes packaged with,
then it comes with a convenient executable file to easily start the demonstration
HTTP server for you to play with. Once you've installed via __npm__, simply invoke:

    nTunes

This starts __nTunes__ as a stand-alone HTTP server in demonstration mode. While
the server is running you can experiment with the __nTunes__ API through
simple HTTP requests sent to your computer. Here are some examples:

  To get the `name` of the `current track` with a GET request:
  
    curl localhost:8888/current%20track/name
      // Returns "Lateralus"

  To set your iTunes' volume to 50% with through a POST request:
  
    curl -d value=50 localhost:8888/sound%20volume
      // Returns 50

The API mostly returns JSON encoded values, and is mostly intended to be used
with the `XMLHttpRequest` object and `JSON.parse` function in the web browser,
or `http.Client` in [Node][NodeJS].


[iTunes]: http://www.itunes.com
[NodeJS]: http://nodejs.org
[connect]: http://senchalabs.github.com/connect/
