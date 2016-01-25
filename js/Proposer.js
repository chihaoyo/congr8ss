var Proposer = function(type, data) {
  this.type = type;
  this.name = data.name.replace(/．/g, '･');
  this.party = Utility.PARTYNAME[data.party];

  this.id = this.name;
};
Proposer.loader = function(url, callback) {
  $.get(url, function(data) {
    data = X2JS.xml2json(data).opendata.data;
    for(var item of data) {
      var proposer = new Proposer('legislator', item);
      proposers[proposer.id] = proposer;
    }

    // add 黨團
    for(var p in Utility.PARTYCODE) {
      proposers[p] = new Proposer('caucus', {name: p, party: Utility.PARTYCODE[p][0]});
    }
    // add 行政機關
    for(var office of Utility.EXEOFFICES) {
      proposers[office] = new Proposer('exe', {name: office, party: 'EXE'});
    }
    callback(null);
  });
}
