const expect = require('expect.js');
const FilterJoinBuilder = require('./filterjoin_query_builder');

describe('FilterJoin query builder', function () {
  it('should create a query with a term clause', function () {
    const builder = new FilterJoinBuilder();
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

  it('should create a query with a filterjoin', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
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
              filterjoin: {
                id1: {
                  indices: ['i2'],
                  types: ['t2'],
                  path: 'id2',
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

  it('should create a query with a filterjoin and a query', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
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
              filterjoin: {
                id1: {
                  indices: ['i2'],
                  types: ['t2'],
                  path: 'id2',
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
              },
            },
            {
              type: {
                value: 't1'
              }
            }
          ]
        }
      },
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with a filterjoin without type clauses', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
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

  it('should create a query with a nested filterjoin', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addFilterJoin({
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3'
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [
                      {
                        filterjoin: {
                          id21: {
                            indices: [ 'i3' ],
                            path: 'id3',
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

  it('should create a query with two filterjoins that are negated', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    });
    builder.addFilterJoin({
      sourcePath: 'id',
      targetIndices: [ 'i4' ],
      targetPath: 'id',
      negate: true
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
            query: {
              bool: {
                filter: {
                  bool: {
                    must: []
                  }
                },
                must: [{
                  match_all: {}
                }]
              }
            }
          }
        }
      },
      {
        filterjoin: {
          id: {
            indices: [ 'i4' ],
            path: 'id',
            query: {
              bool: {
                filter: {
                  bool: {
                    must: []
                  }
                },
                must: [{
                  match_all: {}
                }]
              }
            }
          }
        }
      }
    ];
    expect(expected).to.eql(builder.toObject());
  });

  it('should create a query with two nested filterjoins that are negated', function () {
    const builder = new FilterJoinBuilder();
    const root = builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    });
    root.addFilterJoin({
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    root.addFilterJoin({
      sourceTypes: ['moo'],
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [],
                    must_not: [
                      {
                        filterjoin: {
                          id21: {
                            indices: [ 'i3' ],
                            path: 'id3',
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
                              filterjoin: {
                                id21: {
                                  indices: ['i3'],
                                  path: 'id3',
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

  it('should create a query with a nested filterjoin that is negated', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addFilterJoin({
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
            query: {
              bool: {
                filter: {
                  bool: {
                    must: [],
                    must_not: [
                      {
                        filterjoin: {
                          id21: {
                            indices: [ 'i3' ],
                            path: 'id3',
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

  it('should create a query with a nested filterjoin having a source type set that is negated', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addFilterJoin({
      sourcePath: 'id21',
      sourceTypes: [ 'ram' ],
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
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
                              filterjoin: {
                                id21: {
                                  indices: [ 'i3' ],
                                  path: 'id3',
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

  it('should create a query with two nested negated filterjoins from the same index having a source type', function () {
    const builder = new FilterJoinBuilder();
    const rootJoin = builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    });
    rootJoin.addFilterJoin({
      sourcePath: 'id21',
      sourceTypes: [ 'ram' ],
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    rootJoin.addFilterJoin({
      sourcePath: 'id21',
      sourceTypes: [ 'ram' ],
      targetIndices: [ 'i3' ],
      targetPath: 'id3',
      negate: true
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
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
                              filterjoin: {
                                id21: {
                                  indices: [ 'i3' ],
                                  path: 'id3',
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
                      },
                      {
                        bool: {
                          must: [
                            {
                              filterjoin: {
                                id21: {
                                  indices: [ 'i3' ],
                                  path: 'id3',
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

  it('should create a query with a nested filterjoin and some queries', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addQuery({
      term: { age: 24 }
    })
    .addFilterJoin({
      sourcePath: 'id21',
      targetIndices: [ 'i3' ],
      targetPath: 'id3'
    })
    .addQuery({
      term: { age: 100 }
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
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
                        filterjoin: {
                          id21: {
                            indices: [ 'i3' ],
                            path: 'id3',
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

  it('should create a query with a nested filterjoin and some negated query', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2'
    })
    .addQuery({
      term: { age: 24 }
    }, true);
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
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

  it('should create a query with a filterjoin having advanced parameters', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2',
      maxTermsPerShard: 10,
      orderBy: '_doc',
      termsEncoding: 'integer'
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
            maxTermsPerShard: 10,
            orderBy: '_doc',
            termsEncoding: 'integer',
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

  it('should not set maxTermsPerShard if === -1', function () {
    const builder = new FilterJoinBuilder();
    builder.addFilterJoin({
      sourcePath: 'id1',
      targetIndices: [ 'i2' ],
      targetPath: 'id2',
      maxTermsPerShard: -1
    });
    const expected = [
      {
        filterjoin: {
          id1: {
            indices: [ 'i2' ],
            path: 'id2',
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
