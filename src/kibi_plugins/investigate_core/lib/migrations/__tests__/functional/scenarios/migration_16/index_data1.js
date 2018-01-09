module.exports = [
  {
    index: {
      _index: '.siren',
      _type: 'datasource',
      _id: 'datasource1'
    }
  },
  {
    title : 'Some datasource which should not be upgraded'
  },
  {
    index: {
      _index: '.siren',
      _type: 'datasource',
      _id: 'Kibi-Gremlin-Server'
    }
  },
  {
    title : 'Kibi-Gremlin-Server'
  }
];
