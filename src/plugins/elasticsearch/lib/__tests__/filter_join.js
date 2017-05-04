const expect = require('expect.js');
const _ = require('lodash');
const FilterJoinBuilder = require('./filterjoin_query_builder');

describe('FilterJoin querying', function () {

  const server = {
    config: () => ({
      get: () => '.kibi'
    })
  };

  const filterJoinSet = require('../filter_join')(server).set;
  const filterJoinSeq = require('../filter_join')(server).sequence;

  describe('Join Set', function () {
    describe('time-based indices', function () {
      it('should use the pattern field to drive the graph traversal', function () {
        const query = {
          join_set: {
            focus: 'forecast',
            relations: [
              [
                { pattern: 'weather-*', indices: [ 'weather-2015-01', 'weather-2015-02' ], types: [ 'type' ], path: 'id' },
                { pattern: 'activity-*', indices: [ 'activity-2015-01', 'activity-2015-02' ], types: [ 'type' ], path: 'id' }
              ],
              [
                { pattern: 'weather-*', indices: [ 'weather-2015-01', 'weather-2015-02' ], types: [ 'type' ], path: 'id' },
                { pattern: 'forecast', indices: [ 'forecast' ], types: [ 'type' ], path: 'id' }
              ]
            ]
          }
        };
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourceTypes: 'type',
          sourcePath: 'id',
          targetIndices: [ 'weather-2015-01', 'weather-2015-02' ],
          targetTypes: 'type',
          targetPath: 'id'
        })
        .addFilterJoin({
          sourceTypes: 'type',
          sourcePath: 'id',
          targetIndices: [ 'activity-2015-01', 'activity-2015-02' ],
          targetTypes: 'type',
          targetPath: 'id'
        });
        const expected = builder.toObject();
        const actual = filterJoinSet([ query ]);
        expect(actual).to.eql(expected);
      });

      it('should generate the expected query when no indices have been resolved - 1', function () {
        const query = {
          join_set: {
            focus: 'forecast',
            relations: [
              [
                { pattern: 'weather-*', indices: [], types: [ 'type' ], path: 'id' },
                { pattern: 'activity-*', indices: [ 'activity-2015-01', 'activity-2015-02' ], types: [ 'type' ], path: 'id' }
              ],
              [
                { pattern: 'weather-*', indices: [], types: [ 'type' ], path: 'id' },
                { pattern: 'forecast', indices: [ 'forecast' ], types: [ 'type' ], path: 'id' }
              ]
            ]
          }
        };
        const actual = filterJoinSet([ query ]);
        expect(actual).to.eql([
          {
            bool: {
              must: [
                {
                  filterjoin: {
                    id: {
                      indices: [
                        '.kibi'
                      ],
                      types: [
                        'type'
                      ],
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
                },
                {
                  type: {
                    value: 'type'
                  }
                }
              ]
            }
          }
        ]);
      });

      it('should generate the expected query when no indices have been resolved - 2', function () {
        const query = {
          join_set: {
            focus: 'forecast',
            relations: [
              [
                { pattern: 'weather-*', indices: [ 'weather-2015-01', 'weather-2015-02' ], types: [ 'type' ], path: 'id' },
                { pattern: 'activity-*', indices: [ ], types: [ 'type' ], path: 'id' }
              ],
              [
                { pattern: 'weather-*', indices: [ 'weather-2015-01', 'weather-2015-02' ], types: [ 'type' ], path: 'id' },
                { pattern: 'forecast', indices: [ 'forecast' ], types: [ 'type' ], path: 'id' }
              ]
            ]
          }
        };
        const actual = filterJoinSet([ query ]);
        expect(actual).to.eql([
          {
            bool: {
              must: [
                {
                  filterjoin: {
                    id: {
                      indices: [
                        'weather-2015-01',
                        'weather-2015-02'
                      ],
                      types: ['type'],
                      path: 'id',
                      query: {
                        bool: {
                          must: [{
                            match_all: {}
                          }],
                          filter: {
                            bool: {
                              must: [
                                {
                                  bool: {
                                    must: [
                                      {
                                        filterjoin: {
                                          id: {
                                            indices: ['.kibi'],
                                            path: 'id',
                                            types: ['type'],
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
                                      },
                                      {
                                        type: {
                                          value: 'type'
                                        }
                                      }
                                    ]
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
                  type: {
                    value: 'type'
                  }
                }
              ]
            }
          }
        ]);
      });

    });

    describe('Multi-edge', function () {
      it('should add two branches at the root', function () {
        const query = {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't12' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't22' ], path: 'id2' }
              ],
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ]
            ]
          }
        };
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't22',
          targetPath: 'id2'
        });
        builder.addFilterJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't2',
          targetPath: 'id2'
        });
        const expected = builder.toObject();
        const actual = filterJoinSet([ query ]);
        expect(actual).to.eql(expected);
      });

      it('should add two branches at the leaf', function () {
        const query = {
          join_set: {
            focus: 'i0',
            relations: [
              [
                { pattern: 'i0', indices: [ 'i0' ], types: [ 't0' ], path: 'id0' },
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't1' ], path: 'id1' }
              ],
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't12' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't22' ], path: 'id2' }
              ],
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ]
            ]
          }
        };
        const builder = new FilterJoinBuilder();
        const fj0 = builder.addFilterJoin({
          sourceTypes: 't0',
          sourcePath: 'id0',
          targetIndices: [ 'i1' ],
          targetTypes: 't1',
          targetPath: 'id1'
        });
        fj0.addFilterJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't22',
          targetPath: 'id2'
        });
        fj0.addFilterJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't2',
          targetPath: 'id2'
        });
        const expected = builder.toObject();
        const actual = filterJoinSet([ query ]);
        expect(actual).to.eql(expected);
      });

      it('should fully expand the graph 1', function () {
        const query = {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't12' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't22' ], path: 'id2' }
              ],
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ],
              [
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't2' ], path: 'id2' },
                { pattern: 'i3', indices: [ 'i3' ], types: [ 't3' ], path: 'id3' }
              ]
            ]
          }
        };
        const builder = new FilterJoinBuilder();
        const fj0 = builder.addFilterJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't22',
          targetPath: 'id2'
        });
        fj0.addFilterJoin({ sourceTypes: 't2', sourcePath: 'id2', targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });
        const fj1 = builder.addFilterJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't2',
          targetPath: 'id2'
        });
        fj1.addFilterJoin({ sourceTypes: 't2', sourcePath: 'id2', targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });

        const expected = builder.toObject();
        const actual = filterJoinSet([ query ]);
        expect(actual).to.eql(expected);
      });

      it('should fully expand the graph 2', function () {
        const query = {
          join_set: {
            focus: 'i1',
            relations: [
              // multiedge 1
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ],
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't22' ], path: 'id22' }
              ],

              // multiedge 2
              [
                { pattern: 'i3', indices: [ 'i3' ], types: [ 't3' ], path: 'id3' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ],
              [
                { pattern: 'i3', indices: [ 'i3' ], types: [ 't3' ], path: 'id3' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't22' ], path: 'id22' }
              ],

              // single edge 1
              [
                { pattern: 'i4', indices: [ 'i4' ], types: [ 't4' ], path: 'id4' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 't22' ], path: 'id22' }
              ],

              // single edge 2
              [
                { pattern: 'i4', indices: [ 'i4' ], types: [ 't4' ], path: 'id4' },
                { pattern: 'i3', indices: [ 'i3' ], types: [ 't3' ], path: 'id3' }
              ]
            ]
          }
        };
        const b = new FilterJoinBuilder();

        // multiedge 1
        const fj0 = b.addFilterJoin({ sourceTypes: 't1', sourcePath: 'id1',
                                    targetIndices: [ 'i2' ], targetTypes: 't2', targetPath: 'id2' });
        const fj1 = b.addFilterJoin({ sourceTypes: 't1', sourcePath: 'id1',
                                    targetIndices: [ 'i2' ], targetTypes: 't22', targetPath: 'id22' });

        // multiedge 2
        const fj00 = fj0.addFilterJoin({ sourceTypes: 't2', sourcePath: 'id2',
                                       targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });
        const fj01 = fj0.addFilterJoin({ sourceTypes: 't22', sourcePath: 'id22',
                                       targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });
        const fj10 = fj1.addFilterJoin({ sourceTypes: 't2', sourcePath: 'id2',
                                       targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });
        const fj11 = fj1.addFilterJoin({ sourceTypes: 't22', sourcePath: 'id22',
                                       targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });

        _.each([ fj00, fj01, fj10, fj11 ], (edge) => {
          // single edge 2
          const child = edge.addFilterJoin({
            sourceTypes: 't3',
            sourcePath: 'id3',
            targetIndices: [ 'i4' ],
            targetTypes: 't4',
            targetPath: 'id4'
          });
          // single edge 1
          child.addFilterJoin({ sourceTypes: 't4', sourcePath: 'id4', targetIndices: [ 'i2' ], targetTypes: 't22', targetPath: 'id22' });
        });

        const expected = b.toObject();
        const actual = filterJoinSet([ query ]);
        expect(actual).to.eql(expected);
      });
    });

    it('should consider the position of queries before being replaced by their filterjoin equivalent', function () {
      const query = {
        query: [
          {
            join_set: {
              focus: 'company',
              relations: [
                [
                  { pattern: 'company', indices: [ 'company' ], path: 'id' },
                  { pattern: 'investment', indices: [ 'investment' ], path: 'companyid' }
                ],
                [
                  { pattern: 'article', indices: [ 'article' ], path: 'companyid' },
                  { pattern: 'company', indices: [ 'company' ], path: 'id' }
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
                    { pattern: 'article', indices: [ 'article' ], path: 'companyid' },
                    { pattern: 'company', indices: [ 'company' ], path: 'id' }
                  ]
                ]
              }
            }
          }
        ]
      };
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'id',
        targetIndices: [ 'investment' ],
        targetPath: 'companyid'
      });
      builder.addFilterJoin({
        sourcePath: 'id',
        targetIndices: [ 'article' ],
        targetPath: 'companyid'
      });
      const query1 = builder.toObject();

      builder.clear();
      builder.addFilterJoin({
        sourcePath: 'companyid',
        targetIndices: [ 'company' ],
        targetPath: 'id'
      });
      const query2 = builder.toObject();

      const expected = {
        query: [
          ...query1,
          {
            other: query2
          }
        ]
      };
      const actual = filterJoinSeq(filterJoinSet(query));
      expect(actual).to.eql(expected);
    });

    it('join set loop', function () {
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                    { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id2' }
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
                    { pattern: 'i1', indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                    { pattern: 'i2', indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
                  ]
                ]
              }
            }
          ]
        }
      };
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 't1',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 't2',
        targetPath: 'id2'
      });
      const expected = {
        bool: {
          must: builder.toObject()
        }
      };
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('should keep all the types specified', function () {
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    { pattern: 'i1', indices: [ 'i1' ], types: [ 't1', 't12' ], path: 'id1' },
                    { pattern: 'i2', indices: [ 'i2' ], types: [ 't2', 't22' ], path: 'id2' }
                  ]
                ]
              }
            }
          ]
        }
      };
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: [ 't1', 't12' ],
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: [ 't2', 't22' ],
        targetPath: 'id2'
      });
      const expected = {
        bool: {
          must: builder.toObject()
        }
      };
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('in a bool clause, advanced join options', function () {
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    {
                      pattern: 'i1',
                      indices: [ 'i1' ],
                      types: [ 'cafard' ],
                      path: 'id1',
                      termsEncoding: 'long',
                      orderBy: 'doc_score',
                      maxTermsPerShard: 10
                    },
                    {
                      pattern: 'i2',
                      indices: [ 'i2' ],
                      types: [ 'cafard' ],
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
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2',
        termsEncoding: 'long',
        orderBy: 'doc_score',
        maxTermsPerShard: 100
      });
      const expected = {
        bool: {
          must: builder.toObject()
        }
      };
      const actual = filterJoinSet(query);
      expect(actual).to.eql(expected);
    });

    it('in a bool clause, advanced join options maxTermsPerShard should not be passed if === -1', function () {
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    {
                      pattern: 'i1',
                      indices: [ 'i1' ],
                      types: [ 'cafard' ],
                      path: 'id1',
                      termsEncoding: 'long',
                      orderBy: 'doc_score',
                      maxTermsPerShard: 100
                    },
                    {
                      pattern: 'i2',
                      indices: [ 'i2' ],
                      types: [ 'cafard' ],
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
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2',
        termsEncoding: 'long',
        orderBy: 'doc_score'
      });
      const expected = {
        bool: {
          must: builder.toObject()
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
                    { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                    { pattern: 'i2', indices: [ 'i2' ], path: 'id2' } ]
                ]
              }
            }
          ]
        }
      };
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetPath: 'id2'
      });
      const expected = {
        bool: {
          must: builder.toObject()
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
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ]
            ]
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('no filter and no types', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], path: 'id2' }
              ]
            ]
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetPath: 'id2'
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('should allow filters on focused index', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ]
            ],
            queries: {
              i1: {
                dashboard1: [
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
      ];
      const builder = new FilterJoinBuilder();
      builder.addQuery({
        terms: {
          tag: [ 'grishka' ]
        }
      });
      builder.addFilterJoin({
        sourcePath: 'id1',
        sourceTypes: 'cafard',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('focus filter array', function () {
      const queries = {
        i2: {
          dashboard1: [
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
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ]
            ],
            queries: queries
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      })
      .addQuery({
        terms: {
          tag: [ 'grishka' ]
        }
      })
      .addQuery({
        yo: 'da'
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('filter on related index', function () {
      const queries = {
        i2: {
          dashboard1: [
            {
              terms: {
                tag: [ 'grishka' ]
              }
            }
          ]
        }
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ]
            ],
            queries: queries
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      })
      .addQuery({
        terms: {
          tag: [ 'grishka' ]
        }
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('three related indices - line', function () {
      const queries = {
        i2: {
          dashboard1: [
            {
              terms: {
                tag: [ 'pluto' ]
              }
            }
          ],
        },
        i3: {
          dashboard1: [
            {
              terms: {
                tag: [ 'grishka' ]
              }
            }
          ]
        }
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' },
              ],
              [
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' },
                { pattern: 'i3', indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' }
              ]
            ],
            queries: queries
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      })
      .addQuery({
        terms: {
          tag: [ 'pluto' ]
        }
      })
      .addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id2',
        targetIndices: [ 'i3' ],
        targetTypes: 'cafard',
        targetPath: 'id3'
      })
      .addQuery({
        terms: {
          tag: [ 'grishka' ]
        }
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('three related indices - V', function () {
      const queries = {
        i2: {
          dashboard1: [
            {
              terms: {
                tag: [ 'pluto' ]
              }
            }
          ],
        },
        i3: {
          dashboard1: [
            {
              terms: {
                tag: [ 'grishka' ]
              }
            }
          ]
        }
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'aaa' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' },
              ],
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'bbb' },
                { pattern: 'i3', indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' }
              ]
            ],
            queries: queries
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'aaa',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      })
      .addQuery({
        terms: {
          tag: [ 'pluto' ]
        }
      });
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'bbb',
        targetIndices: [ 'i3' ],
        targetTypes: 'cafard',
        targetPath: 'id3'
      })
      .addQuery({
        terms: {
          tag: [ 'grishka' ]
        }
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('three related indices - spock', function () {
      const queries = {
        i4: {
          dashboard1: [
            {
              terms: {
                tag: [ 'pluto' ]
              }
            }
          ],
        },
        i5: {
          dashboard1: [
            {
              terms: {
                tag: [ 'sylvester' ]
              }
            }
          ],
        },
        i6: {
          dashboard1: [
            {
              terms: {
                tag: [ 'mickey' ]
              }
            }
          ],
        },
        i7: {
          dashboard1: [
            {
              terms: {
                tag: [ 'donald' ]
              }
            }
          ]
        }
      };
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'aaa' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ],
              [
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'a' },
                { pattern: 'i4', indices: [ 'i4' ], types: [ 'cafard' ], path: 'id' }
              ],
              [
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'b' },
                { pattern: 'i5', indices: [ 'i5' ], types: [ 'cafard' ], path: 'id' }
              ],
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'bbb' },
                { pattern: 'i3', indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' }
              ],
              [
                { pattern: 'i6', indices: [ 'i6' ], types: [ 'cafard' ], path: 'id' },
                { pattern: 'i3', indices: [ 'i3' ], types: [ 'cafard' ], path: 'a' }
              ],
              [
                { pattern: 'i7', indices: [ 'i7' ], types: [ 'cafard' ], path: 'id' },
                { pattern: 'i3', indices: [ 'i3' ], types: [ 'cafard' ], path: 'b' }
              ]
            ],
            queries: queries
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      const fj1 = builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'aaa',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      fj1.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'a',
        targetIndices: [ 'i4' ],
        targetTypes: 'cafard',
        targetPath: 'id'
      })
      .addQuery({
        terms: {
          tag: [ 'pluto' ]
        }
      });
      fj1.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'b',
        targetIndices: [ 'i5' ],
        targetTypes: 'cafard',
        targetPath: 'id'
      })
      .addQuery({
        terms: {
          tag: [ 'sylvester' ]
        }
      });
      const fj2 = builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'bbb',
        targetIndices: [ 'i3' ],
        targetTypes: 'cafard',
        targetPath: 'id3'
      });
      fj2.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'a',
        targetIndices: [ 'i6' ],
        targetTypes: 'cafard',
        targetPath: 'id'
      })
      .addQuery({
        terms: {
          tag: [ 'mickey' ]
        }
      });
      fj2.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'b',
        targetIndices: [ 'i7' ],
        targetTypes: 'cafard',
        targetPath: 'id'
      })
      .addQuery({
        terms: {
          tag: [ 'donald' ]
        }
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('connected component 1', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ],
              [
                { pattern: 'i3', indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' },
                { pattern: 'i4', indices: [ 'i4' ], types: [ 'cafard' ], path: 'id4' }
              ]
            ]
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('connected component 2', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ],
              [
                { pattern: 'i0', indices: [ 'i0' ], types: [ 'cafard' ], path: 'id0' },
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id0' }
              ],
              [
                { pattern: 'i3', indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' },
                { pattern: 'i4', indices: [ 'i4' ], types: [ 'cafard' ], path: 'id4' }
              ]
            ]
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id0',
        targetIndices: [ 'i0' ],
        targetTypes: 'cafard',
        targetPath: 'id0'
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('accepts orderBy and maxTermsPerShard parameters', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                {
                  pattern: 'i2',
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
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2',
        orderBy: 'doc_score',
        maxTermsPerShard: '10'
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('moves the query object to bool.must', function () {
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { pattern: 'i1', indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { pattern: 'i2', indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ]
            ],
            queries: {
              i2: {
                dashboard1: [
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
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      })
      .addQuery({
        query: {
          query_string: {
            analyze_wildcard: true,
            query: 'travel'
          }
        }
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });
  });

  describe('Join Sequence', function () {

    it('multiple join sequences in a must_not', function () {
      const query = [
        {
          query: {
            bool: {
              must: [
                {
                  match_all: {}
                }
              ],
              filter: {
                bool: {
                  must_not: [
                    {
                      join_sequence: [
                        {
                          relation: [
                            {pattern: 'A', path: 'aaa', indices: ['A']},
                            {pattern: 'B', path: 'bbb', indices: ['B'], types: ['A']}
                          ]
                        }
                      ]
                    },
                    {
                      join_sequence: [
                        {
                          relation: [
                            {pattern: 'C', path: 'ccc', indices: ['C']},
                            {pattern: 'D', path: 'ddd', indices: ['D']}
                          ]
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'bbb',
        sourceTypes: ['A'],
        targetIndices: [ 'A' ],
        targetPath: 'aaa'
      });
      builder.addFilterJoin({
        sourcePath: 'ddd',
        targetIndices: [ 'C' ],
        targetPath: 'ccc'
      });

      const expected = [
        {
          query: {
            bool: {
              must: [{
                match_all:{}
              }],
              filter: {
                bool: {
                  must_not: builder.toObject()
                }
              }
            }
          }
        }
      ];

      const actual = filterJoinSeq(query);
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
          expect(filterJoinSeq).withArgs([
            {
              join_sequence: [
                {
                  relation: [ {}, {} ]
                }
              ]
            }
          ]).to.throwError(/path is required/i);

          expect(filterJoinSeq).withArgs([
            {
              join_sequence: [
                {
                  relation: [ { path: 'aaa' }, { path: 'bbb' } ]
                }
              ]
            }
          ]).to.throwError(/pattern is required/i);

          expect(filterJoinSeq).withArgs([
            {
              join_sequence: [
                {
                  relation: [
                    { pattern: 'ib', path: 'bbb' }
                  ]
                }
              ]
            }
          ])
          .to.throwError(/pair of dashboards/i);

          expect(filterJoinSeq).withArgs([
            {
              join_sequence: [
                {
                  relation: [
                    { pattern: 'ib', path: 'bbb' },
                    { pattern: 'ia', path: 'aaa', queries: [] }
                  ]
                }
              ]
            }
          ])
          .to.throwError(/already set/i);

          expect(filterJoinSeq).withArgs([
            {
              join_sequence: [
                {
                  relation: [
                    { pattern: 'ib', path: 'bbb', dog: 'bbb' },
                    { pattern: 'ia', path: 'aaa' }
                  ]
                }
              ]
            }
          ])
          .to.throwError(/unknown field \[dog\]/i);
        });
      });

      it('negated nested join filter', function () {
        const query = [
          {
            join_sequence: [
              {
                group: [
                  [
                    {
                      relation: [
                        { indices: [ 'bbb' ], path: 'path1', pattern: 'bbb' },
                        { indices: [ 'aaa' ], path: 'id', pattern: 'aaa' }
                      ],
                      negate: true
                    }
                  ],
                  [
                    {
                      relation: [
                        { indices: [ 'bbb' ], path: 'path2', pattern: 'bbb' },
                        { indices: [ 'aaa' ], path: 'id', pattern: 'aaa' }
                      ]
                    }
                  ]
                ]
              },
              {
                relation: [
                  { pattern: 'aaa', path: 'id', indices: [ 'aaa' ] },
                  { pattern: 'ccc', path: 'path3', indices: [ 'ccc' ] }
                ]
              }
            ]
          }
        ];

        const builder = new FilterJoinBuilder();
        const fj = builder.addFilterJoin({ sourcePath: 'path3', targetIndices: [ 'aaa' ], targetPath: 'id' });
        fj.addFilterJoin({ negate: true, sourcePath: 'id', targetIndices: [ 'bbb' ], targetPath: 'path1' });
        fj.addFilterJoin({ sourcePath: 'id', targetIndices: [ 'bbb' ], targetPath: 'path2' });

        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('negated nested join filter with types', function () {
        const query = [
          {
            join_sequence: [
              {
                group: [
                  [
                    {
                      relation: [
                        { indices: [ 'bbb' ], path: 'path1', pattern: 'bbb', types: [ 'B' ] },
                        { indices: [ 'aaa' ], path: 'id', pattern: 'aaa', types: [ 'A' ] }
                      ],
                      negate: true
                    }
                  ],
                  [
                    {
                      relation: [
                        { indices: [ 'bbb' ], path: 'path2', pattern: 'bbb' },
                        { indices: [ 'aaa' ], path: 'id', pattern: 'aaa' }
                      ]
                    }
                  ]
                ]
              },
              {
                relation: [
                  { pattern: 'aaa', path: 'id', indices: [ 'aaa' ] },
                  { pattern: 'ccc', path: 'path3', indices: [ 'ccc' ] }
                ]
              }
            ]
          }
        ];

        const builder = new FilterJoinBuilder();
        const fj = builder.addFilterJoin({ sourcePath: 'path3', targetIndices: [ 'aaa' ], targetPath: 'id' });
        fj.addFilterJoin({
          negate: true,
          sourceTypes: [ 'A' ],
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path1',
          targetTypes: [ 'B' ]
        });
        fj.addFilterJoin({
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path2'
        });

        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('multiple nested negated join sequences', function () {
        const query = [
          {
            join_sequence: [
              {
                group: [
                  [
                    {
                      relation: [
                        { indices: [ 'bbb' ], path: 'path1', pattern: 'bbb', types: [ 'B' ] },
                        { indices: [ 'aaa' ], path: 'id', pattern: 'aaa' }
                      ],
                      negate: true
                    }
                  ],
                  [
                    {
                      relation: [
                        { indices: [ 'bbb' ], path: 'path1', pattern: 'bbb', types: [ 'B' ] },
                        { indices: [ 'aaa' ], path: 'id', pattern: 'aaa', types: [ 'A' ] }
                      ],
                      negate: true
                    }
                  ],
                  [
                    {
                      relation: [
                        { indices: [ 'bbb' ], path: 'path2', pattern: 'bbb' },
                        { indices: [ 'aaa' ], path: 'id', pattern: 'aaa' }
                      ]
                    }
                  ]
                ]
              },
              {
                relation: [
                  { pattern: 'aaa', path: 'id', indices: [ 'aaa' ] },
                  { pattern: 'ccc', path: 'path3', indices: [ 'ccc' ] }
                ]
              }
            ]
          }
        ];

        const builder = new FilterJoinBuilder();
        const fj = builder.addFilterJoin({ sourcePath: 'path3', targetIndices: [ 'aaa' ], targetPath: 'id' });
        fj.addFilterJoin({
          negate: true,
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path1',
          targetTypes: [ 'B' ]
        });
        fj.addFilterJoin({
          negate: true,
          sourceTypes: [ 'A' ],
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path1',
          targetTypes: [ 'B' ]
        });
        fj.addFilterJoin({
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path2'
        });

        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('2 join sequences', function () {
        const joinSequence1 = {
          join_sequence: [
            {
              relation: [
                { pattern: 'A', path: 'aaa', indices: [ 'A' ] },
                { pattern: 'B', path: 'bbb', indices: [ 'B' ] }
              ]
            }
          ]
        };
        const joinSequence2 = {
          join_sequence: [
            {
              relation: [
                { pattern: 'C', path: 'ccc', indices: [ 'C' ] },
                { pattern: 'D', path: 'ddd', indices: [ 'D' ] }
              ]
            }
          ]
        };
        const query = [
          {
            query: {
              bool: {
                must: [
                  {
                    match_all: {}
                  }
                ],
                filter: {
                  bool: {
                    must: [ joinSequence1, joinSequence2 ]
                  }
                }
              }
            }
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourcePath: 'bbb',
          targetIndices: [ 'A' ],
          targetPath: 'aaa'
        });
        builder.addFilterJoin({
          sourcePath: 'ddd',
          targetIndices: [ 'C' ],
          targetPath: 'ccc'
        });

        const expected = [
          {
            query: {
              bool: {
                must: [
                  {
                    match_all:{}
                  }
                ],
                filter: {
                  bool: {
                    must: builder.toObject()
                  }
                }
              }
            }
          }
        ];

        const actual = filterJoinSeq(query);
        expect(actual).to.eql(expected);
      });

      it('join_sequence with a join_set', function () {
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  {
                    path: 'id',
                    indices: [ 'company' ],
                    pattern: 'company',
                    queries: [
                      {
                        join_set: {
                          focus: 'i1',
                          relations: [
                            [
                              { pattern: 'i1', indices: [ 'i1' ], path: 'id2' },
                              { pattern: 'i2', indices: [ 'i2' ], path: 'id' }
                            ]
                          ]
                        }
                      }
                    ]
                  },
                  { path: 'companyid', pattern: 'investment', indices: [ 'investment' ] }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addFilterJoin({
          sourcePath: 'id2',
          targetIndices: [ 'i2' ],
          targetPath: 'id'
        });
        const actual = filterJoinSeq(filterJoinSet(query));
        expect(actual).to.eql(builder.toObject());
      });

      it('nested sequence 1', function () {
        const query = [
          {
            join_sequence: [
              {
                group: [
                  [
                    {
                      relation: [
                        {
                          path: 'companyid',
                          pattern: 'investment',
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
                        { path: 'id', pattern: 'company', indices: [ 'company' ] }
                      ]
                    }
                  ]
                ]
              },
              {
                relation: [
                  { pattern: 'company', path: 'id', indices: [ 'company' ] },
                  { pattern: 'investment', path: 'companyid', indices: [ 'investment' ] }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addFilterJoin({
          sourcePath: 'id',
          targetIndices: [ 'investment' ],
          targetPath: 'companyid'
        })
        .addQuery({
          query: {
            query_string: {
              query: '360buy'
            }
          }
        });
        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('nested sequence 2', function () {
        const query = [
          {
            join_sequence: [
              {
                group: [
                  [
                    {
                      relation: [
                        {
                          path: 'id',
                          pattern: 'A',
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
                        { path: 'aid', pattern: 'B', indices: [ 'B' ] }
                      ]
                    }
                  ],
                  [
                    {
                      relation: [
                        {
                          path: 'did',
                          pattern: 'C',
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
                        { path: 'id', pattern: 'D', indices: [ 'D' ] }
                      ]
                    },
                    {
                      relation: [
                        {
                          path: 'id',
                          pattern: 'D',
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
                        { path: 'did', pattern: 'B', indices: [ 'B' ] }
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
                    pattern: 'B',
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
                  { path: 'bid', pattern: 'A', indices: [ 'A' ] }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        const fj1 = builder.addFilterJoin({ sourcePath: 'bid', targetIndices: [ 'B' ], targetPath: 'id' })
        .addQuery({
          query: {
            query_string: {
              query: 'bbb'
            }
          }
        });
        fj1.addFilterJoin({ sourcePath: 'aid', targetIndices: [ 'A' ], targetPath: 'id' })
        .addQuery({
          query: {
            query_string: {
              query: 'aaa'
            }
          }
        });
        fj1.addFilterJoin({ sourcePath: 'did', targetIndices: [ 'D' ], targetPath: 'id' })
        .addQuery({
          query: {
            query_string: {
              query: 'ddd'
            }
          }
        })
        .addFilterJoin({ sourcePath: 'id', targetIndices: [ 'C' ], targetPath: 'did' })
        .addQuery({
          query: {
            query_string: {
              query: 'ccc'
            }
          }
        });
        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });
    });

    describe('Filterjoin with pre-defined join sequence', function () {
      it('joins with filters on leaf', function () {
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  {
                    path: 'companyid',
                    pattern: 'investment',
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
                  { path: 'id', pattern: 'company', indices: [ 'company' ] }
                ]
              },
              {
                relation: [
                  { path: 'id', pattern: 'company', indices: [ 'company' ] },
                  { path: 'companyid', pattern: 'investment', indices: [ 'investment' ] }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({ sourcePath: 'companyid', targetIndices: [ 'company' ], targetPath: 'id' })
        .addFilterJoin({ sourcePath: 'id', targetIndices: [ 'investment' ], targetPath: 'companyid' })
        .addQuery({
          query: {
            query_string: {
              query: '360buy'
            }
          }
        });
        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('should keep the types specified for the source index', function () {
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  { pattern: 'company', path: 'id', indices: [ 'company' ], types: [ 'Company' ] },
                  { pattern: 'investment', path: 'companyid', indices: [ 'investment' ], types: [ 'Investment' ] }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourceTypes: 'Investment',
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetTypes: 'Company',
          targetPath: 'id'
        });
        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('negate relation', function () {
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  { pattern: 'investment', path: 'companyid', indices: [ 'investment' ] },
                  { pattern: 'company', path: 'id', indices: [ 'company' ] }
                ],
                negate: true
              },
              {
                relation: [
                  { pattern: 'company', path: 'id', indices: [ 'company' ] },
                  { pattern: 'investment', path: 'companyid', indices: [ 'investment' ] }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addFilterJoin({
          sourcePath: 'id',
          targetIndices: [ 'investment' ],
          targetPath: 'companyid',
          negate: true
        });
        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('negate a relation with types', function () {
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  {
                    pattern: 'investment',
                    path: 'companyid',
                    indices: [ 'investment' ],
                    types: [ 'Investment' ]
                  },
                  {
                    pattern: 'company',
                    path: 'id',
                    indices: [ 'company' ],
                    types: [ 'Company' ]
                  }
                ],
                negate: true
              },
              {
                relation: [
                  {
                    pattern: 'company',
                    path: 'id',
                    indices: [ 'company' ]
                  },
                  {
                    pattern: 'investment',
                    path: 'companyid',
                    indices: [ 'investment' ]
                  }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addFilterJoin({
          sourcePath: 'id',
          sourceTypes: [ 'Company' ],
          targetIndices: [ 'investment' ],
          targetPath: 'companyid',
          targetTypes: [ 'Investment' ],
          negate: true
        });
        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('joins with two filters', function () {
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  {
                    path: 'companyid',
                    indices: [ 'investment' ],
                    pattern: 'investment',
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
                  { path: 'id', pattern: 'company', indices: [ 'company' ] }
                ]
              },
              {
                relation: [
                  {
                    path: 'id',
                    indices: [ 'company' ],
                    pattern: 'company',
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
                  { path: 'companyid', pattern: 'investment', indices: [ 'investment' ] }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addQuery({
          query: {
            query_string: {
              query: 'yoplait'
            }
          }
        })
        .addFilterJoin({
          sourcePath: 'id',
          targetIndices: [ 'investment' ],
          targetPath: 'companyid'
        })
        .addQuery({
          query: {
            query_string: {
              query: '360buy'
            }
          }
        });
        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('joins with two filters - the first with no indices', function () {
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  {
                    path: 'companyid',
                    pattern: 'investment*',
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
                    pattern: 'company*',
                    indices: [ 'company' ]
                  }
                ]
              },
              {
                relation: [
                  {
                    path: 'id',
                    indices: [ 'company' ],
                    pattern: 'company*',
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
                    pattern: 'investment*',
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
                    pattern: 'investment*',
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
                    pattern: 'company*',
                    indices: [ 'company' ]
                  }
                ]
              },
              {
                relation: [
                  {
                    path: 'id',
                    pattern: 'investment*',
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
                    pattern: 'investment*',
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
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  {
                    path: 'here',
                    indices: [ 'aaa' ],
                    pattern: 'aaa',
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
                  { path: 'there', pattern: 'aaa', indices: [ 'aaa' ] }
                ]
              }
            ]
          }
        ];
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourcePath: 'there',
          targetIndices: [ 'aaa' ],
          targetPath: 'here'
        })
        .addQuery({
          query: {
            query_string: {
              query: '360buy'
            }
          }
        });
        const actual = filterJoinSeq(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('joins with empty indices - 1', function () {
        const query = [
          {
            join_sequence: [
              {
                relation: [
                  {
                    pattern: 'logstash-2016.09.*',
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
                    path: 'ip',
                    pattern: 'logstash-2016.10.*'
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
        const query = [
          {
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
          }
        ];
        expect(filterJoinSeq).withArgs(query).to.throwError();
      });
    });
  });
});
