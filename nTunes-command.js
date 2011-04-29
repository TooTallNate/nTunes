var sys = require("sys");

// Represents one iTunes AppleScript "command".
function nCommand(command) {
  this.name = command["@"].name;
  this.description = command["@"].description;
  this.parameters = [];
  
  // There can only be one "direct-parameter".
  if (command['direct-parameter']) {
    this.parameters.push(
      nCommand.createParamObject(command['direct-parameter'])
    );
  }
  
  if (command.parameter) {
    if (Array.isArray(command.parameter)) {
      command.parameter.forEach(function(parameter) {
        this.parameters.push(
          nCommand.createParamObject(parameter)
        );
      }, this);
    } else {
      this.parameters.push(
        nCommand.createParamObject(command.parameter)
      );
    }
  }
  
  // There can only be one return value for the command.
  if (command.result) {
    this.result = {
      type: command.result['@'].type,
      description: command.result['@'].description
    };
  }
}

var commands = {};
nCommand.processCommands = function(list) {
  for (var i=0, l=list.length; i<l; i++) {
    var c = new nCommand(list[i]);
    commands[c.name] = c;
  }
  nCommand.REGEXP = new RegExp(Object.keys(commands).join("|"));
}

nCommand.getCommand = function(command) {
  return commands[command];
}

nCommand.createParamObject = function(parameter) {
  return {
    name: parameter['@'].name || "value",
    type: parameter['@'].type || parameter.type['@'].type,
    list: parameter.type ? parameter.type['@'].list == "yes": false,
    optional: parameter['@'].optional == "yes", 
    description: parameter['@'].description
  };
}

module.exports = nCommand;
