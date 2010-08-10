
function nSpecifier(specifier) {
  var rtn = "";
  var chunks = specifier.split("/").splice(1);
  var currentObj = nClass.getClass("application");
  var i = 0;
  
  while (i < chunks.length-1) {
    var propOrClass = chunks[i++];
    var newRtn = "";
    //console.log(currentObj.name + ": " + propOrClass);
    if (propOrClass.indexOf(",") >= 0) {
      var propOrClass = propOrClass.split(",");
      var goodProps = true;
      propOrClass.forEach(function(prop) {
        if (!currentObj.hasProperty(prop)) {
          goodProps = false;
        }
      });
    }
    if (goodProps || currentObj.hasProperty(propOrClass)) {
      if (Array.isArray(propOrClass)) {
        newRtn += "{";
        for (var j=0; j<propOrClass.length; j++) {
          newRtn += propOrClass[j];
          if (j < propOrClass.length-1) newRtn += ", ";
        }
      newRtn += "}";
      } else {
        currentObj = nClass.getClass(currentObj.getProperty(propOrClass).type);
        newRtn = propOrClass;
      }
      if (rtn.length > 0) {
        newRtn += " of " + this.currentVar;
      }
      rtn = newRtn;
    } else if (currentObj.hasElement(propOrClass)) {

      currentObj = nClass.getClass(propOrClass);
      var prevVar = this.currentVar;
      this.currentVar = generateVariableName();
      var specifier = chunks[i++];
      newRtn += "set " + this.currentVar + " to ";
      var isNum = specifier == String(Number(specifier));
      
      if (isNum) {
        specifier = Number(specifier);
        newRtn += propOrClass + " ";
        if (specifier < 0) {
          newRtn += "id " + Math.abs(specifier);
        } else {
          newRtn += specifier;
        }
      } else {
        // Handle "Intro" (direct name selection) and name=blah (search API) cases
        newRtn += "every " + propOrClass;
      }
      if (prevVar) {
        newRtn += " of " + prevVar;
      }
      newRtn += "\n";      
      rtn += newRtn;
    } else {
      // Throw error, 'currentObj' doesn't contain prop or element 'propOrClass'!
      throw new Error('Class "' +currentObj.name+ '" doesn\'t contain property or element "' + propOrClass + '"');
    }
  }  
  
  this.type = currentObj;
  this.rtn = rtn;
}

nSpecifier.prototype.toAppleScript = function() {
  return this.rtn;
}

nSpecifier.prototype.getVariable = function() {
  return this.currentVar;
}

nSpecifier.setNClass = function(nclass) {
  nClass = nclass;
}

function generateVariableName() {
  return randomLetter() + randomLetter() + randomLetter() + randomLetter() +
         randomLetter() + randomLetter() + randomLetter() + randomLetter() +
         randomLetter() + randomLetter() + randomLetter() + randomLetter() +
         randomLetter() + randomLetter() + randomLetter() + randomLetter();
}

function randomLetter() {
  return String.fromCharCode(Math.floor(Math.random()*24)+97);
}

module.exports = nSpecifier;
