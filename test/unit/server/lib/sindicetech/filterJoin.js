var root = require('requirefrom')('');
var filterJoin = root('src/server/lib/sindicetech/filterJoin');
var expect = require('expect.js');
var Promise = require('bluebird');
var _ = require('lodash');

describe('All you errors', function () {
  it('join must be in an array', function () {
    var query = {
      aaa: {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            }
          ]
        }
      }
    };
    expect(filterJoin).withArgs(query).to.throwException(/array/);
  });
});

describe('FilterJoin querying', function () {
  it('in a bool clause', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var query = {
      bool: {
        must: [
          {
            join: {
              focus: 'i1',
              indexes: [
                {
                  id: 'i1',
                  type: 'cafard'
                },
                {
                  id: 'i2',
                  type: 'cafard'
                }
              ],
              relations: relations
            }
          }
        ]
      }
    };
    var expected = {
      bool: {
        must: [
          {
            filterjoin: {
              id1: {
                query: {
                  filtered: {
                    query: {
                      bool: {
                        must: [
                          {
                            match_all: {}
                          }
                        ]
                      }
                    },
                    filter: {
                      bool: {
                        must: []
                      }
                    }
                  }
                },
                index: 'i2',
                path: 'id2',
                type: 'cafard'
              }
            }
          }
        ]
      }
    };
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('no filter', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            }
          ],
          relations: relations
        }
      }
    ];
    var expected = [
      {
        filterjoin: {
          id1: {
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: []
                  }
                }
              }
            },
            index: 'i2',
            path: 'id2',
            type: 'cafard'
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('filter on focused index', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var filters = {
      i1: [
        {
          terms: {
            tag: [ 'grishka' ]
          }
        }
      ]
    };
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            }
          ],
          relations: relations,
          filters: filters
        }
      }
    ];
    var expected = [
      {
        terms: {
          tag: [ 'grishka' ]
        }
      },
      {
        filterjoin: {
          id1: {
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: []
                  }
                }
              }
            },
            index: 'i2',
            path: 'id2',
            type: 'cafard'
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('focus filter array', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var filters = {
      i2: [
        {
          terms: {
            tag: [ 'grishka' ]
          }
        },
        {
          yo: 'da'
        }
      ]
    };
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            }
          ],
          relations: relations,
          filters: filters
        }
      }
    ];
    var expected = [
      {
        filterjoin: {
          id1: {
            index: 'i2',
            type: 'cafard',
            path: 'id2',
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: [
                      {
                        terms: {
                          tag: [ 'grishka' ]
                        }
                      },
                      {
                        yo: 'da'
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('filter on related index', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var filters = {
      i2: [
        {
          terms: {
            tag: [ 'grishka' ]
          }
        }
      ]
    };
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            }
          ],
          relations: relations,
          filters: filters
        }
      }
    ];
    var expected = [
      {
        filterjoin: {
          id1: {
            index: 'i2',
            type: 'cafard',
            path: 'id2',
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: [
                      {
                        terms: {
                          tag: [ 'grishka' ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('filter on focused and related indices', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var filters = {
      i1: [
        {
          terms: {
            tag: [ 'pluto' ]
          }
        }
      ],
      i2: [
        {
          terms: {
            tag: [ 'grishka' ]
          }
        }
      ]
    };
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            }
          ],
          relations: relations,
          filters: filters
        }
      }
    ];
    var expected = [
      {
        terms: {
          tag: [ 'pluto' ]
        }
      },
      {
        filterjoin: {
          id1: {
            index: 'i2',
            type: 'cafard',
            path: 'id2',
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: [
                      {
                        terms: {
                          tag: [ 'grishka' ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('three related indices - line', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ],
      [ 'i3.id3', 'i2.id2' ]
    ];
    var filters = {
      i1: [
        {
          terms: {
            tag: [ 'pluto' ]
          }
        }
      ],
      i3: [
        {
          terms: {
            tag: [ 'grishka' ]
          }
        }
      ]
    };
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            },
            {
              id: 'i3',
              type: 'cafard'
            }
          ],
          relations: relations,
          filters: filters
        }
      }
    ];
    var expected = [
      {
        terms: {
          tag: [ 'pluto' ]
        }
      },
      {
        filterjoin: {
          id1: {
            index: 'i2',
            type: 'cafard',
            path: 'id2',
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: [
                      {
                        filterjoin: {
                          id2: {
                            index: 'i3',
                            type: 'cafard',
                            path: 'id3',
                            query: {
                              filtered: {
                                query: {
                                  bool: {
                                    must: [
                                      {
                                        match_all: {}
                                      }
                                    ]
                                  }
                                },
                                filter: {
                                  bool: {
                                    must: [
                                      {
                                        terms: {
                                          tag: [ 'grishka' ]
                                        }
                                      }
                                    ]
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('three related indices - V', function () {
    var relations = [
      [ 'i1.aaa', 'i2.id2' ],
      [ 'i3.id3', 'i1.bbb' ]
    ];
    var filters = {
      i2: [
        {
          terms: {
            tag: [ 'pluto' ]
          }
        }
      ],
      i3: [
        {
          terms: {
            tag: [ 'grishka' ]
          }
        }
      ]
    };
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            },
            {
              id: 'i3',
              type: 'cafard'
            }
          ],
          relations: relations,
          filters: filters
        }
      }
    ];
    var expected = [
      {
        filterjoin: {
          aaa: {
            index: 'i2',
            type: 'cafard',
            path: 'id2',
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: [
                      {
                        terms: {
                          tag: [ 'pluto' ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      {
        filterjoin: {
          bbb: {
            index: 'i3',
            type: 'cafard',
            path: 'id3',
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: [
                      {
                        terms: {
                          tag: [ 'grishka' ]
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('three related indices - spock', function () {
    var relations = [
      [ 'i1.aaa', 'i2.id2' ],
      [ 'i4.id', 'i2.a' ],
      [ 'i5.id', 'i2.b' ],
      [ 'i3.id3', 'i1.bbb' ],
      [ 'i6.id', 'i3.a' ],
      [ 'i7.id', 'i3.b' ]
    ];
    var filters = {
      i1: [
        {
          terms: {
            tag: [ 'grishka' ]
          }
        }
      ],
      i4: [
        {
          terms: {
            tag: [ 'pluto' ]
          }
        }
      ],
      i5: [
        {
          terms: {
            tag: [ 'sylvester' ]
          }
        }
      ],
      i6: [
        {
          terms: {
            tag: [ 'mickey' ]
          }
        }
      ],
      i7: [
        {
          terms: {
            tag: [ 'donald' ]
          }
        }
      ]
    };
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            },
            {
              id: 'i3',
              type: 'cafard'
            },
            {
              id: 'i4',
              type: 'cafard'
            },
            {
              id: 'i5',
              type: 'cafard'
            },
            {
              id: 'i6',
              type: 'cafard'
            },
            {
              id: 'i7',
              type: 'cafard'
            }
          ],
          relations: relations,
          filters: filters
        }
      }
    ];
    var expected = [
      {
        terms: {
          tag: [ 'grishka' ]
        }
      },
      {
        filterjoin: {
          aaa: {
            index: 'i2',
            type: 'cafard',
            path: 'id2',
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: [
                      {
                        filterjoin: {
                          a: {
                            index: 'i4',
                            type: 'cafard',
                            path: 'id',
                            query: {
                              filtered: {
                                query: {
                                  bool: {
                                    must: [
                                      {
                                        match_all: {}
                                      }
                                    ]
                                  }
                                },
                                filter: {
                                  bool: {
                                    must: [
                                      {
                                        terms: {
                                          tag: [ 'pluto' ]
                                        }
                                      }
                                    ]
                                  }
                                }
                              }
                            }
                          }
                        }
                      },
                      {
                        filterjoin: {
                          b: {
                            index: 'i5',
                            type: 'cafard',
                            path: 'id',
                            query: {
                              filtered: {
                                query: {
                                  bool: {
                                    must: [
                                      {
                                        match_all: {}
                                      }
                                    ]
                                  }
                                },
                                filter: {
                                  bool: {
                                    must: [
                                      {
                                        terms: {
                                          tag: [ 'sylvester' ]
                                        }
                                      }
                                    ]
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
        {
          filterjoin: {
            bbb: {
              index: 'i3',
              type: 'cafard',
              path: 'id3',
              query: {
                filtered: {
                  query: {
                    bool: {
                      must: [
                        {
                          match_all: {}
                        }
                      ]
                    }
                  },
                  filter: {
                    bool: {
                      must: [
                        {
                          filterjoin: {
                            a: {
                              index: 'i6',
                              type: 'cafard',
                              path: 'id',
                              query: {
                                filtered: {
                                  query: {
                                    bool: {
                                      must: [
                                        {
                                          match_all: {}
                                        }
                                      ]
                                    }
                                  },
                                  filter: {
                                    bool: {
                                      must: [
                                        {
                                          terms: {
                                            tag: [ 'mickey' ]
                                          }
                                        }
                                      ]
                                    }
                                  }
                                }
                              }
                            }
                          }
                        },
                        {
                          filterjoin: {
                            b: {
                              index: 'i7',
                              type: 'cafard',
                              path: 'id',
                              query: {
                                filtered: {
                                  query: {
                                    bool: {
                                      must: [
                                        {
                                          match_all: {}
                                        }
                                      ]
                                    }
                                  },
                                  filter: {
                                    bool: {
                                      must: [
                                        {
                                          terms: {
                                            tag: [ 'donald' ]
                                          }
                                        }
                                      ]
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              }
            }
          }
        }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('connected component 1', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ],
      [ 'i3.id3', 'i4.id4' ]
    ];
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            },
            {
              id: 'i3',
              type: 'cafard'
            },
            {
              id: 'i4',
              type: 'cafard'
            }
          ],
          relations: relations
        }
      }
    ];
    var expected = [
      {
        filterjoin: {
          id1: {
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: []
                  }
                }
              }
            },
            index: 'i2',
            path: 'id2',
            type: 'cafard'
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('connected component 2', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ],
      [ 'i1.id0', 'i0.id0' ],
      [ 'i3.id3', 'i4.id4' ]
    ];
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i0',
              type: 'cafard'
            },
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            }
          ],
          relations: relations
        }
      }
    ];
    var expected = [
      {
        filterjoin: {
          id1: {
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: []
                  }
                }
              }
            },
            index: 'i2',
            path: 'id2',
            type: 'cafard'
          }
        }
      },
      {
        filterjoin: {
          id0: {
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: []
                  }
                }
              }
            },
            index: 'i0',
            path: 'id0',
            type: 'cafard'
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('accepts orderby and maxtermspershard parameters', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard',
              orderBy: 'doc_score',
              maxTermsPerShard: '10'
            }
          ],
          relations: relations
        }
      }
    ];
    var expected = [
      {
        filterjoin: {
          id1: {
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: []
                  }
                }
              }
            },
            index: 'i2',
            path: 'id2',
            type: 'cafard',
            orderBy: 'doc_score',
            maxTermsPerShard: '10'
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });

  it('moves the query object to filtered.query', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1',
              type: 'cafard'
            },
            {
              id: 'i2',
              type: 'cafard'
            }
          ],
          relations: relations,
          filters: {
            i2: [
              {
                query: {
                  query_string: {
                    analyze_wildcard: true,
                    query: 'travel'
                  }
                }
              }
            ]
          }
        }
      }
    ];
    var expected = [
      {
        filterjoin: {
          id1: {
            query: {
              filtered: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      },
                      {
                        query_string: {
                          analyze_wildcard: true,
                          query: 'travel'
                        }
                      }
                    ]
                  }
                },
                filter: {
                  bool: {
                    must: []
                  }
                }
              }
            },
            index: 'i2',
            path: 'id2',
            type: 'cafard'
          }
        }
      }
    ];
    var actual = filterJoin(query);
    expect(actual).to.eql(expected);
  });
});
