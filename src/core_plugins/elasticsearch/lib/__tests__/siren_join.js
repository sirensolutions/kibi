import expect from 'expect.js';
import _ from 'lodash';
import JoinBuilder from './siren_join_query_builder';
import sirenJoin from '../siren_join';

describe('Join querying', function () {

  const server = {
    config: () => ({
      get: () => '.kibi'
    })
  };

  const joinSet = sirenJoin(server).set;
  const joinSequence = sirenJoin(server).sequence;

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
        const builder = new JoinBuilder();
        builder.addJoin({
          sourceTypes: 'type',
          sourcePath: 'id',
          targetIndices: [ 'weather-2015-01', 'weather-2015-02' ],
          targetTypes: 'type',
          targetPath: 'id'
        })
        .addJoin({
          sourceTypes: 'type',
          sourcePath: 'id',
          targetIndices: [ 'activity-2015-01', 'activity-2015-02' ],
          targetTypes: 'type',
          targetPath: 'id'
        });
        const expected = builder.toObject();
        const actual = joinSet([ query ]);
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
        const actual = joinSet([ query ]);
        expect(actual).to.eql([
          {
            bool: {
              must: [{
                match_none: {}
              }]
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
        const actual = joinSet([ query ]);
        expect(actual).to.eql([
          {
            bool: {
              must: [
                {
                  join: {
                    indices: [
                      'weather-2015-01',
                      'weather-2015-02'
                    ],
                    types: ['type'],
                    on: [ 'id', 'id' ],
                    request: {
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
                                  bool: {
                                    must: [
                                      {
                                        match_none: {}
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
        const builder = new JoinBuilder();
        builder.addJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't22',
          targetPath: 'id2'
        });
        builder.addJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't2',
          targetPath: 'id2'
        });
        const expected = builder.toObject();
        const actual = joinSet([ query ]);
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
        const builder = new JoinBuilder();
        const fj0 = builder.addJoin({
          sourceTypes: 't0',
          sourcePath: 'id0',
          targetIndices: [ 'i1' ],
          targetTypes: 't1',
          targetPath: 'id1'
        });
        fj0.addJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't22',
          targetPath: 'id2'
        });
        fj0.addJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't2',
          targetPath: 'id2'
        });
        const expected = builder.toObject();
        const actual = joinSet([ query ]);
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
        const builder = new JoinBuilder();
        const fj0 = builder.addJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't22',
          targetPath: 'id2'
        });
        fj0.addJoin({ sourceTypes: 't2', sourcePath: 'id2', targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });
        const fj1 = builder.addJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndices: [ 'i2' ],
          targetTypes: 't2',
          targetPath: 'id2'
        });
        fj1.addJoin({ sourceTypes: 't2', sourcePath: 'id2', targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });

        const expected = builder.toObject();
        const actual = joinSet([ query ]);
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
        const b = new JoinBuilder();

        // multiedge 1
        const fj0 = b.addJoin({ sourceTypes: 't1', sourcePath: 'id1',
          targetIndices: [ 'i2' ], targetTypes: 't2', targetPath: 'id2' });
        const fj1 = b.addJoin({ sourceTypes: 't1', sourcePath: 'id1',
          targetIndices: [ 'i2' ], targetTypes: 't22', targetPath: 'id22' });

        // multiedge 2
        const fj00 = fj0.addJoin({ sourceTypes: 't2', sourcePath: 'id2',
          targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });
        const fj01 = fj0.addJoin({ sourceTypes: 't22', sourcePath: 'id22',
          targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });
        const fj10 = fj1.addJoin({ sourceTypes: 't2', sourcePath: 'id2',
          targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });
        const fj11 = fj1.addJoin({ sourceTypes: 't22', sourcePath: 'id22',
          targetIndices: [ 'i3' ], targetTypes: 't3', targetPath: 'id3' });

        _.each([ fj00, fj01, fj10, fj11 ], (edge) => {
          // single edge 2
          const child = edge.addJoin({
            sourceTypes: 't3',
            sourcePath: 'id3',
            targetIndices: [ 'i4' ],
            targetTypes: 't4',
            targetPath: 'id4'
          });
          // single edge 1
          child.addJoin({ sourceTypes: 't4', sourcePath: 'id4', targetIndices: [ 'i2' ], targetTypes: 't22', targetPath: 'id22' });
        });

        const expected = b.toObject();
        const actual = joinSet([ query ]);
        expect(actual).to.eql(expected);
      });
    });

    it('should consider the position of queries before being replaced by their join equivalent', function () {
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
      const builder = new JoinBuilder();
      builder.addJoin({
        sourcePath: 'id',
        targetIndices: [ 'investment' ],
        targetPath: 'companyid'
      });
      builder.addJoin({
        sourcePath: 'id',
        targetIndices: [ 'article' ],
        targetPath: 'companyid'
      });
      const query1 = builder.toObject();

      builder.clear();
      builder.addJoin({
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
      const actual = joinSequence(joinSet(query));
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
      expect(joinSet).withArgs(query).to.throwError(/loops/i);
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
      const builder = new JoinBuilder();
      builder.addJoin({
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
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
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
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
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
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetPath: 'id2'
      });
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addQuery({
        terms: {
          tag: [ 'grishka' ]
        }
      });
      builder.addJoin({
        sourcePath: 'id1',
        sourceTypes: 'cafard',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
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
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
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
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
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
      .addJoin({
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
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
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
      builder.addJoin({
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
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      const fj1 = builder.addJoin({
        sourceTypes: 'cafard',
        sourcePath: 'aaa',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      fj1.addJoin({
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
      fj1.addJoin({
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
      const fj2 = builder.addJoin({
        sourceTypes: 'cafard',
        sourcePath: 'bbb',
        targetIndices: [ 'i3' ],
        targetTypes: 'cafard',
        targetPath: 'id3'
      });
      fj2.addJoin({
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
      fj2.addJoin({
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
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndices: [ 'i2' ],
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      builder.addJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id0',
        targetIndices: [ 'i0' ],
        targetTypes: 'cafard',
        targetPath: 'id0'
      });
      const actual = joinSet(query);
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
      const builder = new JoinBuilder();
      builder.addJoin({
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
      const actual = joinSet(query);
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
                            { pattern: 'A', path: 'aaa', indices: ['A'] },
                            { pattern: 'B', path: 'bbb', indices: ['B'], types: ['A'] }
                          ]
                        }
                      ]
                    },
                    {
                      join_sequence: [
                        {
                          relation: [
                            { pattern: 'C', path: 'ccc', indices: ['C'] },
                            { pattern: 'D', path: 'ddd', indices: ['D'] }
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
      const builder = new JoinBuilder();
      builder.addJoin({
        sourcePath: 'bbb',
        sourceTypes: ['A'],
        targetIndices: [ 'A' ],
        targetPath: 'aaa'
      });
      builder.addJoin({
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
                  must_not: builder.toObject()
                }
              }
            }
          }
        }
      ];

      const actual = joinSequence(query);
      expect(actual).to.eql(expected);
    });

    describe('Join with nested join sequence', function () {
      describe('Error handling', function () {
        it('should fail on the sequence not being an array', function () {
          expect(joinSequence).withArgs([ { join_sequence: 123 } ]).to.throwError(/unexpected value/i);
          expect(joinSequence).withArgs([ { join_sequence: {} } ]).to.throwError(/must be an array/i);
        });

        it('should fail on empty sequence', function () {
          expect(joinSequence).withArgs([ { join_sequence: [] } ]).to.throwError(/specify the join sequence/i);
        });

        it('should fail on incorrect nested sequence', function () {
          expect(joinSequence).withArgs([ { join_sequence: [ { group: [] } ] } ]).to.throwError(/missing elements/i);
          // recurse on the nested sequence
          expect(joinSequence).withArgs([ { join_sequence: [ { group: [ 1, 2 ] }, { relation: [ 1, 2 ] } ] } ])
          .to.throwError(/The join sequence must be an array. Got: 1/i);
        });

        it('should fail on incorrect dashboard element', function () {
          expect(joinSequence).withArgs([
            {
              join_sequence: [
                {
                  relation: [ {}, {} ]
                }
              ]
            }
          ]).to.throwError(/path is required/i);

          expect(joinSequence).withArgs([
            {
              join_sequence: [
                {
                  relation: [ { path: 'aaa' }, { path: 'bbb' } ]
                }
              ]
            }
          ]).to.throwError(/pattern is required/i);

          expect(joinSequence).withArgs([
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

          expect(joinSequence).withArgs([
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

          expect(joinSequence).withArgs([
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

        const builder = new JoinBuilder();
        const fj = builder.addJoin({ sourcePath: 'path3', targetIndices: [ 'aaa' ], targetPath: 'id' });
        fj.addJoin({ negate: true, sourcePath: 'id', targetIndices: [ 'bbb' ], targetPath: 'path1' });
        fj.addJoin({ sourcePath: 'id', targetIndices: [ 'bbb' ], targetPath: 'path2' });

        const actual = joinSequence(query);
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

        const builder = new JoinBuilder();
        const fj = builder.addJoin({ sourcePath: 'path3', targetIndices: [ 'aaa' ], targetPath: 'id' });
        fj.addJoin({
          negate: true,
          sourceTypes: [ 'A' ],
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path1',
          targetTypes: [ 'B' ]
        });
        fj.addJoin({
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path2'
        });

        const actual = joinSequence(query);
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

        const builder = new JoinBuilder();
        const fj = builder.addJoin({ sourcePath: 'path3', targetIndices: [ 'aaa' ], targetPath: 'id' });
        fj.addJoin({
          negate: true,
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path1',
          targetTypes: [ 'B' ]
        });
        fj.addJoin({
          negate: true,
          sourceTypes: [ 'A' ],
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path1',
          targetTypes: [ 'B' ]
        });
        fj.addJoin({
          sourcePath: 'id',
          targetIndices: [ 'bbb' ],
          targetPath: 'path2'
        });

        const actual = joinSequence(query);
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
        const builder = new JoinBuilder();
        builder.addJoin({
          sourcePath: 'bbb',
          targetIndices: [ 'A' ],
          targetPath: 'aaa'
        });
        builder.addJoin({
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

        const actual = joinSequence(query);
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
        const builder = new JoinBuilder();
        builder.addJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addJoin({
          sourcePath: 'id2',
          targetIndices: [ 'i2' ],
          targetPath: 'id'
        });
        const actual = joinSequence(joinSet(query));
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
        const builder = new JoinBuilder();
        builder.addJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addJoin({
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
        const actual = joinSequence(query);
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
        const builder = new JoinBuilder();
        const fj1 = builder.addJoin({ sourcePath: 'bid', targetIndices: [ 'B' ], targetPath: 'id' })
        .addQuery({
          query: {
            query_string: {
              query: 'bbb'
            }
          }
        });
        fj1.addJoin({ sourcePath: 'aid', targetIndices: [ 'A' ], targetPath: 'id' })
        .addQuery({
          query: {
            query_string: {
              query: 'aaa'
            }
          }
        });
        fj1.addJoin({ sourcePath: 'did', targetIndices: [ 'D' ], targetPath: 'id' })
        .addQuery({
          query: {
            query_string: {
              query: 'ddd'
            }
          }
        })
        .addJoin({ sourcePath: 'id', targetIndices: [ 'C' ], targetPath: 'did' })
        .addQuery({
          query: {
            query_string: {
              query: 'ccc'
            }
          }
        });
        const actual = joinSequence(query);
        expect(actual).to.eql(builder.toObject());
      });
    });

    describe('Join with pre-defined join sequence', function () {
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
        const builder = new JoinBuilder();
        builder.addJoin({ sourcePath: 'companyid', targetIndices: [ 'company' ], targetPath: 'id' })
        .addJoin({ sourcePath: 'id', targetIndices: [ 'investment' ], targetPath: 'companyid' })
        .addQuery({
          query: {
            query_string: {
              query: '360buy'
            }
          }
        });
        const actual = joinSequence(query);
        expect(actual).to.eql(builder.toObject());
      });

      it('should set the type of join', function () {
        const query = [
          {
            join_sequence: [
              {
                type: 'INNER_JOIN',
                relation: [
                  { pattern: 'company', path: 'id', indices: [ 'company' ], types: [ 'Company' ] },
                  { pattern: 'investment', path: 'companyid', indices: [ 'investment' ], types: [ 'Investment' ] }
                ]
              }
            ]
          }
        ];
        const builder = new JoinBuilder();
        builder.addJoin({
          type: 'INNER_JOIN',
          sourceTypes: 'Investment',
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetTypes: 'Company',
          targetPath: 'id'
        });
        const actual = joinSequence(query);
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
        const builder = new JoinBuilder();
        builder.addJoin({
          sourceTypes: 'Investment',
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetTypes: 'Company',
          targetPath: 'id'
        });
        const actual = joinSequence(query);
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
        const builder = new JoinBuilder();
        builder.addJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addJoin({
          sourcePath: 'id',
          targetIndices: [ 'investment' ],
          targetPath: 'companyid',
          negate: true
        });
        const actual = joinSequence(query);
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
        const builder = new JoinBuilder();
        builder.addJoin({
          sourcePath: 'companyid',
          targetIndices: [ 'company' ],
          targetPath: 'id'
        })
        .addJoin({
          sourcePath: 'id',
          sourceTypes: [ 'Company' ],
          targetIndices: [ 'investment' ],
          targetPath: 'companyid',
          targetTypes: [ 'Investment' ],
          negate: true
        });
        const actual = joinSequence(query);
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
        const builder = new JoinBuilder();
        builder.addJoin({
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
        .addJoin({
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
        const actual = joinSequence(query);
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
        const actual = joinSequence(query);
        expect(actual).to.eql([
          {
            join: {
              indices: ['company'],
              on: [ 'companyid', 'id' ],
              request: {
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
                        must: [
                          {
                            bool: {
                              must: [
                                {
                                  match_none: {}
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
        const actual = joinSequence(query);
        expect(actual).to.eql([
          {
            bool: {
              must: [{
                match_none: {}
              }]
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
        const builder = new JoinBuilder();
        builder.addJoin({
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
        const actual = joinSequence(query);
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
        const actual = joinSequence(query);
        expect(actual).to.eql([
          {
            bool: {
              must: [{
                match_none: {}
              }]
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
        expect(joinSequence).withArgs(query).to.throwError();
      });
    });
  });
});
