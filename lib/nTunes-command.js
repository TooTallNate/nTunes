var sys = require("sys");

// Represents one iTunes AppleScript "command".
function nCommand(command) {
  this.name = command["@"].name;
  this.description = command["@"].description;
  this.parameters = [];
  
  if (command['direct-parameter']) {
    this.parameters.push(
      createParamObject(command['direct-parameter'])
    );
  }
  
  if (command.parameter) {
    if (Array.isArray(command.parameter)) {
      command.parameter.forEach(function(parameter) {
        this.parameters.push(
          createParamObject(parameter)
        );
      }, this);
    } else {
      this.parameters.push(
        createParamObject(command.parameter)
      );
    }
  }
    
  if (command.result) {
    this.result = {
      type: command.result['@'].type,
      description: command.result['@'].description
    };
  }
}

function createParamObject(parameter) {
  return {
    name: parameter['@'].name || "value",
    type: parameter['@'].type || parameter.type['@'].type,
    list: parameter.type ? parameter.type['@'].list == "yes": false,
    optional: parameter['@'].optional == "yes", 
    description: parameter['@'].description
  };
}

module.exports = nCommand;
