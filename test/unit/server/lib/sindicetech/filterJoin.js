var root = require('requirefrom')('');
var filterJoinSet = root('src/server/lib/sindicetech/filterJoin').set;
var filterJoinSeq = root('src/server/lib/sindicetech/filterJoin').sequence;
var expect = require('expect.js');
var Promise = require('bluebird');
var _ = require('lodash');

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
                indices: ['i2'],
                path: 'id2',
                types: ['cafard']
              }
            }
          }
        ]
      }
    };
    var actual = filterJoinSet(query);
    expect(actual).to.eql(expected);
  });

  it('in a bool clause with no type specified for one of the indexes', function () {
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
                  id: 'i2'
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
                indices: ['i2'],
                path: 'id2'
              }
            }
          }
        ]
      }
    };
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            path: 'id2',
            types: ['cafard']
          }
        }
      }
    ];
    var actual = filterJoinSet(query);
    expect(actual).to.eql(expected);
  });

  it('no filter and no types', function () {
    var relations = [
      [ 'i1.id1', 'i2.id2' ]
    ];
    var query = [
      {
        join: {
          focus: 'i1',
          indexes: [
            {
              id: 'i1'
            },
            {
              id: 'i2'
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
            indices: ['i2'],
            path: 'id2'
          }
        }
      }
    ];
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            path: 'id2',
            types: ['cafard']
          }
        }
      }
    ];
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            types: ['cafard'],
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
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            types: ['cafard'],
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
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            types: ['cafard'],
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
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            types: ['cafard'],
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
                            indices: ['i3'],
                            types: ['cafard'],
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
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            types: ['cafard'],
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
            indices: ['i3'],
            types: ['cafard'],
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
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            types: ['cafard'],
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
                            indices: ['i4'],
                            types: ['cafard'],
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
                            indices: ['i5'],
                            types: ['cafard'],
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
              indices: ['i3'],
              types: ['cafard'],
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
                              indices: ['i6'],
                              types: ['cafard'],
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
                              indices: ['i7'],
                              types: ['cafard'],
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
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            path: 'id2',
            types: ['cafard']
          }
        }
      }
    ];
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            path: 'id2',
            types: ['cafard']
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
            indices: ['i0'],
            path: 'id0',
            types: ['cafard']
          }
        }
      }
    ];
    var actual = filterJoinSet(query);
    expect(actual).to.eql(expected);
  });

  describe('Filterjoin with pre-defined join sequence', function () {
    it('joins with filters on leaf', function () {
      var query = [
        {
          join_sequence: {
            focus: 'investment',
            indexes: [ { id: 'investment' }, { id: 'company' } ],
            relations: [
              [ [ 'investment.companyid', 'company.id' ] ],
              [ [ 'investment.companyid', 'company.id' ] ]
            ],
            filters: [
              {
                investment: [
                  {
                    query: {
                      query_string: {
                        query: '360buy'
                      }
                    }
                  }
                ]
              },
              {
              }
            ]
          }
        }
      ];
      var expected = [
        {
          filterjoin: {
            companyid: {
              path: 'id',
              indices: ['company'],
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
                            id: {
                              path: 'companyid',
                              indices: ['investment'],
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
                                            query: '360buy'
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
      var actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('joins with filters on all nodes', function () {
      var query = [
        {
          join_sequence: {
            focus: 'investment',
            indexes: [ { id: 'investment' }, { id: 'company' } ],
            relations: [
              [ [ 'investment.companyid', 'company.id' ] ],
              [ [ 'investment.companyid', 'company.id' ] ]
            ],
            filters: [
              {
                investment: [
                  {
                    query: {
                      query_string: {
                        query: '360buy'
                      }
                    }
                  }
                ]
              },
              {
                company: [
                  {
                    query: {
                      query_string: {
                        query: 'amazon'
                      }
                    }
                  }
                ]
              }
            ]
          }
        }
      ];
      var expected = [
        {
          filterjoin: {
            companyid: {
              path: 'id',
              indices: ['company'],
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
                            query: 'amazon'
                          }
                        }
                      ]
                    }
                  },
                  filter: {
                    bool: {
                      must: [
                        {
                          filterjoin: {
                            id: {
                              path: 'companyid',
                              indices: ['investment'],
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
                                            query: '360buy'
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
      var actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('unsupported configuration', function () {
      var query = [
        {
          join_sequence: {
            focus: 'aaa',
            indexes: [
              {
                id: 'aaa'
              },
              {
                id: 'bbb'
              },
              {
                id: 'ccc'
              },
              {
                id: 'ddd'
              }
            ],
            relations: [
              [ [ 'bbb.id', 'ccc.id' ] ],
              [ [ 'ccc.id', 'ddd.id' ] ],
              [ [ 'aaa.id', 'bbb.id' ] ]
            ]
          }
        }
      ];
      expect(filterJoinSeq).withArgs(query).to.throwError(/expected index/i);
    });
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
            indices: ['i2'],
            path: 'id2',
            types: ['cafard'],
            orderBy: 'doc_score',
            maxTermsPerShard: '10'
          }
        }
      }
    ];
    var actual = filterJoinSet(query);
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
            indices: ['i2'],
            path: 'id2',
            types: ['cafard']
          }
        }
      }
    ];
    var actual = filterJoinSet(query);
    expect(actual).to.eql(expected);
  });
});
