/**
 * Defines the article index with two types
 */
module.exports = [
  {
    index: {
      _index: 'article',
      _type: 'Article1',
      _id: 'article1'
    }
  },
  {
    title: 'title 1'
  },
  {
    index: {
      _index: 'article',
      _type: 'Article2',
      _id: 'article2'
    }
  },
  {
    title: 'title 2'
  }
];
