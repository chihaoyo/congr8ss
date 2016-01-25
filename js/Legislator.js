var Legislator = function(data) {
  this.name = data.name.replace(/．/g, '･');
  this.party = Utility.PARTYNAME[data.party];

  this.id = this.name;
};
Legislator.loader = function(url, callback) {
  $.get(url, function(data) {
    data = X2JS.xml2json(data).opendata.data;
    for(var item of data) {
      var legislator = new Legislator(item)
      legislators[legislator.id] = legislator;
    }

    // add 黨團
    for(var p in Utility.PARTYCODE) {
      legislators[p] = new Legislator({name: p, party: p});
    }
    callback(null);
  });
}
