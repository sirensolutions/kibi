import expect from 'expect.js';
import JoinBuilder from './siren_join_query_builder';

describe('Join query builder', function () {
  it('should create a query with a term clause', function () {
    const builder = new JoinBuilder();
    builder.addQuery({
      term: {
        age: 24
      }
    });
    const expected = [
      {
        term: {
          age: 24
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a join', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourceTypes: 't1',
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetTypes: 't2',
      targetPath: 'id2'
    });
    const expected = [
      {
        bool: {
          must: [
            {
              join: {
                indices: [ 'i2' ],
                types: [ 't2' ],
                on: [ 'id1', 'id2' ],
                request: {
                  query: {
                    bool: {
                      filter: {
                        bool: {
                          must: []
                        }
                      },
                      must: [
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
                value: 't1'
              }
            }
          ]
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  // NOTE: enable after version with join type option
  xit('should set the type of join', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      type: 'INNER_JOIN',
      sourceTypes: 't1',
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetTypes: 't2',
      targetPath: 'id2'
    });
    const expected = [
      {
        bool: {
          must: [
            {
              join: {
                type: 'INNER_JOIN',
                indices: [ 'i2' ],
                types: [ 't2' ],
                on: [ 'id1', 'id2' ],
                request: {
                  query: {
                    bool: {
                      filter: {
                        bool: {
                          must: []
                        }
                      },
                      must: [
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
                value: 't1'
              }
            }
          ]
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a join and a query', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourceTypes: 't1',
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetTypes: 't2',
      targetPath: 'id2'
    })
    .addQuery({
      term: { age: 24 }
    });
    const expected = [
      {
        bool: {
          must: [
            {
              join: {
                indices: [ 'i2' ],
                types: [ 't2' ],
                on: [ 'id1', 'id2' ],
                request: {
                  query: {
                    bool: {
                      filter: {
                        bool: {
                          must: [
                            {
                              term: {
                                age: 24
                              }
                            }
                          ]
                        }
                      },
                      must: [
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
                value: 't1'
              }
            }
          ]
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a join without type clauses', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: []
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a nested join', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addJoin({
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3'
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [
                      {
                        join: {
                          indices: [ 'i3' ],
                          on: [ 'id21', 'id3' ],
                          request: {
                            query: {
                              bool: {
                                filter: {
                                  bool: {
                                    must: []
                                  }
                                },
                                must: [
                                  {
                                    match_all: {}
                                  }
                                ]
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with two joins that are negated', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    });
    builder.addJoin({
      sourcePath: 'id',
      targetIndices: [ 'i4' ],
      targetPath: 'id',
      negate: true
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: []
                  }
                },
                must: [
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
        join: {
          indices: [ 'i4' ],
          on: [ 'id', 'id' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: []
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with two nested joins that are negated', function () {
    const builder = new JoinBuilder();
    const root = builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    });
    root.addJoin({
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    root.addJoin({
      sourceTypes: ['moo'],
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [],
                    must_not: [
                      {
                        join: {
                          indices: [ 'i3' ],
                          on: [ 'id21', 'id3' ],
                          request: {
                            query: {
                              bool: {
                                filter: {
                                  bool: {
                                    must: []
                                  }
                                },
                                must: [
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
                        bool: {
                          must: [
                            {
                              join: {
                                indices: ['i3'],
                                on: [ 'id21', 'id3' ],
                                request: {
                                  query: {
                                    bool: {
                                      filter: {
                                        bool: {
                                          must: []
                                        }
                                      },
                                      must: [
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
                                value: 'moo'
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a nested join that is negated', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addJoin({
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [],
                    must_not: [
                      {
                        join: {
                          indices: [ 'i3' ],
                          on: [ 'id21', 'id3' ],
                          request: {
                            query: {
                              bool: {
                                filter: {
                                  bool: {
                                    must: []
                                  }
                                },
                                must: [
                                  {
                                    match_all: {}
                                  }
                                ]
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a nested join having a source type set that is negated', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addJoin({
      sourcePath: 'id21',
      sourceTypes: [ 'ram' ],
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [],
                    must_not: [
                      {
                        bool: {
                          must: [
                            {
                              join: {
                                indices: [ 'i3' ],
                                on: [ 'id21', 'id3' ],
                                request: {
                                  query: {
                                    bool: {
                                      filter: {
                                        bool: {
                                          must: []
                                        }
                                      },
                                      must: [
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
                                value: 'ram'
                              }
                            }
                          ]
                        }
                      }
                    ]
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a nested join and some queries', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addQuery({
      term: { age: 24 }
    })
    .addJoin({
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3'
    })
    .addQuery({
      term: { age: 100 }
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [
                      {
                        term: {
                          age: 24
                        }
                      },
                      {
                        join: {
                          indices: [ 'i3' ],
                          on: [ 'id21', 'id3' ],
                          request: {
                            query: {
                              bool: {
                                filter: {
                                  bool: {
                                    must: [
                                      {
                                        term: {
                                          age: 100
                                        }
                                      }
                                    ]
                                  }
                                },
                                must: [
                                  {
                                    match_all: {}
                                  }
                                ]
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a nested join and some negated query', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addQuery({
      term: { age: 24 }
    }, true);
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [],
                    must_not: [
                      {
                        term: {
                          age: 24
                        }
                      }
                    ]
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a join having advanced parameters', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2',
      limitPerShard: 10,
      orderBy: '_doc',
      termsEncoding: 'integer'
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          limit_per_shard: 10,
          orderBy: '_doc',
          termsEncoding: 'integer',
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: []
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should not set limitPerShard if === -1', function () {
    const builder = new JoinBuilder();
    builder.addJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2',
      limitPerShard: -1
    });
    const expected = [
      {
        join: {
          indices: [ 'i2' ],
          on: [ 'id1', 'id2' ],
          request: {
            query: {
              bool: {
                filter: {
                  bool: {
                    must: []
                  }
                },
                must: [
                  {
                    match_all: {}
                  }
                ]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });
});
