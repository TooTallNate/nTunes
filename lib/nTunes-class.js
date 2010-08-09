var sys = require("sys");

// Represents one iTunes AppleScript "class".
function nClass(clazz) {
  this.name = clazz['@'].name;
  this.description = clazz['@'].description;
  this.inherits = clazz['@'].inherits;
  this.contains = [];
  this.properties = [];
  
  if (clazz.element) {
    if (Array.isArray(clazz.element)) {
      clazz.element.forEach(function(element) {
        this.contains.push(element['@'].type);
      }, this);
    } else {
      this.contains.push(clazz.element['@'].type);
    }
  }

  if (clazz.property) {
    if (Array.isArray(clazz.property)) {
      clazz.property.forEach(function(property) {
        this.properties.push(createPropObj(property));
      }, this);
    } else {
      this.properties.push(createPropObj(clazz.property));
    }
  }
}

nClass.prototype.hasElement = function(element) {
  return this.contains.indexOf(element) >= 0;
}

nClass.prototype.hasProperty = function(prop) {
  return this.properties.indexOf(prop) >= 0;
}

function createPropObj(prop) {
  return {
    name: prop['@'].name,
    type: prop['@'].type,
    description: prop['@'].description
  };
}

module.exports = nClass;
