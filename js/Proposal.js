var Proposal = function(data) {
  this.original = {
    bill: data.billName.trim()
      .replace(/，請審議案。/g, '')
      .replace(/，請查照審議。/g, '')
      .replace(/案。/g, '')
      .replace(/。/g, ''),
    proposers: (data.billProposer ? data.billProposer.trim() : null),
    org: data.billOrg.trim(),
  };
  this.meetingID = new MeetingID(data.term, data.sessionPeriod, data.sessionTimes, data.meetingTimes);
  this.documentURL = (data.pdfUrl != null ? data.pdfUrl : (data.docUrl != null ? data.docUrl : null));
/*
  this.id = (this.documentURL != null ? this.documentURL.match(/\/([^/]+)\.(pdf|doc)/)[1] : null);
  if(this.documentURL == null)
    console.warn('沒有文件檔案', data);*/
  this.id = data.billNo + '-' + this.meetingID.numericID;
  // this is unique!
  // 原始資料的pdfUrl或docUrl都可能被多個提案共用，不適合做為提案的unique ID

  this.bills = []; // an array of only bill names
  this.requests = {}; // bill+article
  this.proposerType = null;
  this.proposers = [];
  this.status = data.billStatus.replace('(', ':').replace(')', '');

  // extract requests
  var text = data.billName.trim()
    .replace('\n', '') // make it single line (sort of)
    .replace('立法院', 'LY')
    .replace('憲法增修條文','憲增')
    .replace('（含附屬單位預算及綜計表-營業及非營業部分）', '')
    .replace('(含附屬單位預算及綜計表-營業及非營業部分)', '');

  var requests = text.match(/「[^「]+」/g);
  for(var request of requests) {
    request = request
      .substr(1, request.length - 2) // remove quotes
      .replace(/總預算案/g, '總預算');

    // find bill name (strip details such as article number away)
    var matchResult =
    /(.*(法律文件|憲增|法|議事規則|組織規程|條例|條約|公約|稅則|通則|議定書|協定|協議|預算案|總預算|參與文書))(.*)/.exec(request);
    var bill, detail;
    if(matchResult != null) { // if bill name is found
      bill = matchResult[1];
      detail = matchResult[3];
      // text processing
      // find 第_條(之_) in detail
      var matches = detail.match(new RegExp('第{0,1}[' + Utility.CHNUM + ']+條(之[' + Utility.CHNUM + ']+)*', 'g'));
      if(matches != null) {
        var parts, article, ordinal, item, replace;
        for(var match of matches) {
          parts = match.split('之');
          article = parts[0];
          ordinal = (article.substr(0,1) == '第' ? 1 : 0);
          article = Utility.parseChineseNumeral(article.substr((ordinal ? 1 : 0), article.length - (ordinal ? 2 : 1)));
          replace = '§' + article;
          if(parts.length > 1) { // if '之' is found
            item = parts[1];
            item = Utility.parseChineseNumeral(item);
            replace += '-' + item;
          }
          detail = detail.replace(match, replace);
        }
      }
      detail = detail
        .replace(/部分條文修正草案/, '') // omit
        .replace(/條文修正草案/g, '')
        .replace(/修正草案/g, '')
        .replace(/部分條文草案/g, '')
        .replace(/條文草案/g, '')
        .replace(/草案/g, '')
        .replace(/增訂/g, '')
        .replace(/刪除/g, '')
        .replace(/(、|及)/g, ','); // use comma to look cool
    }
    else { // if bill name is not found
      bill = request;
      detail = null;
      console.warn('無法進一步判定法案名稱', request);
    }
    this.requests[bill] = (this.requests[bill] == undefined ? {} : this.requests[bill]);

    detail = (detail == null || detail == '' ? '-' : detail);
    if(detail != null) {
      var detailItems = detail.split(',');
      for(var item of detailItems)
        this.requests[bill][item] = true;
    }
  } // end of each request

  // clean up
  for(var bill in this.requests) {
    this.requests[bill] = Object.keys(this.requests[bill]);
  }
  this.bills = Object.keys(this.requests);
  this.requestInfo = [];
  for(var bill in this.requests) {
    this.requestInfo.push(bill + ':' + this.requests[bill]);
  }
  this.requestInfo = this.requestInfo.join(';');

  // extract proposers
  var twoCharacterNames = ['楊　曜','薛　凌'];
  if(data.billProposer != null) {
    this.proposerType = 'legislator';
    text = data.billProposer;
    for(var name of twoCharacterNames) {
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

  for(var i = 0; i < this.proposers.length; i++) {
    var p = this.proposers[i];
    var q = null;
    if(p == '法院黨團')
      p = '親民黨立法院黨團';
    else if(p == '聯盟立法院黨團')
      p = '台灣團結聯盟立法院黨團';

    if(p.indexOf('黨團') != -1) { // proposer is a caucus
      for(var partyName in Utility.PARTYNAME) {
        if(p.indexOf(partyName) != -1) {
          q = Utility.PARTYNAME[partyName];
          break;
        }
      }
      if(q != null)
        this.proposers[i] = q;
      else
        console.warn('奇怪的黨團', p, this.id);
    }
  }
  //assertions
  /*
  for(var p of this.proposers) {
    if(p.length < 2) {
      console.warn('提案人可能有誤', p);
    }
  }*/
};
Proposal.prototype.lookupMeetings = function() {
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
    '<td class="index">' + i + '</td>' +
    '<td class="debug">' + this.id + '</td>' +
    //'<td class="debug">' + this.meetingID.numericID + '</td>' +
    //'<td class="debug">' + (this.warning ? this.warning : '') + this.meetingFullInfo.join(';') + '</td>' +
    '<td class="dates">' + (this.warning ? this.warning : '') + this.meetingDates.join(',') + '</td>' +
    //'<td>' + this.bills.join(',') + '</td>' +
    '<td class="debug">' + this.original.bill + '</td>' +
    //'<td class="debug">' + this.requestInfo + '</td>' +
    '<td class="debug">' + this.original.proposers + ';' + this.original.org + '</td>' +
    //'<td class="debug">' + this.proposerType + '</td>' +
    '<td>' + this.proposers.join(',') + '</td>' +
    '<td class="status">' + this.status + '</td>' +
    '<td class="link"><a href="' + this.documentURL + '" target="_blank">doc</a></td>' +
  '</tr>';
};
Proposal.loader = function(url, callback) {
  $.getJSON(url, function(data) {
    data = data.jsonList;
    for(var item of data) {
      var proposal = new Proposal(item);
      proposals[proposal.id] = proposal;
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
