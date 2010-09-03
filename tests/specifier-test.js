var join = require("path").join;
require.paths.unshift(join(__dirname, "../lib"));
var fs = require('fs');
var sys = require('sys');
var colors = require('colors');
var xml2js = require('xml2js');
var nClass = require("nTunes-class");
var applescript = require("applescript");
var nSpecifier = require("nTunes-specifier");
require.paths.shift();

var parser = new xml2js.Parser();
parser.on('end', function(result) {
  var iTunesSuite = result.suite[1];

  // Prepare the environment by loading and parsing the iTunes.sdef file.
  //nCommand.processCommands(iTunesSuite.command);
  nClass.processClasses(iTunesSuite['class']);
  nSpecifier.setNClass(nClass);
  parser = null;

});
fs.readFile(join(__dirname, '../lib/iTunes.sdef'), function(err, data) { parser.parseString(data); });

// Accepts an array of "specifiers" to test. First tries to parse the String
// into an nSpecifier instance, then executes the nSpecifier's AppleScript
// code and print out the result. As long as 'osascript' returns a 0 exit
// code, then the specifier passes overall.
var numPass = 0;
var numFail = 0;
function test() {
  if (parser) {
    var args = arguments;
    return parser.on("end", function() {
      process.nextTick(function() {
        test.apply(null, args);  
      });
    });
  }
  
  var tests = Array.prototype.slice.call(arguments);
  var specifier = tests.shift();
  
  console.error('Input:'.blue.bold.italic.underline);
  console.error('    ' + specifier.blue);
  try {
    specifier = new nSpecifier(specifier);
    var command = specifier.vars + 'get ' + specifier.finalVar;
    
    console.error('Output:'.cyan.bold);
    command.split('\n').forEach(function(line) {
      console.error('    ' + line.cyan);
    });
    
    applescript.execString('tell application "iTunes"\n' + command + '\nend tell', function(err, out) {
      if (err) {
        console.error('Result:'.red.bold);
        console.error(('    Exit Code: ' + err.exitCode).red.italic);
        err.message.split('\n').forEach(function(line) {
          if (line.length>0)
            console.error('    ' + line.red);
        });        
        console.error('Fail...'.red.bold.italic.underline);
        numFail++;
      } else {
        console.error('Result:'.green.bold);
        sys.inspect(out).split('\n').forEach(function(line) {
          if (line.length>0)
          console.error('    ' + line.green);
        });
        console.error('PASS!'.green.bold.italic.underline);
        numPass++;
      }
      console.error('\n');
      if (tests.length > 0) {
        test.apply(null, tests);
      } else {
        if (done) {
          done({
            pass: numPass,
            fail: numFail
          });
        }
      }
    });
  } catch(e) {
    console.error('Error:'.red.bold);
    sys.inspect(e).split('\n').forEach(function(obj) {
      console.error('    ' + obj);
    });
    console.error('Fail...'.red.bold.italic.underline);
    numFail++;
  }
}

//function done() {
//  console.error("Completed ".magenta + String(numPass+numFail).magenta.bold.underline + " specifier tests:".magenta);
//  console.error("    " + String(numPass).green.bold + " passed!".green);
//  console.error("    " + String(numFail).red.bold + " failed...".red);
//}

exports.test = function(callback) {
  //return callback(); //Skip
  
  done = callback;
  // do some tests
  test(
    "/name,version,mute",
    "/current track",
    "/current track/name,artist,album,id",
    "/current track/artwork/1/id,format,kind,description,downloaded",
    "/source",
    "/source/1",
    "/source/-40",
    "/source/name,kind",
    "/source/1/name,kind,id",
    "/source/1/playlist/name",
    "/source/1/playlist/2/name",
    "/source/1/playlist/1/track/1",
    "/source/1/playlist/1/track/artist",
    "/source/1/playlist/1/track/artist=Jimi Hendrix&genre=Rock",
    "/source/1/playlist/1/track/artist=Jimi Hendrix&genre=Rock/1",
    "/source/1/playlist/1/track/artist=Jimi Hendrix&genre=Rock/1/name,artist,album,genre,duration",
    "/selection",
    "/selection/album,name,artist,location"
  );
}
