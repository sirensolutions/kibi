const mockery = require('mockery');
const Promise = require('bluebird');
const expect = require('expect.js');
const sinon = require('sinon');
let restQuery;

const fakeServer = {
  log: (tags, data) => {},
  config: () => {
    return {
      get: (key) => {
        if (key === 'elasticsearch.url') {
          return 'http://localhost:12345';
        } else if (key === 'kibana.index') {
          return '.kibi';
        } else {
          return '';
        }
      }
    };
  },
  plugins: {
    elasticsearch: {
      client: {
        search: () => {
          return Promise.reject(new Error('Document does not exists'));
        }
      }
    }
  }
};


const fakeDoc1 = {
  id: 'post1',
  title: 'title1'
};

const fakeDoc2 = {
  id: 'user1',
  title: 'user1'
};

let _rpOptions;

describe('RestQuery', () => {

  before(done => {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    mockery.registerMock('request-promise', rpOptions => {

      _rpOptions = rpOptions;
      // here return different resp depends on rpOptions.href
      if (rpOptions.uri.href === 'http://localhost:3000/posts') {
        return Promise.resolve(fakeDoc1);
      } else if (rpOptions.uri.href === 'http://localhost:3000/user/1') {
        return Promise.resolve(fakeDoc2);
      }
    });

    done();
  });

  after(done => {
    mockery.disable();
    mockery.deregisterAll();
    done();
  });

  describe('checkIfItIsRelevant - should be active', () => {

    it('empty uri, empty activation_rules', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: []
      });

      restQuery.checkIfItIsRelevant({}).then(ret => {
        expect(ret).to.be(true);
        done();
      }).catch(done);
    });

    it('NOT empty uri, empty activation_rules', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: []
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).then(ret => {
        expect(ret).to.be(true);
        done();
      }).catch(done);
    });

    it('NOT empty uri, activation_rules does not exists, ignored old activationQuery param', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        activationQuery: '^/company'
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).then(ret => {
        expect(ret).to.be(true);
        done();
      }).catch(done);
    });

    it('NOT empty uri, empty rest_path, undefined selectedDocuments', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        rest_path: '',
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: undefined}).then(ret => {
        expect(ret).to.be(true);
        done();
      }).catch(done);
    });

    it('NOT empty uri, rest_body does not depend on entity, undefined selectedDocuments', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        rest_body: 'doesNotDependEntity',
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: undefined}).then(ret => {
        expect(ret).to.be(true);
        done();
      }).catch(done);
    });
  });

  describe('checkIfItIsRelevant - should fail', () => {

    it('NOT empty uri, NOT empty activation_rules should reject as it is not able to fetch the document', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: [{
          s: '@doc[_source][does_not_exist]@',
          p: 'exists'
        }]
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).catch(err => {
        expect(err.message).to.eql('Could not fetch document [//company/company], check logs for details please.');
        done();
      }).catch(done);
    });

    it('NOT empty uri, NOT empty rest_path reject as it is undefined selectedDocuments', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        rest_path: '/id=@doc[id]@'
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: undefined}).then(ret => {
        expect(ret).to.be(false);
        done();
      }).catch(done);
    });

    it('NOT empty uri, NOT empty rest_body should reject as it is undefined selectedDocuments', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        rest_body: '/id=@doc[id]@'
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: undefined}).then(ret => {
        expect(ret).to.be(false);
        done();
      }).catch(done);
    });
  });

  describe('fetchResults test if correct arguments are passed to generateCacheKey', () => {
    it('test that username is passed when there are credentials in options', done => {
      const cacheMock = {
        get: key => '',
        set: (key, value, time) => {}
      };

      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        activationQuery: '',
        rest_method: 'GET',
        datasource: {
          datasourceClazz: {
            datasource: {
              datasourceParams: {
                url: 'http://localhost:3000/posts',
                cache_enabled: true
              }
            },
            populateParameters: () => ''
          }
        }
      }, cacheMock);

      const spy = sinon.spy(restQuery, 'generateCacheKey');

      restQuery.fetchResults({credentials: {username: 'fred'}}).then(res => {
        expect(res).to.eql(fakeDoc1);
        expect(spy.callCount).to.equal(1);
        expect(spy.calledWithExactly('GET', 'http://localhost:3000/posts', '', '{}', '{}', '', 'fred')).to.be.ok();
        done();
      }).catch(done);
    });
  });

  describe('fetchResults', () => {

    it('simple get request', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        activationQuery: '',
        rest_method: 'GET',
        datasource: {
          datasourceClazz: {
            datasource: {
              datasourceParams: {
                url: 'http://localhost:3000/posts'
              }
            },
            populateParameters: () => ''
          }
        }
      });

      restQuery.fetchResults('').then(res => {
        expect(res).to.eql(fakeDoc1);
        done();
      }).catch(done);
    });

    it('simple post request', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        activationQuery: '',
        rest_method: 'POST',
        datasource: {
          datasourceClazz: {
            datasource: {
              datasourceParams: {
                url: 'http://localhost:3000/posts'
              }
            },
            populateParameters: () => ''
          }
        }
      });

      restQuery.fetchResults('').then(res => {
        expect(res).to.eql(fakeDoc1);
        done();
      }).catch(done);
    });

    it('method different than GET or POST should fail', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer, {
        activationQuery: '',
        rest_method: 'PUT',
        datasource: {
          datasourceClazz: {
            datasource: {
              datasourceParams: {
                url: 'http://localhost:3000/posts'
              }
            },
            populateParameters: () => ''
          }
        }
      });

      restQuery.fetchResults('').catch(err => {
        expect(err.message).to.equal('Only GET|POST methods are supported at the moment');
        done();
      }).catch(done);
    });

    it('request with username and password', done => {
      const RestQuery = require('../../queries/rest_query');
      const restQuery = new RestQuery(fakeServer , {
        activationQuery: '',
        rest_method: 'GET',
        datasource: {
          datasourceClazz: {
            datasource: {
              datasourceParams: {
                url: 'http://localhost:3000/user/1',
                username: 'user',
                password: 'password'
              }
            },
            populateParameters: () => ''
          }
        }
      });

      restQuery.fetchResults('').then(res => {
        expect(res).to.eql(fakeDoc2);
        done();
      }).catch(done);
    });

    describe('passing headers', () => {
      it('from datasource are correctly passed', done => {
        const RestQuery = require('../../queries/rest_query');
        const restQuery = new RestQuery(fakeServer, {
          activationQuery: '',
          rest_method: 'GET',
          datasource: {
            datasourceParams: {
              headers: [
                {name: 'header1', value: 'value1'}
              ]
            },
            datasourceClazz: {
              datasource: {
                datasourceParams: {
                  url: 'http://localhost:3000/posts'
                }
              },
              populateParameters: () => ''
            }
          }
        });

        restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(_rpOptions.headers).to.eql({ header1: 'value1' });
          done();
        }).catch(done);
      });

      it('from query are correctly passed', done => {
        const RestQuery = require('../../queries/rest_query');
        const restQuery = new RestQuery(fakeServer, {
          activationQuery: '',
          rest_method: 'GET',
          datasource: {
            datasourceClazz: {
              datasource: {
                datasourceParams: {
                  url: 'http://localhost:3000/posts'
                }
              },
              populateParameters: () => ''
            }
          },
          rest_headers: [
            {name: 'header1', value: 'value1'}
          ]
        });

        restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(_rpOptions.headers).to.eql({ header1: 'value1' });
          done();
        }).catch(done);
      });

      it('from both datasource and query are correctly passed', done => {
        const RestQuery = require('../../queries/rest_query');
        const restQuery = new RestQuery(fakeServer, {
          activationQuery: '',
          rest_method: 'GET',
          datasource: {
            datasourceParams: {
              headers: [
                {name: 'header2', value: 'value2'}
              ]
            },
            datasourceClazz: {
              datasource: {
                datasourceParams: {
                  url: 'http://localhost:3000/posts'
                }
              },
              populateParameters: () => ''
            }
          },
          rest_headers: [
            {name: 'header1', value: 'value1'}
          ]
        });

        restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(_rpOptions.headers).to.eql({
            header1: 'value1',
            header2: 'value2',
          });
          done();
        }).catch(done);
      });

      it('from both datasource and query are correctly passed', done => {
        const RestQuery = require('../../queries/rest_query');
        const restQuery = new RestQuery(fakeServer, {
          activationQuery: '',
          rest_method: 'GET',
          datasource: {
            datasourceParams: {
              headers: [
                {name: 'header1', value: 'value1'},
                {name: 'header2', value: 'value2'}
              ]
            },
            datasourceClazz: {
              datasource: {
                datasourceParams: {
                  url: 'http://localhost:3000/posts'
                }
              },
              populateParameters: () => ''
            }
          },
          rest_headers: [
            {name: 'header1', value: 'valueOverridden'}
          ]
        });

        restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(_rpOptions.headers).to.eql({
            header1: 'valueOverridden',
            header2: 'value2',
          });
          done();
        }).catch(done);
      });
    });

   describe('passing parameters', () => {
      it('from datasource are correctly passed', done => {
        const RestQuery = require('../../queries/rest_query');
        const restQuery = new RestQuery(fakeServer, {
          activationQuery: '',
          rest_method: 'GET',
          datasource: {
            datasourceParams: {
              params: [
                {name: 'param1', value: 'value1'}
              ]
            },
            datasourceClazz: {
              datasource: {
                datasourceParams: {
                  url: 'http://localhost:3000/posts'
                }
              },
              populateParameters: () => ''
            }
          }
        });

        restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(_rpOptions.qs).to.eql({ param1: 'value1' });
          done();
        }).catch(done);
      });

      it('from query are correctly passed', done => {
        const RestQuery = require('../../queries/rest_query');
        const restQuery = new RestQuery(fakeServer, {
          activationQuery: '',
          rest_method: 'GET',
          datasource: {
            datasourceClazz: {
              datasource: {
                datasourceParams: {
                  url: 'http://localhost:3000/posts'
                }
              },
              populateParameters: () => ''
            }
          },
          rest_params: [
            {name: 'param1', value: 'value1'}
          ]
        });

        restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(_rpOptions.qs).to.eql({ param1: 'value1' });
          done();
        }).catch(done);
      });

      it('from both datasource and query are correctly passed', done => {
        const RestQuery = require('../../queries/rest_query');
        const restQuery = new RestQuery(fakeServer, {
          activationQuery: '',
          rest_method: 'GET',
          datasource: {
            datasourceParams: {
              params: [
                {name: 'param2', value: 'value2'}
              ]
            },
            datasourceClazz: {
              datasource: {
                datasourceParams: {
                  url: 'http://localhost:3000/posts'
                }
              },
              populateParameters: () => ''
            }
          },
          rest_params: [
            {name: 'param1', value: 'value1'}
          ]
        });

        restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(_rpOptions.qs).to.eql({
            param1: 'value1',
            param2: 'value2',
          });
          done();
        }).catch(done);
      });

      it('from both datasource and query are correctly passed', done => {
        const RestQuery = require('../../queries/rest_query');
        const restQuery = new RestQuery(fakeServer, {
          activationQuery: '',
          rest_method: 'GET',
          datasource: {
            datasourceParams: {
              params: [
                {name: 'param1', value: 'value1'},
                {name: 'param2', value: 'value2'}
              ]
            },
            datasourceClazz: {
              datasource: {
                datasourceParams: {
                  url: 'http://localhost:3000/posts'
                }
              },
              populateParameters: () => ''
            }
          },
          rest_params: [
            {name: 'param1', value: 'valueOverridden'}
          ]
        });

        restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(_rpOptions.qs).to.eql({
            param1: 'valueOverridden',
            param2: 'value2',
          });
          done();
        }).catch(done);
      });
    });

  });


});
