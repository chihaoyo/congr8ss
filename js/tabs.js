// data structures
var proposers = {};
var meetings = [];
var meetingDictionary = {};
var meetingTimeDictionary = {};
var proposals = {};

// UI
var $body, $partyFilter, $statusFilter, $layout, $jump;
var styleEl, stylesForFilter = '';

$(function() {
  $body = $('body');
  $partyFilter = $('#partyFilter');
  $statusFilter = $('#statusFilter');
  $layout = $('#layout');
  $jump = $('#jump');
});

var main = function() {
  console.log(Object.keys(proposals).length, 'proposals');

  // build dictionaries of meetings
  for(var meeting of meetings) {
    // meetingDictionary
    var idString = meeting.id.numericID;
    if(meetingDictionary[idString] == undefined) {
      meetingDictionary[idString] = {};
    }
    if(meetingDictionary[idString][meeting.name] == undefined) {
      meetingDictionary[idString][meeting.name] = [];
    }
    meetingDictionary[idString][meeting.name].push(meeting.date + 'T' + meeting.time.start + '-' + meeting.time.finish);

    // meetingTimeDictionary
    var timeString = meeting.time.start + '-' + meeting.time.finish;
    if(meetingTimeDictionary[timeString] == undefined)
      meetingTimeDictionary[timeString] = [];
    meetingTimeDictionary[timeString].push(meeting.date + ':' + meeting.name);
  }
  meetingTimeDictionary = Utility.sortObjectByKey(meetingTimeDictionary);

  // augement proposals with meeting data
  for(var pid in proposals) {
    proposals[pid].lookupMeetings();
  }

  $body.removeClass('loading');
}; // end of main()

// load everything in
// proposals: http://data.ly.gov.tw/getds.action?id=20
// meetings: http://data.ly.gov.tw/getds.action?id=42
var Q = queue(1); // parallelism: sequential
Q.defer(Proposer.loader, 'legislators/p1.xml');
for(var i = 1; i <= 3; i++) {
  Q.defer(Meeting.loader, 'meetings/p' + i + '.xml'); // JSON is unavailable
}
for(var i = 1; i <= 14; i++) {
  Q.defer(Proposal.loader, 'proposals/p' + i + '.json');
}
Q.awaitAll(main);
