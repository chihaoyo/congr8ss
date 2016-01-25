var Utility = {};
Utility.unique = function(list, key, needle) {
  var dict = {};
  for(var i in list) {
    var x = list[i];
    var vals = x[key];
    if(vals == null)
      continue;
    if(!Array.isArray(vals))
      vals = [vals];

    //console.log(vals);
    for(var val of vals)
      if(val != null && (needle === undefined || val.indexOf(needle) != -1))
        dict[val] = true;
  }
  return Object.keys(dict);
};
//http://stackoverflow.com/questions/15478954/sort-array-elements-string-with-numbers-natural-sort
Utility.naturalSort = function(a, b) {
    var ax = [], bx = [];

    a.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { ax.push([$1 || Infinity, $2 || ""]) });
    b.replace(/(\d+)|(\D+)/g, function(_, $1, $2) { bx.push([$1 || Infinity, $2 || ""]) });
    while(ax.length && bx.length) {
        var an = ax.shift();
        var bn = bx.shift();
        var nn = (an[0] - bn[0]) || an[1].localeCompare(bn[1]);
        if(nn) return nn;
    }
    return ax.length - bx.length;
}
// sort object values according to keys
Utility.sortObjectByKey = function(obj) {
  var keys = Object.keys(obj);
  keys.sort(Utility.naturalSort);
  var temp = {};
  for(var key of keys)
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
Utility.CHNUM = '〇零一二三四五六七八九十百千';
Utility.parseChineseNumeral = function(n0) { // only good for less than 10,000
  var replacements = {'〇':0,'零':0,'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'百':100,'千':1000};
  var n = n0.split('').join(',');
  for(var c in replacements) {
    var a = replacements[c];
    n = n.replace(new RegExp(c, 'g'), a); // String.prototype.replace only replaces the first occurence
  }
  n = n.split(',').map(function(m) { return parseInt(m); });
  var sum = 0;
  var current = 0;
  for(var m of n) {
    if(m !== 0 && Number.isInteger(m/10)) { // 十、百、千
      if(current == 0)
        current++;
      sum += current*m;
      current = 0;
    }
    else {
      current += m;
    }
  }
  sum += current;
  if(isNaN(sum)) console.error(n0, n, sum);
  return sum;
};
Utility.WARN = '<span class="warn">⚠️</span>'

Utility.printProposalsInSection = function(dict) {
  var $body = $('body');
  for(var title in dict) {
    var pids = dict[title];
    var $section = $('<section>').append('<h1>' + title + '</h1>')
    var $table = $('<table class="proposals">');
    for(var i = 0; i < pids.length; i++){
      $table.append(proposals[pids[i]].toRow(i + 1));
    }
    $section.append($table);
    $body.append($section);
  }
};

Utility.PARTYCODE = {
  'KMT': ['國民黨', '中國國民黨'],
  'DPP': ['民進黨', '民主進步黨'],
  'PFP': ['親民黨'],
  'TSU': ['台聯','台灣團結聯盟'],
};
Utility.PARTYNAME = {};
for(var code in Utility.PARTYCODE) {
  for(var name of Utility.PARTYCODE[code])
    Utility.PARTYNAME[name] = code;
}
