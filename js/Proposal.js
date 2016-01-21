var Request = function(bill, detail) {
  this.bill = bill;
  this.detail = detail;
};
Request.prototype.toString = function() {
  return this.bill + ':' + this.detail;
};

var Proposal = function(data) {
  this.original = {
    bill: data.billName,
    proposers: (data.billProposer ? data.billProposer.trim() : null),
    org: data.billOrg
  };
  this.meetingID = new MeetingID(data.term, data.sessionPeriod, data.sessionTimes, data.meetingTimes);

  this.pdf = data.pdfUrl;
  this.requests = [];
  this.relatedBills = [];
  this.proposerType = null;
  this.proposers = [];
  this.status = data.billStatus.replace('(', ':').replace(')', '');

  // extract requests
  var text = data.billName.replace('\n', '').replace('立法院','LY');
  var requests = text.match(/「[^「]+」/g);
  var bills = {};
  for(request of requests) {
    request = request.substr(1, request.length - 2);
    var matchResult = /(.*(法|議事規則|組織規程|條例|條約|公約|稅則|通則|協定|協議|預算案|總預算|參與文書))(.*)/.exec(request);
    var bill, detail;
    if(matchResult != null ){
      bill = matchResult[1];
      detail = matchResult[3];
    }
    else {
      bill = request;
      detail = null;
      console.warn('無法進一步判定法案名稱', request);
    }
    bills[bill] = true;
    this.requests.push(new Request(bill, detail));
  } // end of requests
  this.relatedBills = Object.keys(bills);

  // extract proposers
  var nameReplacements = ['楊　曜','薛　凌'];
  if(data.billProposer != null) {
    this.proposerType = 'legislator';
    text = data.billProposer;
    for(name of nameReplacements) {
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
  for(p of this.proposers) {
    if(p.length < 2) {
      console.warn('提案人可能有誤', p);
    }
  }*/
};
Proposal.prototype.toString = function() {
  return this.original.bill;
};
Proposal.prototype.toRow = function(i) {
  var meetings = meetingDictionary[this.meetingID.numericID];
  var warning = '';
  var meetingFullInfo = [];
  var meetingDates = [];
  if(meetings == undefined) {
    console.warn('找不到會議紀錄', this.meetingID.numericID);
  }
  else {
    warning = (Object.keys(meetings).length > 1 ? '⚠️' : '');
    for(name in meetings) {
      var datetimes = meetings[name];
      meetingFullInfo.push(name + datetimes.join(','));

      for(datetime of datetimes) {
        datetime = datetime.split('T');
        meetingDates.push(datetime[0]);
      }
    }
  }
  meetingDates = Utility.abbreviateDates(meetingDates);

  return '<tr>' +
    '<td>' + i + '</td>' +
    '<td class="debug">' + this.meetingID.numericID + '</td>' +
    '<td class="debug">' + warning + meetingFullInfo.join(';') + '</td>' +
    '<td>' + warning + meetingDates.join(',') + '</td>' +
    '<td class="debug">' + this.original.bill + '</td>' +
    '<td class="debug">' + this.requests.join(';') + '</td>' +
    '<td>' + this.relatedBills.join(',') + '</td>' +
    '<td class="debug">' + this.original.proposers + ';' + this.original.org + '</td>' +
    '<td class="debug">' + this.proposerType + '</td>' +
    '<td>' + this.proposers.join(',') + '</td>' +
    '<td>' + this.status + '</td>' +
    '<td><a href="' + this.pdf + '" target="_blank">PDF</a></td>' +
  '</tr>';
};
Proposal.loader = function(url, callback) {
  $.getJSON(url, function(data) {
    data = data.jsonList;
    for(item of data) {
      proposals.push(new Proposal(item));
    }
    callback(null); // necessary for queue.js to work
  });
};
