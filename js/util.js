var Utility = {};
Utility.unique = function(list, key, needle) {
  var dict = {};
  for(var x of list) {
    var vals = x[key];
    if(vals == null)
      continue;
    if(!Array.isArray(vals))
      vals = [vals];

    //console.log(vals);
    for(val of vals)
      if(val != null && (needle === undefined || val.indexOf(needle) != -1))
        dict[val] = true;
  }
  return Object.keys(dict);
};
// sort object values according to keys
Utility.sortObjectByKey = function(obj) {
  var keys = Object.keys(obj);
  keys.sort();
  var temp = {};
  for(key of keys)
    temp[key] = obj[key];
  return temp;
};

// omit identical dates and identical year and months between consecutive dates
Utility.abbreviateDates = function(dates) {
  if(dates.length <= 0)
    return dates;

  dates.sort();
  dates = dates.map(function(d) { return d.split('-'); }); // 分開

  for(var g = 0; g < 3; g++) { // scan three times from year down to day
    var current = dates[0][g];
    for(var i = 1; i < dates.length; i++) {
      if(dates[i][g] == current) {
        dates[i][g] = undefined; // remove value but retain array index
      }
    }
  }
  for(var i = 0; i < dates.length; i++) {
    dates[i] = dates[i]
      .filter(function(v) { return v != undefined; }) // removed omitted values
      .map(function(v) { return parseInt(v); }) // make values into integers
      .join('/'); // make readable string
  }
  return dates.filter(function(v) { return (v != undefined && v != null && v != ''); }); // remove empty values
};
