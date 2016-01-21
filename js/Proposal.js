var Proposal = function(data) {
  this.original = {
    bill: data.billName,
    proposers: (data.billProposer ? data.billProposer.trim() : null),
    org: data.billOrg
  };
  this.meetingID = new MeetingID(data.term, data.sessionPeriod, data.sessionTimes, data.meetingTimes);

  this.pdf = data.pdfUrl;
  this.bills = [];
  this.requests = {};
  this.proposerType = null;
  this.proposers = [];
  this.status = data.billStatus.replace('(', ':').replace(')', '');

  // extract requests
  var text = data.billName.replace('\n', '').replace('立法院','LY');
  var requests = text.match(/「[^「]+」/g);
  for(var request of requests) {
    request = request.substr(1, request.length - 2);
    var matchResult = /(.*(法|議事規則|組織規程|條例|條約|公約|稅則|通則|協定|協議|預算案|總預算|參與文書))(.*)/.exec(request);
    var bill, detail;
    if(matchResult != null ){
      bill = matchResult[1];
      detail = matchResult[3];
      // text processing
      var matches = detail.match(new RegExp('第[' + Utility.CHNUM + ']+條(之[' + Utility.CHNUM + ']+)*', 'g'));
      if(matches != null) {
        var parts, article, item, replace;
        for(var match of matches) {
          parts = match.split('之');
          article = parts[0];
          article = Utility.parseChineseNumeral(article.substr(1, article.length - 2));
          replace = '§' + article;
          if(parts.length > 1) {
            item = parts[1];
            item = Utility.parseChineseNumeral(item);
            replace += '-' + item;
          }
          detail = detail.replace(match, replace);
        }
      }
      detail = detail
        .replace(/條文修正草案/g, '修')
        .replace(/條文草案/g, '')
        .replace(/、/g, ',')
        .replace(/及/g, ',');
    }
    else {
      bill = request;
      detail = null;
      console.warn('無法進一步判定法案名稱', request);
    }
    this.requests[bill] = (this.requests[bill] == undefined ? [] : this.requests[bill]);
    this.requests[bill].push(detail);
  }
  this.bills = Object.keys(this.requests);
  this.requestInfo = [];
  for(var bill in this.requests) {
    this.requestInfo.push(bill + ':' + this.requests[bill].join(','));
  }
  this.requestInfo = this.requestInfo.join(';');

  // extract proposers
  var nameReplacements = ['楊　曜','薛　凌'];
  if(data.billProposer != null) {
    this.proposerType = 'legislator';
    text = data.billProposer;
    for(var name of nameReplacements) {
      text = text.replace(name, name.replace('　', ''));
    }
  }
  else if(data.billOrg != null) {
    // check first
    var result = /本院委員(.+)等[\d]+人/.exec(data.billOrg);
    if(result != null) {
      console.warn('提案人空白但提案單位為委員', data.billOrg);
      this.proposerType = 'legislator';
      text = result[1];
    }
    else {
      this.proposerType = 'org';
      text = data.billOrg;
    }
  }
  else {
    console.warn('提案人及提案單位皆為空白');
  }

  this.proposers = text.trim().split(/\s+/);
  //assertions
  /*
  for(var p of this.proposers) {
    if(p.length < 2) {
      console.warn('提案人可能有誤', p);
    }
  }*/
};
Proposal.prototype.lookupDictionaries = function() {
  this.meetingFullInfo = [];
  this.meetingDates = [];

  var meetings = meetingDictionary[this.meetingID.numericID];
  if(meetings == undefined) {
    console.warn('找不到會議紀錄', this.meetingID.numericID);
    this.warning = Utility.WARN;
  }
  else {
    if(Object.keys(meetings).length > 1)
      this.warning = Utility.WARN;
    for(var name in meetings) {
      var datetimes = meetings[name];
      this.meetingFullInfo.push(name + datetimes.join(','));

      for(var datetime of datetimes) {
        datetime = datetime.split('T');
        this.meetingDates.push(datetime[0]);
      }
    }
  }
  this.meetingDates = Utility.abbreviateDates(this.meetingDates);
}
Proposal.prototype.toString = function() {
  return this.original.bill;
};
Proposal.prototype.toRow = function(i) {
  return '<tr>' +
    '<td>' + i + '</td>' +
    //'<td class="debug">' + this.meetingID.numericID + '</td>' +
    //'<td class="debug">' + (this.warning ? this.warning : '') + this.meetingFullInfo.join(';') + '</td>' +
    '<td>' + (this.warning ? this.warning : '') + this.meetingDates.join(',') + '</td>' +
    '<td class="debug">' + this.original.bill + '</td>' +
    '<td class="debug">' + this.requestInfo + '</td>' +
    '<td>' + this.bills.join(',') + '</td>' +
    //'<td class="debug">' + this.original.proposers + ';' + this.original.org + '</td>' +
    //'<td class="debug">' + this.proposerType + '</td>' +
    '<td>' + this.proposers.join(',') + '</td>' +
    '<td>' + this.status + '</td>' +
    '<td><a href="' + this.pdf + '" target="_blank">PDF</a></td>' +
  '</tr>';
};
Proposal.loader = function(url, callback) {
  $.getJSON(url, function(data) {
    data = data.jsonList;
    for(var item of data) {
      proposals.push(new Proposal(item));
    }
    callback(null); // necessary for queue.js to work
  });
};
Proposal.sortByBill = function(p, q) {
  var a = p.relatedBills.join(',');
  var b = q.relatedBills.join(',');
  if(a < b)
    return -1;
  else if(a > b)
    return 1;
  else
    return 0;
}
