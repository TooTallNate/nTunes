var fs = require('fs');
var xml2js = require('xml2js');
var nClass = require("./lib/nTunes-class");
var nSpecifier = require("./lib/nTunes-specifier");

var parser = new xml2js.Parser();
parser.on('end', function(result) {
  var iTunesSuite = result.suite[1];

  // Prepare the environment by loading and
  // parsing the iTunes.sdef file.
  //nCommand.processCommands(iTunesSuite.command);
  nClass.processClasses(iTunesSuite['class']);
  nSpecifier.setNClass(nClass);
  parser = null;


  // do some tests
  test("/name,version,mute");
  test("/current track");
  test("/current track/name,artist,album,id");
  test("/current track/artwork/1/id,format,kind,description,downloaded");
  test("/source");
  test("/source/name,kind");
  test("/source/1");
  test("/source/-40");
  test("/source/1/name,kind,id");
  test("/source/1/playlist/name");
  test("/source/1/playlist/2/name");
  test("/source/1/playlist/1/track/1");
  test("/source/1/playlist/1/track/artist=Jimi Hendrix&genre=Pop");
  test("/source/1/playlist/1/track/artist=Jimi Hendrix&genre=Pop/1");
  test("/source/1/playlist/1/track/artist=Jimi Hendrix&genre=Pop/1/name,artist,album,genre,duration");

});
fs.readFile(__dirname + '/lib/iTunes.sdef', function(err, data) { parser.parseString(data); });

function test(specifier) {
  console.error('Input:\n    "' + specifier + '"');
  try {
    specifier = new nSpecifier(specifier);
    var command = specifier.vars + 'get ' + specifier.properties +
      (specifier.properties &&  specifier.finalVar? ' of ' : '') +
      (specifier.finalVar ? specifier.finalVar : '');
    console.error('Output:');
    command.split('\n').forEach(function(line) {
      console.error('    ' + line);
    });
  } catch(e) {
    console.error('Error:');
    console.error(e);
  }
  console.error('\n');
}
