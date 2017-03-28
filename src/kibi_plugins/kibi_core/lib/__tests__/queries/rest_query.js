import Promise from 'bluebird';
import expect from 'expect.js';
import sinon from 'auto-release-sinon';
import RestQuery from '../../queries/rest_query';
import rp from 'request-promise';

const fakeServer = {
  log: function (tags, data) {},
  config() {
    return {
      get(key) {
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
      getCluster() {
        return {
          getClient() {
            return {
              search() {
                return Promise.reject(new Error('Document does not exists'));
              }
            };
          }
        };
      },
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

describe('RestQuery', () => {

  describe('checkIfItIsRelevant - should be active', () => {

    it('empty uri, empty activation_rules', () => {
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: []
      });

      return restQuery.checkIfItIsRelevant({}).then(ret => {
        expect(ret).to.be(true);
      });
    });

    it('NOT empty uri, empty activation_rules', () => {
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: []
      });

      return restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']})
      .then(ret => {
        expect(ret).to.be(true);
      });
    });

    it('NOT empty uri, activation_rules does not exists, ignored old activationQuery param', () => {
      const restQuery = new RestQuery(fakeServer, {
        activationQuery: '^/company'
      });

      return restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']})
      .then(ret => {
        expect(ret).to.be(true);
      });
    });

    it('NOT empty uri, empty rest_path, undefined selectedDocuments', () => {
      const restQuery = new RestQuery(fakeServer, {
        rest_path: '',
      });

      return restQuery.checkIfItIsRelevant({selectedDocuments: undefined})
      .then(ret => {
        expect(ret).to.be(true);
      });
    });

    it('NOT empty uri, rest_body does not depend on entity, undefined selectedDocuments', () => {
      const restQuery = new RestQuery(fakeServer, {
        rest_body: 'doesNotDependEntity',
      });

      return restQuery.checkIfItIsRelevant({selectedDocuments: undefined})
      .then(ret => {
        expect(ret).to.be(true);
      });
    });
  });

  describe('checkIfItIsRelevant - should fail', () => {

    it('NOT empty uri, NOT empty activation_rules should reject as it is not able to fetch the document', () => {
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: [{
          s: '@doc[_source][does_not_exist]@',
          p: 'exists'
        }]
      });

      return restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']})
      .catch(err => {
        expect(err.message).to.eql('Could not fetch document [//company/company], check logs for details please.');
      });
    });

    it('NOT empty uri, NOT empty rest_path reject as it is undefined selectedDocuments', () => {
      const restQuery = new RestQuery(fakeServer, {
        rest_path: '/id=@doc[id]@'
      });

      return restQuery.checkIfItIsRelevant({selectedDocuments: undefined})
      .then(ret => {
        expect(ret).to.be(false);
      });
    });

    it('NOT empty uri, NOT empty rest_body should reject as it is undefined selectedDocuments', () => {
      const restQuery = new RestQuery(fakeServer, {
        rest_body: '/id=@doc[id]@'
      });

      return restQuery.checkIfItIsRelevant({selectedDocuments: undefined})
      .then(ret => {
        expect(ret).to.be(false);
      });
    });
  });

  describe('fetchResults test if correct arguments are passed to generateCacheKey', () => {
    it('test that username is passed when there are credentials in options', () => {
      const cacheMock = {
        get: key => '',
        set: (key, value, time) => {}
      };

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

      sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
      return restQuery.fetchResults({credentials: {username: 'fred'}}).then(res => {
        expect(res).to.eql(fakeDoc1);
        expect(spy.callCount).to.equal(1);
        expect(spy.calledWithExactly('GET', 'http://localhost:3000/posts', '', '{}', '{}', '', 'fred')).to.be.ok();
      });
    });
  });

  describe('fetchResults', () => {

    it('simple get request', () => {
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

      sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
      return restQuery.fetchResults('').then(res => {
        expect(res).to.eql(fakeDoc1);
      });
    });

    it('simple post request', () => {
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

      sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
      return restQuery.fetchResults('')
      .then(res => {
        expect(res).to.eql(fakeDoc1);
      });
    });

    it('method different than GET or POST should fail', () => {
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

      sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
      return restQuery.fetchResults('')
      .catch(err => {
        expect(err.message).to.equal('Only GET|POST methods are supported at the moment');
      });
    });

    it('request with username and password', () => {
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

      sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc2));
      return restQuery.fetchResults('').then(res => {
        expect(res).to.eql(fakeDoc2);
      });
    });

    describe('passing headers', () => {
      it('from datasource are correctly passed', () => {
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

        const stub = sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
        return restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(stub.getCall(0).args[0].headers).to.eql({ header1: 'value1' });
        });
      });

      it('from query are correctly passed', () => {
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

        const stub = sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
        return restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(stub.getCall(0).args[0].headers).to.eql({ header1: 'value1' });
        });
      });

      it('from both datasource and query are correctly passed', () => {
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

        const stub = sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
        return restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(stub.getCall(0).args[0].headers).to.eql({
            header1: 'value1',
            header2: 'value2',
          });
        });
      });

      it('from both datasource and query are correctly passed', () => {
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

        const stub = sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
        return restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(stub.getCall(0).args[0].headers).to.eql({
            header1: 'valueOverridden',
            header2: 'value2',
          });
        });
      });
    });

    describe('passing parameters', () => {
      it('from datasource are correctly passed', () => {
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

        const stub = sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
        return restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(stub.getCall(0).args[0].qs).to.eql({ param1: 'value1' });
        });
      });

      it('from query are correctly passed', () => {
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

        const stub = sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
        return restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(stub.getCall(0).args[0].qs).to.eql({ param1: 'value1' });
        });
      });

      it('from both datasource and query are correctly passed', () => {
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

        const stub = sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
        return restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(stub.getCall(0).args[0].qs).to.eql({
            param1: 'value1',
            param2: 'value2',
          });
        });
      });

      it('from both datasource and query are correctly passed', () => {
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

        const stub = sinon.stub(rp, 'Request').returns(Promise.resolve(fakeDoc1));
        return restQuery.fetchResults('').then(res => {
          expect(res).to.eql(fakeDoc1);
          expect(stub.getCall(0).args[0].qs).to.eql({
            param1: 'valueOverridden',
            param2: 'value2',
          });
        });
      });
    });

  });


});
