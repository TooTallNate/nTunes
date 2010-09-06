
// Represents one iTunes AppleScript "class".
function nClass(clazz) {
  this.name = clazz['@'].name;
  this.description = clazz['@'].description;
  this.inherits = clazz['@'].inherits;
  this.plural = clazz['@'].plural;
  this.contains = [];
  this.properties = [];
  this.subclasses = [];
  this.handlers = [];
  
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
        this.properties.push(nClass.createPropObj(property));
      }, this);
    } else {
      this.properties.push(nClass.createPropObj(clazz.property));
    }
  }
}

// Adds a custom handler for the class instance. That is,
// when a custom handler is attached, any time an instance
// of 'class' has a proprty 'handle' requested, then
// 'callback' will be invoked with the 'req', 'res', and 'next'
// instances to handle the request.
nClass.prototype.addHandler = function(handle, callback) {
  this.handlers.push({
    handle: handle,
    callback: callback
  });
}

nClass.prototype.getHandler = function(handle) {
  for (var i=0, l=this.handlers.length; i<l; i++) {
    if (this.handlers[i].handle == handle) return this.handlers[i];
  }
  var parent = this.parent;
  while (parent) {
    for (var i=0, l=parent.handlers.length; i<l; i++) {
      if (parent.handlers[i].handle == handle) return parent.handlers[i];
    }
    parent = parent.parent;
  }
}

nClass.prototype.hasElement = function(element) {
  if (this.contains.indexOf(element) >= 0) return true;
  var parent = this.parent;
  while (parent) {
    if (parent.contains.indexOf(element) >= 0) return true;
    parent = parent.parent;
  }
}

nClass.prototype.hasDirectProperty = function(prop) {
  for (var i=0, l=this.properties.length; i<l; i++) {
    if (this.properties[i].name == prop) return true;
  }
  return false;
}

nClass.prototype.hasProperty = function(prop) {
  for (var i=0, l=this.properties.length; i<l; i++) {
    if (this.properties[i].name == prop) return true;
  }
  var parent = this.parent;
  while (parent) {
    if (parent.hasDirectProperty(prop)) {
      return true;
    } else {
      parent = parent.parent;
    }
  }
  for (var i=0, l=this.subclasses.length; i<l; i++) {
    if (this.subclasses[i].hasDirectProperty(prop)) return true;
  }
  return false;
}

nClass.prototype.getProperty = function(prop) {
  for (var i=0, l=this.properties.length; i<l; i++) {
    if (this.properties[i].name == prop) return this.properties[i];
  }
  var parent = this.parent;
  while (parent) {
    if (parent.hasDirectProperty(prop)) {
      return parent.getProperty(prop);
    } else {
      parent = parent.parent;
    }
  }
}


nClass.prototype.getAllPropertyNames = function(prop) {
  var obj = this, rtn = [];
  while (obj) {
    for (var i=0; i<obj.properties.length; i++) {
      rtn.push(obj.properties[i].name);
    }
    obj = obj.parent;
  }
}

nClass.processClasses = function(list) {

  // Create 'nClass' instances from the XML file.
  for (var i=0, l=list.length; i<l; i++) {
    var c = new nClass(list[i]);
    nClass[c.name] = c;
  }
  
  // Now that all the instances are created, setup
  // the 'parent' and 'subclasses' properties.
  for (var i in nClass) {
    var c = nClass[i];
    if (c.inherits) {
      var parent = nClass[c.inherits];
      c.parent = parent;
      parent.subclasses.push(c);
    }
  }
  
  // The 'count' property returns the total count
  // number of the parent element.
  //   For example:
  //       /source/1/playlist/count
  //   Might return:
  //       23
  nClass['item'].properties.push({
    name: "count",
    type: "integer"
  });
  
  // The 'class' property returns the name of the
  // class, but can be called on any 'item'.
  //   For example:
  //       /selection/1/class
  //   Might return:
  //       "file track"
  nClass['item'].properties.push({
    name: "class",
    type: "class"
  });
  
  return nClass;
}

nClass.createPropObj = function(prop) {
  return {
    name: prop['@'].name,
    type: prop['@'].type,
    description: prop['@'].description
  };
}

module.exports = nClass;
