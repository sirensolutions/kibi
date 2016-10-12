const expect = require('expect.js');

describe('FilterJoin querying', function () {

  const server = {
    config: () => ({
      get: () => '.kibi'
    })
  };

  const filterJoinSet = require('../filter_join')(server).set;
  const filterJoinSeq = require('../filter_join')(server).sequence;

  describe('Join Set', function () {

    it('join set loop', function () {
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    {
                      indices: ['i1'],
                      types: ['cafard'],
                      path: 'id1'
                    },
                    {
                      indices: ['i1'],
                      types: ['cafard'],
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
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    {
                      indices: ['i1'],
                      types: ['cafard'],
                      path: 'id1'
                    },
                    {
                      indices: ['i2'],
                      types: ['cafard'],
                      path: 'id2'
                    }
                  ]
                ]
              }
            }
          ]
        }
      };
      const expected = {
        bool: {
          must: [
            {
              filterjoin: {
                id1: {
                  query: {
                    bool: {
                      must: [
                        {
                          match_all: {}
                        }
                      ],
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });


    it('in a bool clause, adv join options', function () {
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    {
                      indices: ['i1'],
                      types: ['cafard'],
                      path: 'id1',
                      termsEncoding: 'long',
                      orderBy: 'doc_score',
                      maxTermsPerShard: 100
                    },
                    {
                      indices: ['i2'],
                      types: ['cafard'],
                      path: 'id2',
                      termsEncoding: 'long',
                      orderBy: 'doc_score',
                      maxTermsPerShard: 100
                    }
                  ]
                ]
              }
            }
          ]
        }
      };
      const expected = {
        bool: {
          must: [
            {
              filterjoin: {
                id1: {
                  query: {
                    bool: {
                      must: [
                        {
                          match_all: {}
                        }
                      ],
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
                  termsEncoding: 'long',
                  orderBy: 'doc_score',
                  maxTermsPerShard: 100
                }
              }
            }
          ]
        }
      };
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('in a bool clause, adv join options maxTermsPerShard should not be passed if === -1', function () {
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    {
                      indices: ['i1'],
                      types: ['cafard'],
                      path: 'id1',
                      termsEncoding: 'long',
                      orderBy: 'doc_score',
                      maxTermsPerShard: -1
                    },
                    {
                      indices: ['i2'],
                      types: ['cafard'],
                      path: 'id2',
                      termsEncoding: 'long',
                      orderBy: 'doc_score',
                      maxTermsPerShard: -1
                    }
                  ]
                ]
              }
            }
          ]
        }
      };
      const expected = {
        bool: {
          must: [
            {
              filterjoin: {
                id1: {
                  query: {
                    bool: {
                      must: [
                        {
                          match_all: {}
                        }
                      ],
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
                  termsEncoding: 'long',
                  orderBy: 'doc_score'
                }
              }
            }
          ]
        }
      };
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('in a bool clause with no type specified for one of the indexes', function () {
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    {
                      indices: ['i1'],
                      types: ['cafard'],
                      path: 'id1'
                    },
                    {
                      indices: ['i2'],
                      path: 'id2'
                    }
                  ]
                ]
              }
            }
          ]
        }
      };
      const expected = {
        bool: {
          must: [
            {
              filterjoin: {
                id1: {
                  query: {
                    bool: {
                      must: [
                        {
                          match_all: {}
                        }
                      ],
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('no filter', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'id1'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                }
              ]
            ]
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            id1: {
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('no filter and no types', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  path: 'id1'
                },
                {
                  indices: ['i2'],
                  path: 'id2'
                }
              ]
            ]
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            id1: {
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('should fail if there are filters on focused index', function () {
      const queries = {
        i1: [
          {
            terms: {
              tag: ['grishka']
            }
          }
        ]
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'id1'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
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
      const queries = {
        i2: [
          {
            terms: {
              tag: ['grishka']
            }
          },
          {
            yo: 'da'
          }
        ]
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'id1'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                }
              ]
            ],
            queries: queries
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            id1: {
              indices: ['i2'],
              types: ['cafard'],
              path: 'id2',
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          terms: {
                            tag: ['grishka']
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('filter on related index', function () {
      const queries = {
        i2: [
          {
            terms: {
              tag: ['grishka']
            }
          }
        ]
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'id1'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                }
              ]
            ],
            queries: queries
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            id1: {
              indices: ['i2'],
              types: ['cafard'],
              path: 'id2',
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          terms: {
                            tag: ['grishka']
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('three related indices - line', function () {
      const queries = {
        i2: [
          {
            terms: {
              tag: ['pluto']
            }
          }
        ],
        i3: [
          {
            terms: {
              tag: ['grishka']
            }
          }
        ]
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'id1'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                },
              ],
              [
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                },
                {
                  indices: ['i3'],
                  types: ['cafard'],
                  path: 'id3'
                }
              ]
            ],
            queries: queries
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            id1: {
              indices: ['i2'],
              types: ['cafard'],
              path: 'id2',
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          terms: {
                            tag: ['pluto']
                          }
                        },
                        {
                          filterjoin: {
                            id2: {
                              indices: ['i3'],
                              types: ['cafard'],
                              path: 'id3',
                              query: {
                                bool: {
                                  must: [
                                    {
                                      match_all: {}
                                    }
                                  ],
                                  filter: {
                                    bool: {
                                      must: [
                                        {
                                          terms: {
                                            tag: ['grishka']
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('three related indices - V', function () {
      const queries = {
        i2: [
          {
            terms: {
              tag: ['pluto']
            }
          }
        ],
        i3: [
          {
            terms: {
              tag: ['grishka']
            }
          }
        ]
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'aaa'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                },
              ],
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'bbb'
                },
                {
                  indices: ['i3'],
                  types: ['cafard'],
                  path: 'id3'
                }
              ]
            ],
            queries: queries
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            aaa: {
              indices: ['i2'],
              types: ['cafard'],
              path: 'id2',
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          terms: {
                            tag: ['pluto']
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
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          terms: {
                            tag: ['grishka']
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('three related indices - spock', function () {
      const queries = {
        i4: [
          {
            terms: {
              tag: ['pluto']
            }
          }
        ],
        i5: [
          {
            terms: {
              tag: ['sylvester']
            }
          }
        ],
        i6: [
          {
            terms: {
              tag: ['mickey']
            }
          }
        ],
        i7: [
          {
            terms: {
              tag: ['donald']
            }
          }
        ]
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'aaa'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                }
              ],
              [
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'a'
                },
                {
                  indices: ['i4'],
                  types: ['cafard'],
                  path: 'id'
                }
              ],
              [
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'b'
                },
                {
                  indices: ['i5'],
                  types: ['cafard'],
                  path: 'id'
                }
              ],
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'bbb'
                },
                {
                  indices: ['i3'],
                  types: ['cafard'],
                  path: 'id3'
                }
              ],
              [
                {
                  indices: ['i6'],
                  types: ['cafard'],
                  path: 'id'
                },
                {
                  indices: ['i3'],
                  types: ['cafard'],
                  path: 'a'
                }
              ],
              [
                {
                  indices: ['i7'],
                  types: ['cafard'],
                  path: 'id'
                },
                {
                  indices: ['i3'],
                  types: ['cafard'],
                  path: 'b'
                }
              ]
            ],
            queries: queries
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            aaa: {
              indices: ['i2'],
              types: ['cafard'],
              path: 'id2',
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
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
                                bool: {
                                  must: [
                                    {
                                      match_all: {}
                                    }
                                  ],
                                  filter: {
                                    bool: {
                                      must: [
                                        {
                                          terms: {
                                            tag: ['pluto']
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
                                bool: {
                                  must: [
                                    {
                                      match_all: {}
                                    }
                                  ],
                                  filter: {
                                    bool: {
                                      must: [
                                        {
                                          terms: {
                                            tag: ['sylvester']
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
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
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
                                bool: {
                                  must: [
                                    {
                                      match_all: {}
                                    }
                                  ],
                                  filter: {
                                    bool: {
                                      must: [
                                        {
                                          terms: {
                                            tag: ['mickey']
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
                                bool: {
                                  must: [
                                    {
                                      match_all: {}
                                    }
                                  ],
                                  filter: {
                                    bool: {
                                      must: [
                                        {
                                          terms: {
                                            tag: ['donald']
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('connected component 1', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'id1'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                }
              ],
              [
                {
                  indices: ['i3'],
                  types: ['cafard'],
                  path: 'id3'
                },
                {
                  indices: ['i4'],
                  types: ['cafard'],
                  path: 'id4'
                }
              ]
            ]
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            id1: {
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('connected component 2', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'id1'
                },
                {
                  indices: ['i2'],
                  types: ['cafard'],
                  path: 'id2'
                }
              ],
              [
                {
                  indices: ['i0'],
                  types: ['cafard'],
                  path: 'id0'
                },
                {
                  indices: ['i1'],
                  types: ['cafard'],
                  path: 'id0'
                }
              ],
              [
                {
                  indices: ['i3'],
                  types: ['cafard'],
                  path: 'id3'
                },
                {
                  indices: ['i4'],
                  types: ['cafard'],
                  path: 'id4'
                }
              ]
            ]
          }
        }
      ];
      const expected = [
        {
          filterjoin: {
            id1: {
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
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
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
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
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

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

      const joinSequence1 = {
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
      const joinSequence2 = {
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

      const query = [{
        query: {
          bool: {
            must: [
              {
                match_all:{}
              }
            ],
            filter: {
              bool: {
                must: [joinSequence1, joinSequence2]
              }
            }
          }
        }
      }];

      const expectedJoin1 = {
        filterjoin: {
          bbb: {
            indices :['A'],
            path : 'aaa',
            query : {
              bool: {
                must: [
                  {
                    match_all: {}
                  }
                ],
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
      const expectedJoin2 = {
        filterjoin: {
          ddd: {
            indices :['C'],
            path : 'ccc',
            query : {
              bool: {
                must: [
                  {
                    match_all: {}
                  }
                ],
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

      const expected = [{
        query: {
          bool: {
            must: [
              {
                match_all:{}
              }
            ],
            filter: {
              bool: {
                must:[expectedJoin1, expectedJoin2]
              }
            }
          }
        }
      }];

      const actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('should consider the position of queries before being replaced by their filterjoin equivalent', function () {
      const query = {
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
      const expected = {
        query: [
          {
            filterjoin: {
              id: {
                query: {
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ],
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
                  bool: {
                    must: [
                      {
                        match_all: {}
                      }
                    ],
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
                      bool: {
                        must: [
                          {
                            match_all: {}
                          }
                        ],
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
      const actual = filterJoinSeq(filterJoinSet(query));
      expect(actual).to.eql(expected);
    });

    it('join_sequence with a join_set', function () {
      const query = [{
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
      const expected = [
        {
          filterjoin: {
            companyid: {
              path: 'id',
              indices: ['company'],
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          filterjoin: {
                            id2: {
                              query: {
                                bool: {
                                  must: [
                                    {
                                      match_all: {}
                                    }
                                  ],
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
      const actual = filterJoinSeq(filterJoinSet(query));
      expect(actual).to.eql(expected);
    });

    it('nested sequence 1', function () {
      const query = [{
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
      const expected = [
        {
          filterjoin: {
            companyid: {
              path: 'id',
              indices: ['company'],
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          filterjoin: {
                            id: {
                              path: 'companyid',
                              indices: ['investment'],
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
                                  ],
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
      const actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('nested sequence 2', function () {
      const query = [{
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
      const expected = [
        {
          filterjoin: {
            bid: {
              path: 'id',
              indices: ['B'],
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
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          filterjoin: {
                            aid: {
                              path: 'id',
                              indices: ['A'],
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
                                  ],
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
                                  ],
                                  filter: {
                                    bool: {
                                      must: [
                                        {
                                          filterjoin: {
                                            id: {
                                              path: 'did',
                                              indices: ['C'],
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
                                                  ],
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
      const actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });
  });

  describe('Filterjoin with pre-defined join sequence', function () {
    it('joins with filters on leaf', function () {
      const query = [{
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
      const expected = [
        {
          filterjoin: {
            companyid: {
              path: 'id',
              indices: ['company'],
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          filterjoin: {
                            id: {
                              path: 'companyid',
                              indices: ['investment'],
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
                                  ],
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
      const actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('negate relation', function () {
      const query = [{
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
      const expected = [
        {
          filterjoin: {
            companyid: {
              path: 'id',
              indices: ['company'],
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    }
                  ],
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
                                bool: {
                                  must: [
                                    {
                                      match_all: {}
                                    }
                                  ],
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
      const actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('joins with two filters', function () {
      const query = [{
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
      const expected = [
        {
          filterjoin: {
            companyid: {
              path: 'id',
              indices: ['company'],
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
                  ],
                  filter: {
                    bool: {
                      must: [
                        {
                          filterjoin: {
                            id: {
                              path: 'companyid',
                              indices: ['investment'],
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
                                  ],
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
      const actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('joins with two filters - the first with no indices', function () {
      const query = [
        {
          join_sequence: [
            {
              relation: [
                {
                  path: 'companyid',
                  indices: [ ],
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
                          query: '*'
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
        }
      ];
      const actual = filterJoinSeq(query);
      expect(actual).to.eql([
        {
          filterjoin: {
            companyid: {
              indices: ['company'],
              path: 'id',
              query: {
                bool: {
                  must: [
                    {
                      match_all: {}
                    },
                    {
                      query_string: {
                        query: '*'
                      }
                    }
                  ],
                  filter: {
                    bool: {
                      must: [{
                        filterjoin: {
                          id: {
                            indices: [ '.kibi' ],
                            path: 'companyid',
                            query: {
                              bool: {
                                must_not: [
                                  {
                                    match_all: {}
                                  }
                                ]
                              }}
                          }
                        }
                      }]
                    }
                  }
                }
              }
            }
          }
        }
      ]);
    });

    it('joins with two filters - the second with no indices', function () {
      const query = [
        {
          join_sequence: [
            {
              relation: [
                {
                  path: 'companyid',
                  indices: [ 'company' ],
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
                  indices: [],
                  queries: [
                    {
                      query: {
                        query_string: {
                          query: '*'
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
        }
      ];
      const actual = filterJoinSeq(query);
      expect(actual).to.eql([
        {
          filterjoin: {
            companyid: {
              indices: ['.kibi'],
              path: 'id',
              query: {
                bool: {
                  must_not: [
                    {
                      match_all: {}
                    }
                  ]
                }
              }
            }
          }
        }
      ]);
    });

    it('loop', function () {
      const query = [{
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
      const expected = [
        {
          filterjoin: {
            there: {
              path: 'here',
              indices: ['aaa'],
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
                  ],
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
      const actual = filterJoinSeq(query);
      expect(actual).to.eql(expected);
    });

    it('joins with empty indices - 1', function () {
      const query = [
        {
          join_sequence: [
            {
              relation: [
                {
                  path: 'ip',
                  indices: [],
                  queries: [
                    {
                      query: {
                        bool: {
                          must: [{
                            query_string: {
                              query: '*'
                            }
                          }]
                        }
                      }
                    }
                  ]
                },
                {
                  indices: ['logstash-2016.10.12', 'logstash-2016.10.11'],
                  path: 'ip'
                }
              ]
            }
          ]
        }
      ];
      const actual = filterJoinSeq(query);
      expect(actual).to.eql([
        {
          filterjoin: {
            ip: {
              indices: [ '.kibi' ],
              path: 'ip',
              query: {
                bool: {
                  must_not: [
                    {
                      match_all: {}
                    }
                  ]
                }
              }
            }
          }
        }
      ]);
    });

    it('joins with filters everywhere', function () {
      const query = [{
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
    const query = [
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
    const expected = [
      {
        filterjoin: {
          id1: {
            query: {
              bool: {
                must: [
                  {
                    match_all: {}
                  }
                ],
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
    const actual = filterJoinSet(query);
    expect(actual).to.eql(expected);
  });

  it('moves the query object to bool.must', function () {
    const query = [
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
    const expected = [
      {
        filterjoin: {
          id1: {
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
                ],
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
    const actual = filterJoinSet(query);
    expect(actual).to.eql(expected);
  });

});
