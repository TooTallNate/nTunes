/**
 * This script file launched the "nTunes" Test Suite.
 *  
 * It runs every "test-*.js" file in this "tests" folder to run specific
 * tests. Results are collected and printed at the end.
 */

require("colors");
const fs = require("fs");
const path = require("path");

const suite = path.basename(__filename);
const testScripts = fs.readdirSync(__dirname).filter(function(file) {
  return file != suite;
});

// Kick things off...
doTestScript(testScripts.shift());

// 'require's the test script, calls the exported 'test' function that should
// be present in every one, and waits for the completion callback to be
// invoked. 
function doTestScript(script) {
  console.log('    Beginning test:'.green + (' "'+script+'"').green.bold);
  try {
    require(__dirname+"/"+script).test(function(results) {
      // TODO: do something with the results
      
      // start the next test
      var next = testScripts.shift();
      if (next) {
        doTestScript(next);
      }
    });
  } catch(e) {
    console.log(e);
  }
}
