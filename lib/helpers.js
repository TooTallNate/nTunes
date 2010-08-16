function arrayUniq(array) {
  var o = {}, i, l = array.length, r = [];
  for(i=0; i<l;i++) o[array[i]] = array[i];
  for(i in o) r.push(o[i]);
  return r;
}

module.exports = {
  arrayUniq: arrayUniq
}
