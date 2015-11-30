var root = require('requirefrom')('');
var filterJoinSet = root('src/server/lib/sindicetech/filterJoin').set;
var filterJoinSeq = root('src/server/lib/sindicetech/filterJoin').sequence;
var expect = require('expect.js');
var Promise = require('bluebird');
var _ = require('lodash');

describe('FilterJoin querying', function () {
  it('join set loop', function () {
    var query = {
      bool: {
        must: [
          {
            join_set: {
              focus: 'i1',
              relations: [
                [
                  {
                    indices: [ 'i1' ],
                    types: [ 'cafard' ],
                    path: 'id1'
                  },
                  {
                    indices: [ 'i1' ],
                    types: [ 'cafard' ],
                    path: 'id2'
                  }
                ]
              ]
            }
          }
        ]
      }
    };
    expect(filterJoinSet).withArgs(query).to.throwError(/loops/i);
  });

  it('in a bool clause', function () {
    var query = {
      bool: {
        must: [
          {
            join_set: {
              focus: 'i1',
              relations: [
                [
                  {
                    indices: [ 'i1' ],
                    types: [ 'cafard' ],
                    path: 'id1'
                  },
                  {
                    indices: [ 'i2' ],
                    types: [ 'cafard' ],
                    path: 'id2'
                  }
                ]
              ]
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
    var query = {
      bool: {
        must: [
          {
            join_set: {
              focus: 'i1',
              relations: [
                [
                  {
                    indices: [ 'i1' ],
                    types: [ 'cafard' ],
                    path: 'id1'
                  },
                  {
                    indices: [ 'i2' ],
                    path: 'id2'
                  }
                ]
              ]
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
    var query = [
      {
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              }
            ]
          ]
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
    var query = [
      {
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                path: 'id2'
              }
            ]
          ]
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

  it('should fail if there are filters on focused index', function () {
    var queries = {
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
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              }
            ]
          ],
          queries: queries
        }
      }
    ];
    expect(filterJoinSet).withArgs(query).to.throwError(/There cannot be filters on the root of the filterjoin/);
  });

  it('focus filter array', function () {
    var queries = {
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
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              }
            ]
          ],
          queries: queries
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
    var queries = {
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
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              }
            ]
          ],
          queries: queries
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

  it('three related indices - line', function () {
    var queries = {
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
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              },
            ],
            [
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              },
              {
                indices: [ 'i3' ],
                types: [ 'cafard' ],
                path: 'id3'
              }
            ]
          ],
          queries: queries
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
                          tag: [ 'pluto' ]
                        }
                      },
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
    var queries = {
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
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'aaa'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              },
            ],
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'bbb'
              },
              {
                indices: [ 'i3' ],
                types: [ 'cafard' ],
                path: 'id3'
              }
            ]
          ],
          queries: queries
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
    var queries = {
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
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'aaa'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              }
            ],
            [
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'a'
              },
              {
                indices: [ 'i4' ],
                types: [ 'cafard' ],
                path: 'id'
              }
            ],
            [
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'b'
              },
              {
                indices: [ 'i5' ],
                types: [ 'cafard' ],
                path: 'id'
              }
            ],
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'bbb'
              },
              {
                indices: [ 'i3' ],
                types: [ 'cafard' ],
                path: 'id3'
              }
            ],
            [
              {
                indices: [ 'i6' ],
                types: [ 'cafard' ],
                path: 'id'
              },
              {
                indices: [ 'i3' ],
                types: [ 'cafard' ],
                path: 'a'
              }
            ],
            [
              {
                indices: [ 'i7' ],
                types: [ 'cafard' ],
                path: 'id'
              },
              {
                indices: [ 'i3' ],
                types: [ 'cafard' ],
                path: 'b'
              }
            ]
          ],
          queries: queries
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
    var query = [
      {
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              }
            ],
            [
              {
                indices: [ 'i3' ],
                types: [ 'cafard' ],
                path: 'id3'
              },
              {
                indices: [ 'i4' ],
                types: [ 'cafard' ],
                path: 'id4'
              }
            ]
          ]
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
    var query = [
      {
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              }
            ],
            [
              {
                indices: [ 'i0' ],
                types: [ 'cafard' ],
                path: 'id0'
              },
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id0'
              }
            ],
            [
              {
                indices: [ 'i3' ],
                types: [ 'cafard' ],
                path: 'id3'
              },
              {
                indices: [ 'i4' ],
                types: [ 'cafard' ],
                path: 'id4'
              }
            ]
          ]
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

  describe('Filterjoin with nested join sequence', function () {
    describe('Error handling', function () {
      it('should fail on the sequence not being an array', function () {
        expect(filterJoinSeq).withArgs([ { join_sequence: 123 } ]).to.throwError(/unexpected value/i);
        expect(filterJoinSeq).withArgs([ { join_sequence: {} } ]).to.throwError(/must be an array/i);
      });

      it('should fail on empty sequence', function () {
        expect(filterJoinSeq).withArgs([ { join_sequence: [] } ]).to.throwError(/specify the join sequence/i);
      });

      it('should fail on incorrect nested sequence', function () {
        expect(filterJoinSeq).withArgs([ { join_sequence: [ { group: [] } ] } ]).to.throwError(/missing elements/i);
        // recurse on the nested sequence
        expect(filterJoinSeq).withArgs([ { join_sequence: [ { group: [ 1, 2 ] }, { relation: [ 1, 2 ] } ] } ])
        .to.throwError(/The join sequence must be an array. Got: 1/i);
      });

      it('should fail on incorrect dashboard element', function () {
        expect(filterJoinSeq).withArgs([ { join_sequence: [ { relation: [ {}, {} ] } ] } ]).to.throwError(/join path is required/i);
        expect(filterJoinSeq).withArgs([ { join_sequence: [ { relation: [ { path: 'bbb' } ] } ] } ])
        .to.throwError(/pair of dashboards/i);
        expect(filterJoinSeq).withArgs([ { join_sequence: [ { relation: [ { path: 'bbb' }, { path: 'aaa', queries: [] } ] } ] } ])
        .to.throwError(/already set/i);
        expect(filterJoinSeq).withArgs([ { join_sequence: [ { relation: [ { path: 'bbb', dog: 'bbb' }, { path: 'aaa' } ] } ] } ])
        .to.throwError(/unknown field \[dog\]/i);
      });
    });

    it('2 join sequences', function () {

      var joinSequence1 = {
        join_sequence: [
          {
            relation: [
              {
                path: 'aaa',
                indices: [ 'A' ]
              },
              {
                path: 'bbb',
                indices: [ 'B' ]
              }
            ]
          }
        ]
      };
      var joinSequence2 = {
        join_sequence: [
          {
            relation: [
              {
                path: 'ccc',
                indices: [ 'C' ]
              },
              {
                path: 'ddd',
                indices: [ 'D' ]
              }
            ]
          }
        ]
      };

      var query = [{
        query: {
          filtered: {
            query: {
              match_all:{}
            },
            filter: {
              bool: {
                must: [joinSequence1, joinSequence2]
              }
            }
          }
        }
      }];

      var expectedJoin1 = {
        filterjoin: {
          bbb: {
            indices :['A'],
            path : 'aaa',
            query : {
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
            }
          }
        }
      };
      var expectedJoin2 = {
        filterjoin: {
          ddd: {
            indices :['C'],
            path : 'ccc',
            query : {
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
            }
          }
        }
      };

      var expected = [{
        query: {
          filtered: {
            query: {
              match_all:{}
            },
            filter: {
              bool: {
                must:[expectedJoin1, expectedJoin2]
              }
            }
          }
        }
      }];

      var actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('should consider the position of queries before being replaced by their filterjoin equivalent', function () {
      var query = {
        query: [
          {
            join_set: {
              focus: 'company',
              relations: [
                [
                  {
                    indices: [
                      'company'
                    ],
                    path: 'id'
                  },
                  {
                    indices: [
                      'investment'
                    ],
                    path: 'companyid'
                  }
                ],
                [
                  {
                    indices: [
                      'article'
                    ],
                    path: 'companyid'
                  },
                  {
                    indices: [
                      'company'
                    ],
                    path: 'id'
                  }
                ]
              ]
            }
          },
          {
            other: {
              join_set: {
                focus: 'article',
                relations: [
                  [
                    {
                      indices: [
                        'article'
                      ],
                      path: 'companyid'
                    },
                    {
                      indices: [
                        'company'
                      ],
                      path: 'id'
                    }
                  ]
                ]
              }
            }
          }
        ]
      };
      var expected = {
        query: [
          {
            filterjoin: {
              id: {
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
                indices: ['investment'],
                path: 'companyid'
              }
            }
          },
          {
            filterjoin: {
              id: {
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
                indices: ['article'],
                path: 'companyid'
              }
            }
          },
          {
            other: [
              {
                filterjoin: {
                  companyid: {
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
                    indices: ['company'],
                    path: 'id'
                  }
                }
              }
            ]
          }
        ]
      };
      var actual = filterJoinSeq(filterJoinSet(query));
      expect(actual).to.eql(expected);
    });

    it('join_sequence with a join_set', function () {
      var query = [{
        join_sequence: [
          {
            relation: [
              {
                path: 'id',
                indices: [ 'company' ],
                queries: [
                  {
                    join_set: {
                      focus: 'i1',
                      relations: [
                        [
                          {
                            indices: [ 'i1' ],
                            path: 'id2'
                          },
                          {
                            indices: [ 'i2' ],
                            path: 'id'
                          }
                        ]
                      ]
                    }
                  }
                ]
              },
              {
                path: 'companyid',
                indices: [ 'investment' ]
              }
            ]
          }
        ]
      }];
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
                            id2: {
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
                              path: 'id'
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
      var actual = filterJoinSeq(filterJoinSet(query));
      expect(actual).to.eql(expected);
    });

    it('nested sequence 1', function () {
      var query = [{
        join_sequence: [
          {
            group: [
              [
                {
                  relation: [
                    {
                      path: 'companyid',
                      indices: [ 'investment' ],
                      queries: [
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
                      path: 'id',
                      indices: [ 'company' ]
                    }
                  ]
                }
              ]
            ]
          },
          {
            relation: [
              {
                path: 'id',
                indices: [ 'company' ]
              },
              {
                path: 'companyid',
                indices: [ 'investment' ]
              }
            ]
          }
        ]
      }];
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

    it('nested sequence 2', function () {
      var query = [{
        join_sequence: [
          {
            group: [
              [
                {
                  relation: [
                    {
                      path: 'id',
                      indices: [ 'A' ],
                      queries: [
                        {
                          query: {
                            query_string: {
                              query: 'aaa'
                            }
                          }
                        }
                      ]
                    },
                    {
                      path: 'aid',
                      indices: [ 'B' ]
                    }
                  ]
                }
              ],
              [
                {
                  relation: [
                    {
                      path: 'did',
                      indices: [ 'C' ],
                      queries: [
                        {
                          query: {
                            query_string: {
                              query: 'ccc'
                            }
                          }
                        }
                      ]
                    },
                    {
                      path: 'id',
                      indices: [ 'D' ]
                    }
                  ]
                },
                {
                  relation: [
                    {
                      path: 'id',
                      indices: [ 'D' ],
                      queries: [
                        {
                          query: {
                            query_string: {
                              query: 'ddd'
                            }
                          }
                        }
                      ]
                    },
                    {
                      path: 'did',
                      indices: [ 'B' ]
                    }
                  ]
                }
              ]
            ]
          },
          {
            relation: [
              {
                path: 'id',
                indices: [ 'B' ],
                queries: [
                  {
                    query: {
                      query_string: {
                        query: 'bbb'
                      }
                    }
                  }
                ]
              },
              {
                path: 'bid',
                indices: [ 'A' ]
              }
            ]
          }
        ]
      }];
      var expected = [
        {
          filterjoin: {
            bid: {
              path: 'id',
              indices: ['B'],
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
                            query: 'bbb'
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
                            aid: {
                              path: 'id',
                              indices: ['A'],
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
                                            query: 'aaa'
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
                        },
                        {
                          filterjoin: {
                            did: {
                              path: 'id',
                              indices: ['D'],
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
                                            query: 'ddd'
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
                                              path: 'did',
                                              indices: ['C'],
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
                                                            query: 'ccc'
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
  });

  describe('Filterjoin with pre-defined join sequence', function () {
    it('joins with filters on leaf', function () {
      var query = [{
        join_sequence: [
          {
            relation: [
              {
                path: 'companyid',
                indices: [ 'investment' ],
                queries: [
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
                path: 'id',
                indices: [ 'company' ]
              }
            ]
          },
          {
            relation: [
              {
                path: 'id',
                indices: [ 'company' ]
              },
              {
                path: 'companyid',
                indices: [ 'investment' ]
              }
            ]
          }
        ]
      }];
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

    it('negate relation', function () {
      var query = [{
        join_sequence: [
          {
            relation: [
              {
                path: 'companyid',
                indices: [ 'investment' ]
              },
              {
                path: 'id',
                indices: [ 'company' ]
              }
            ],
            negate: true
          },
          {
            relation: [
              {
                path: 'id',
                indices: [ 'company' ]
              },
              {
                path: 'companyid',
                indices: [ 'investment' ]
              }
            ]
          }
        ]
      }];
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
                      must: [],
                      must_not: [
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

    it('joins with two filters', function () {
      var query = [{
        join_sequence: [
          {
            relation: [
              {
                path: 'companyid',
                indices: [ 'investment' ],
                queries: [
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
                path: 'id',
                indices: [ 'company' ]
              }
            ]
          },
          {
            relation: [
              {
                path: 'id',
                indices: [ 'company' ],
                queries: [
                  {
                    query: {
                      query_string: {
                        query: 'yoplait'
                      }
                    }
                  }
                ]
              },
              {
                path: 'companyid',
                indices: [ 'investment' ]
              }
            ]
          }
        ]
      }];
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
                            query: 'yoplait'
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

    it('loop', function () {
      var query = [{
        join_sequence: [
          {
            relation: [
              {
                path: 'here',
                indices: [ 'aaa' ],
                queries: [
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
                path: 'there',
                indices: [ 'aaa' ]
              }
            ]
          }
        ]
      }];
      var expected = [
        {
          filterjoin: {
            there: {
              path: 'here',
              indices: ['aaa'],
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
      ];
      var actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('joins with filters everywhere', function () {
      var query = [{
        join_sequence: [
          {
            path: 'id',
            indices: [ 'company' ],
            queries: [
              {
                query: {
                  query_string: {
                    query: 'yoplait'
                  }
                }
              }
            ]
          },
          {
            path: 'companyid',
            indices: [ 'investment' ],
            queries: [
              {
                query: {
                  query_string: {
                    query: 'boom'
                  }
                }
              }
            ]
          }
        ]
      }];
      expect(filterJoinSeq).withArgs(query).to.throwError();
    });
  });

  it('accepts orderby and maxtermspershard parameters', function () {
    var query = [
      {
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2',
                orderBy: 'doc_score',
                maxTermsPerShard: '10'
              }
            ]
          ]
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
    var query = [
      {
        join_set: {
          focus: 'i1',
          relations: [
            [
              {
                indices: [ 'i1' ],
                types: [ 'cafard' ],
                path: 'id1'
              },
              {
                indices: [ 'i2' ],
                types: [ 'cafard' ],
                path: 'id2'
              }
            ]
          ],
          queries: {
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
