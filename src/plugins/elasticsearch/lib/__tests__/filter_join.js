const filterJoinSet = require('../filter_join').set;
const filterJoinSeq = require('../filter_join').sequence;
const expect = require('expect.js');
const Promise = require('bluebird');
const _ = require('lodash');
const FilterJoinBuilder = require('./filterjoin_query_builder');

describe('FilterJoin querying', function () {
  describe('Join Set', function () {
    describe('Multi-edge', function () {
      it('should add two branches at the root', function () {
        const query = {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { indices: [ 'i1' ], types: [ 't12' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 't22' ], path: 'id2' }
              ],
              [
                { indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ]
            ]
          }
        };
        const builder = new FilterJoinBuilder();
        builder.addFilterJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndex: 'i2',
          targetTypes: 't22',
          targetPath: 'id2'
        });
        builder.addFilterJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndex: 'i2',
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
                { indices: [ 'i0' ], types: [ 't0' ], path: 'id0' },
                { indices: [ 'i1' ], types: [ 't1' ], path: 'id1' }
              ],
              [
                { indices: [ 'i1' ], types: [ 't12' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 't22' ], path: 'id2' }
              ],
              [
                { indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ]
            ]
          }
        };
        const builder = new FilterJoinBuilder();
        const fj0 = builder.addFilterJoin({
          sourceTypes: 't0',
          sourcePath: 'id0',
          targetIndex: 'i1',
          targetTypes: 't1',
          targetPath: 'id1'
        });
        fj0.addFilterJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndex: 'i2',
          targetTypes: 't22',
          targetPath: 'id2'
        });
        fj0.addFilterJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndex: 'i2',
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
                { indices: [ 'i1' ], types: [ 't12' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 't22' ], path: 'id2' }
              ],
              [
                { indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ],
              [
                { indices: [ 'i2' ], types: [ 't2' ], path: 'id2' },
                { indices: [ 'i3' ], types: [ 't3' ], path: 'id3' }
              ]
            ]
          }
        };
        const builder = new FilterJoinBuilder();
        const fj0 = builder.addFilterJoin({
          sourceTypes: 't12',
          sourcePath: 'id1',
          targetIndex: 'i2',
          targetTypes: 't22',
          targetPath: 'id2'
        });
        fj0.addFilterJoin({ sourceTypes: 't2', sourcePath: 'id2', targetIndex: 'i3', targetTypes: 't3', targetPath: 'id3' });
        const fj1 = builder.addFilterJoin({
          sourceTypes: 't1',
          sourcePath: 'id1',
          targetIndex: 'i2',
          targetTypes: 't2',
          targetPath: 'id2'
        });
        fj1.addFilterJoin({ sourceTypes: 't2', sourcePath: 'id2', targetIndex: 'i3', targetTypes: 't3', targetPath: 'id3' });

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
                { indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ],
              [
                { indices: [ 'i1' ], types: [ 't1' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 't22' ], path: 'id22' }
              ],

              // multiedge 2
              [
                { indices: [ 'i3' ], types: [ 't3' ], path: 'id3' },
                { indices: [ 'i2' ], types: [ 't2' ], path: 'id2' }
              ],
              [
                { indices: [ 'i3' ], types: [ 't3' ], path: 'id3' },
                { indices: [ 'i2' ], types: [ 't22' ], path: 'id22' }
              ],

              // single edge 1
              [
                { indices: [ 'i4' ], types: [ 't4' ], path: 'id4' },
                { indices: [ 'i2' ], types: [ 't22' ], path: 'id22' }
              ],

              // single edge 2
              [
                { indices: [ 'i4' ], types: [ 't4' ], path: 'id4' },
                { indices: [ 'i3' ], types: [ 't3' ], path: 'id3' }
              ]
            ]
          }
        };
        const b = new FilterJoinBuilder();

        // multiedge 1
        const fj0 = b.addFilterJoin({ sourceTypes: 't1', sourcePath: 'id1', targetIndex: 'i2', targetTypes: 't2', targetPath: 'id2' });
        const fj1 = b.addFilterJoin({ sourceTypes: 't1', sourcePath: 'id1', targetIndex: 'i2', targetTypes: 't22', targetPath: 'id22' });

        // multiedge 2
        const fj00 = fj0.addFilterJoin({ sourceTypes: 't2', sourcePath: 'id2', targetIndex: 'i3', targetTypes: 't3', targetPath: 'id3' });
        const fj01 = fj0.addFilterJoin({ sourceTypes: 't22', sourcePath: 'id22', targetIndex: 'i3', targetTypes: 't3', targetPath: 'id3' });
        const fj10 = fj1.addFilterJoin({ sourceTypes: 't2', sourcePath: 'id2', targetIndex: 'i3', targetTypes: 't3', targetPath: 'id3' });
        const fj11 = fj1.addFilterJoin({ sourceTypes: 't22', sourcePath: 'id22', targetIndex: 'i3', targetTypes: 't3', targetPath: 'id3' });

        _.each([ fj00, fj01, fj10, fj11 ], (edge) => {
          // single edge 2
          const child = edge.addFilterJoin({
            sourceTypes: 't3',
            sourcePath: 'id3',
            targetIndex: 'i4',
            targetTypes: 't4',
            targetPath: 'id4'
          });
          // single edge 1
          child.addFilterJoin({ sourceTypes: 't4', sourcePath: 'id4', targetIndex: 'i2', targetTypes: 't22', targetPath: 'id22' });
        });

        const expected = b.toObject();
        const actual = filterJoinSet([ query ]);
        expect(actual).to.eql(expected);
      });
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
      const query = {
        bool: {
          must: [
            {
              join_set: {
                focus: 'i1',
                relations: [
                  [
                    {
                      indices: [ 'i1' ],
                      types: [ 't1' ],
                      path: 'id1'
                    },
                    {
                      indices: [ 'i2' ],
                      types: [ 't2' ],
                      path: 'id2'
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
        sourceTypes: 't1',
        sourcePath: 'id1',
        targetIndex: 'i2',
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
                    {
                      indices: [ 'i1' ],
                      types: [ 't1', 't12' ],
                      path: 'id1'
                    },
                    {
                      indices: [ 'i2' ],
                      types: [ 't2', 't22' ],
                      path: 'id2'
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
        sourceTypes: [ 't1', 't12' ],
        sourcePath: 'id1',
        targetIndex: 'i2',
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
                      indices: [ 'i1' ],
                      types: [ 'cafard' ],
                      path: 'id1',
                      termsEncoding: 'long',
                      orderBy: 'doc_score',
                      maxTermsPerShard: 10
                    },
                    {
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
        targetIndex: 'i2',
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
                      indices: [ 'i1' ],
                      types: [ 'cafard' ],
                      path: 'id1',
                      termsEncoding: 'long',
                      orderBy: 'doc_score',
                      maxTermsPerShard: 100
                    },
                    {
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
        targetIndex: 'i2',
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
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndex: 'i2',
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
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ]
            ]
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndex: 'i2',
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
                { indices: [ 'i1' ], path: 'id1' },
                { indices: [ 'i2' ], path: 'id2' }
              ]
            ]
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'id1',
        targetIndex: 'i2',
        targetPath: 'id2'
      });
      const actual = filterJoinSet(query);
      expect(actual).to.eql(builder.toObject());
    });

    it('should fail if there are filters on focused index', function () {
      const queries = {
        i1: [
          {
            terms: {
              tag: [ 'grishka' ]
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
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
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
              tag: [ 'grishka' ]
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
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
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
        targetIndex: 'i2',
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
        i2: [
          {
            terms: {
              tag: [ 'grishka' ]
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
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
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
        targetIndex: 'i2',
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
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' },
              ],
              [
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' },
                { indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' }
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
        targetIndex: 'i2',
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
        targetIndex: 'i3',
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
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'aaa' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' },
              ],
              [
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'bbb' },
                { indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' }
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
        targetIndex: 'i2',
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
        targetIndex: 'i3',
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
      const query = [
        {
          join_set: {
            focus: 'i1',
            relations: [
              [
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'aaa' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ],
              [
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'a' },
                { indices: [ 'i4' ], types: [ 'cafard' ], path: 'id' }
              ],
              [
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'b' },
                { indices: [ 'i5' ], types: [ 'cafard' ], path: 'id' }
              ],
              [
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'bbb' },
                { indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' }
              ],
              [
                { indices: [ 'i6' ], types: [ 'cafard' ], path: 'id' },
                { indices: [ 'i3' ], types: [ 'cafard' ], path: 'a' }
              ],
              [
                { indices: [ 'i7' ], types: [ 'cafard' ], path: 'id' },
                { indices: [ 'i3' ], types: [ 'cafard' ], path: 'b' }
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
        targetIndex: 'i2',
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      fj1.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'a',
        targetIndex: 'i4',
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
        targetIndex: 'i5',
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
        targetIndex: 'i3',
        targetTypes: 'cafard',
        targetPath: 'id3'
      });
      fj2.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'a',
        targetIndex: 'i6',
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
        targetIndex: 'i7',
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
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ],
              [
                { indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' },
                { indices: [ 'i4' ], types: [ 'cafard' ], path: 'id4' }
              ]
            ]
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndex: 'i2',
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
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
              ],
              [
                { indices: [ 'i0' ], types: [ 'cafard' ], path: 'id0' },
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id0' }
              ],
              [
                { indices: [ 'i3' ], types: [ 'cafard' ], path: 'id3' },
                { indices: [ 'i4' ], types: [ 'cafard' ], path: 'id4' }
              ]
            ]
          }
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndex: 'i2',
        targetTypes: 'cafard',
        targetPath: 'id2'
      });
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id0',
        targetIndex: 'i0',
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
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
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
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndex: 'i2',
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
                { indices: [ 'i1' ], types: [ 'cafard' ], path: 'id1' },
                { indices: [ 'i2' ], types: [ 'cafard' ], path: 'id2' }
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
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'cafard',
        sourcePath: 'id1',
        targetIndex: 'i2',
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
              { path: 'aaa', indices: [ 'A' ] },
              { path: 'bbb', indices: [ 'B' ] }
            ]
          }
        ]
      };
      const joinSequence2 = {
        join_sequence: [
          {
            relation: [
              { path: 'ccc', indices: [ 'C' ] },
              { path: 'ddd', indices: [ 'D' ] }
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
        targetIndex: 'A',
        targetPath: 'aaa'
      });
      builder.addFilterJoin({
        sourcePath: 'ddd',
        targetIndex: 'C',
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

    it('should consider the position of queries before being replaced by their filterjoin equivalent', function () {
      const query = {
        query: [
          {
            join_set: {
              focus: 'company',
              relations: [
                [
                  { indices: [ 'company' ], path: 'id' },
                  { indices: [ 'investment' ], path: 'companyid' }
                ],
                [
                  { indices: [ 'article' ], path: 'companyid' },
                  { indices: [ 'company' ], path: 'id' }
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
                    { indices: [ 'article' ], path: 'companyid' },
                    { indices: [ 'company' ], path: 'id' }
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
        targetIndex: 'investment',
        targetPath: 'companyid'
      });
      builder.addFilterJoin({
        sourcePath: 'id',
        targetIndex: 'article',
        targetPath: 'companyid'
      });
      const query1 = builder.toObject();

      builder.clear();
      builder.addFilterJoin({
        sourcePath: 'companyid',
        targetIndex: 'company',
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

    it('join_sequence with a join_set', function () {
      const query = [
        {
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
                            { indices: [ 'i1' ], path: 'id2' },
                            { indices: [ 'i2' ], path: 'id' }
                          ]
                        ]
                      }
                    }
                  ]
                },
                { path: 'companyid', indices: [ 'investment' ] }
              ]
            }
          ]
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'companyid',
        targetIndex: 'company',
        targetPath: 'id'
      })
      .addFilterJoin({
        sourcePath: 'id2',
        targetIndex: 'i2',
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
                      { path: 'id', indices: [ 'company' ] }
                    ]
                  }
                ]
              ]
            },
            {
              relation: [
                { path: 'id', indices: [ 'company' ] },
                { path: 'companyid', indices: [ 'investment' ] }
              ]
            }
          ]
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'companyid',
        targetIndex: 'company',
        targetPath: 'id'
      })
      .addFilterJoin({
        sourcePath: 'id',
        targetIndex: 'investment',
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
                      { path: 'aid', indices: [ 'B' ] }
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
                      { path: 'id', indices: [ 'D' ] }
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
                      { path: 'did', indices: [ 'B' ] }
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
                { path: 'bid', indices: [ 'A' ] }
              ]
            }
          ]
        }
      ];
      const builder = new FilterJoinBuilder();
      const fj1 = builder.addFilterJoin({ sourcePath: 'bid', targetIndex: 'B', targetPath: 'id' })
      .addQuery({
        query: {
          query_string: {
            query: 'bbb'
          }
        }
      });
      fj1.addFilterJoin({ sourcePath: 'aid', targetIndex: 'A', targetPath: 'id' })
      .addQuery({
        query: {
          query_string: {
            query: 'aaa'
          }
        }
      });
      fj1.addFilterJoin({ sourcePath: 'did', targetIndex: 'D', targetPath: 'id' })
      .addQuery({
        query: {
          query_string: {
            query: 'ddd'
          }
        }
      })
      .addFilterJoin({ sourcePath: 'id', targetIndex: 'C', targetPath: 'did' })
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
              { path: 'id', indices: [ 'company' ] }
            ]
          },
          {
            relation: [
              { path: 'id', indices: [ 'company' ] },
              { path: 'companyid', indices: [ 'investment' ] }
            ]
          }
        ]
      }];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({ sourcePath: 'companyid', targetIndex: 'company', targetPath: 'id' })
      .addFilterJoin({ sourcePath: 'id', targetIndex: 'investment', targetPath: 'companyid' })
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
                { path: 'id', indices: [ 'company' ], types: [ 'Company' ] },
                { path: 'companyid', indices: [ 'investment' ], types: [ 'Investment' ] }
              ]
            }
          ]
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourceTypes: 'Investment',
        sourcePath: 'companyid',
        targetIndex: 'company',
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
                { path: 'companyid', indices: [ 'investment' ] },
                { path: 'id', indices: [ 'company' ] }
              ],
              negate: true
            },
            {
              relation: [
                { path: 'id', indices: [ 'company' ] },
                { path: 'companyid', indices: [ 'investment' ] }
              ]
            }
          ]
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'companyid',
        targetIndex: 'company',
        targetPath: 'id'
      })
      .addFilterJoin({
        sourcePath: 'id',
        targetIndex: 'investment',
        targetPath: 'companyid',
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
                { path: 'id', indices: [ 'company' ] }
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
                { path: 'companyid', indices: [ 'investment' ] }
              ]
            }
          ]
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'companyid',
        targetIndex: 'company',
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
        targetIndex: 'investment',
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

    it('loop', function () {
      const query = [
        {
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
                { path: 'there', indices: [ 'aaa' ] }
              ]
            }
          ]
        }
      ];
      const builder = new FilterJoinBuilder();
      builder.addFilterJoin({
        sourcePath: 'there',
        targetIndex: 'aaa',
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
