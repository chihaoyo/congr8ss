var Utility = {};
// find unique values of cols in rows of list
/*
options
- needle: values will contain needle
- array: return array of values only
- count: return counts
*/
Utility.unique = function(list, ids, col, options) {
  options = options || {};
  var dict = {};
  for(var id of ids) {
    var row = list[id];
    var vals = row[col];
    if(vals === undefined || vals == null)
      continue;

    vals = (Array.isArray(vals) ? vals : [vals]);
    //console.log(vals);
    for(var val of vals) {
      if(val != null && (options.needle === undefined || val.indexOf(options.needle) != -1)) {
        //dict[val] = true;
        dict[val] = (dict[val] === undefined ? (options.count ? 0 : []) : dict[val]);
        if(options.count)
          dict[val]++;
        else
          dict[val].push(id);
      }
    }
  }
  if(options.array) {
    dict = Object.keys(dict);
  }
  return dict;
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
  var current = dates[0].slice(0); // clone
  for(var i = 1; i < dates.length; i++) {
    for(var j = 0; j < 3; j++) {
      if(dates[i][j] == current[j]) {
        dates[i][j] = undefined;
      }
      else {
        current[j] = dates[i][j];
        break;
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
Utility.PARTYCODE = {
  'KMT': ['國民黨', '中國國民黨'],
  'DPP': ['民進黨', '民主進步黨'],
  'PFP': ['親民黨'],
  'TSU': ['台聯','台灣團結聯盟'],
  'NAC': ['新聯盟','無黨團結聯盟','民國黨'],
  'GOV': ['行政院', '司法院', '考試院', '監察院', '本院教育及文化委員會', '教育部'],
};
Utility.PARTYNAME = {};
for(var code in Utility.PARTYCODE) {
  for(var name of Utility.PARTYCODE[code])
    Utility.PARTYNAME[name] = code;
}
Utility.STATUSCODE = {
  'Scheduled': '排入程序',
  'ReturnToProgramCommittee': '退回程序',
  'CommitteeWillExamine': '交付審查',
  'CommitteeDoneExamine': '審查完畢',
  'WillR2': '逕付二讀',
  'SkipCommitteeAndWillR2': '逕付二讀:委員會抽出',
  'ScheduledForGeneralAssembly': '排入院會',
  'R2': '二讀',
  'R3': '三讀',
  'Withdrawn': '撤案',
  'Dismissed': '不予審議',
  'Reassigning':'改交其他委員會審查',
};
Utility.STATUSNAME = {};
for(var code in Utility.STATUSCODE) {
  var name = Utility.STATUSCODE[code];
  Utility.STATUSNAME[name] = code;
}

Utility.groupProposals = function(keyIdentifier, keygen, printTOC, printGroups) {
  // make dict
  var dict = {}, keys;
  for(var pid in proposals) {
    keys = keygen(pid);
    keys = (Array.isArray(keys) ? keys : [keys]);
    for(var key of keys) {
      dict[key] = (dict[key] === undefined ? [] : dict[key]);
      dict[key].push(pid);
    }
  }

  // make groups
  groups = [], group, status;
  for(var key in dict) {
    var ids = dict[key];
    groups.push({
      key: key,
      ids: ids,
      dates: Utility.abbreviateDates(Utility.unique(proposals, ids, 'firstDate', {array: true})),
      titles: Utility.unique(proposals, ids, 'title', {array: true}),
      bills: Utility.unique(proposals, ids, 'bills', {array: true}),
      parties: Utility.unique(proposals, ids, 'parties', {array: true}),
      proposers: Utility.unique(proposals, ids, 'proposers', {array: true}),
      statusCount: Utility.unique(proposals, ids, 'status', {count: true}),
      documentURLs: Utility.unique(proposals, ids, 'documentURL', {array: true}),
    });
  }

  // count rows
  var rowCount = 0;
  for(var group of groups) {
    rowCount += group.ids.length;
  }
  console.log(rowCount, 'rows');

  // some variables
  var $article, $toc, $table, $header, $table, $groups, group;
  // DOM
  $article = $('<article id="' + keyIdentifier + '">').appendTo($body);
  // TOC
  if(printTOC) {
    $toc = $('<div class="toc">').appendTo($article);
    $('<a class="anchor" name="' + keyIdentifier + '-toc"></a></div>').appendTo($toc);
    $('<header><h1>' + keyIdentifier + '<h1><h2>TOC</h2></header>').appendTo($toc);
    $table = $('<table>').appendTo($toc);
    for(var g = 0; g < groups.length; g++) {
      group = groups[g];
      $('<tr data-parties="' + group.parties.join(' ') + '">' +
        '<td class="index">' + 'g' + (g + 1) + '</td>' +
        '<td>' + group.dates.join(',') + '</td>' +
        '<td>' + group.titles.join(',') + '</td>' +
        '<td>' + group.bills.join(',') + '</td>' +
        '<td>' + group.proposers.join(',') + '</td>' +
        '<td class="parties">' + group.parties.join(',') + '</td>' +
        '<td class="status">' + Utility.objectJoin(group.statusCount) + '</td>' +
        '<td class="link">' + group.documentURLs.map(function(url) {
          return '<a href="' + url + '" target="_blank">' + Utility.fileName(url) + '</a>';
        }).join(',') + '</td>' +
      '</tr>').appendTo($table);
    }
  }
  // groups
  if(printGroups) {
    $groups = $('<div class="groups"></div>').appendTo($article);
    $('<a class="anchor" name="' + keyIdentifier + '-groups"></a>').appendTo($groups);
    $('<header><h1>' + keyIdentifier + '<h1><h2>Groups</h2></header>').appendTo($groups);
    for(var g = 0; g < groups.length; g++) {
      group = groups[g];
      $group = $('<section>').appendTo($groups);
      $header = $('<header>').append('<label>' + 'g' + (g + 1) + '</labe>').append('<h1>' + group.key + '</h1>').appendTo($group);
      //$('<div class="titles">' + group.titles.join(',') + '</div>').appendTo($header);
      $('<div class="proposers">' + group.proposers.join(',') + '</div>').appendTo($header);
      $('<div class="parties">' + group.parties.join(',') + '</div>').appendTo($header);
      $('<div class="statusCount">' + Utility.objectJoin(group.statusCount) + '</div>').appendTo($header);

      $table = $('<table class="proposals">').appendTo($group);
      for(var i = 0; i < group.ids.length; i++) {
        $table.append(proposals[group.ids[i]].toRow(i + 1));
      }
    }
  }
}

Utility.objectJoin = function(obj) {
  return Object.keys(obj).map(function(v) {
    return v + ':' + obj[v];
  }).join(',')
};
Utility.fileName = function(url) {
  return url.match(/\/(([^/]+)\.(pdf|doc))/)[1];
};
