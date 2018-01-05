module.exports = [
  {
    index: {
      _index: '.kibi',
      _type: 'datasource',
      _id: 'datasource1'
    }
  },
  {
    title : 'Some datasource which should not be upgraded'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'datasource',
      _id: 'Kibi-Gremlin-Server'
    }
  },
  {
    title : 'Kibi-Gremlin-Server'
  }
];
