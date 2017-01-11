import mockery from 'mockery';
import Promise from 'bluebird';
import expect from 'expect.js';
import sinon from 'sinon';
import RestQuery from '../../queries/rest_query';

const fakeServer = {
  log: function (tags, data) {},
  config: function () {
    return {
      get: function (key) {
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
        search: function () {
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

describe('RestQuery', function () {

  before(function (done) {
    mockery.enable({
      warnOnReplace: false,
      warnOnUnregistered: false,
      useCleanCache: true
    });

    mockery.registerMock('request-promise', function (rpOptions) {

      // here return different resp depends on rpOptions.href
      if (rpOptions.uri.href === 'http://localhost:3000/posts') {
        return Promise.resolve(fakeDoc1);
      } else if (rpOptions.uri.href === 'http://localhost:3000/user/1') {
        return Promise.resolve(fakeDoc2);
      }
    });

    done();
  });

  after(function (done) {
    mockery.disable();
    mockery.deregisterAll();
    done();
  });

  describe('checkIfItIsRelevant - should be active', function () {

    it('empty uri, empty activation_rules', function (done) {
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: []
      });

      restQuery.checkIfItIsRelevant({}).then(function (ret) {
        expect(ret).to.be(true);
        done();
      });
    });

    it('NOT empty uri, empty activation_rules', function (done) {
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: []
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).then(function (ret) {
        expect(ret).to.be(true);
        done();
      });
    });

    it('NOT empty uri, activation_rules does not exists, ignored old activationQuery param', function (done) {
      const restQuery = new RestQuery(fakeServer, {
        activationQuery: '^/company'
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).then(function (ret) {
        expect(ret).to.be(true);
        done();
      });
    });
  });

  describe('checkIfItIsRelevant - should fail', function () {

    it('NOT empty uri, NOT empty activation_rules should reject as it is not able to fetch the document', function (done) {
      const restQuery = new RestQuery(fakeServer, {
        activation_rules: [{
          s: '@doc[_source][does_not_exist]@',
          p: 'exists'
        }]
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).catch(function (err) {
        expect(err.message).to.eql('Could not fetch document [//company/company], check logs for details please.');
        done();
      });
    });

  });

  describe('fetchResults test if correct arguments are passed to generateCacheKey', function () {
    it('test that username is passed when there are credentials in options', function (done) {
      const cacheMock = {
        get: function (key) { return '';},
        set: function (key, value, time) {}
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
            populateParameters: function () {
              return '';
            }
          }
        }
      }, cacheMock);

      const spy = sinon.spy(restQuery, 'generateCacheKey');

      restQuery.fetchResults({credentials: {username: 'fred'}}).then(function (res) {
        expect(res).to.eql(fakeDoc1);
        expect(spy.callCount).to.equal(1);
        expect(spy.calledWithExactly('GET', 'http://localhost:3000/posts', '', '{}', '{}', '', 'fred')).to.be.ok();
        done();
      });
    });
  });

  describe('fetchResults', function () {

    it('simple get request', function (done) {
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
            populateParameters: function () {
              return '';
            }
          }
        }
      });

      restQuery.fetchResults('').then(function (res) {
        expect(res).to.eql(fakeDoc1);
        done();
      });
    });

    it('simple post request', function (done) {
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
            populateParameters: function () {
              return '';
            }
          }
        }
      });

      restQuery.fetchResults('').then(function (res) {
        expect(res).to.eql(fakeDoc1);
        done();
      });
    });

    it('method different than GET or POST should fail', function (done) {
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
            populateParameters: function () {
              return '';
            }
          }
        }
      });

      restQuery.fetchResults('').catch(function (err) {
        expect(err.message).to.equal('Only GET|POST methods are supported at the moment');
        done();
      });
    });

    it('request with username and password', function (done) {
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
            populateParameters: function () {
              return '';
            }
          }
        }
      });

      restQuery.fetchResults('').then(function (res) {
        expect(res).to.eql(fakeDoc2);
        done();
      });
    });

  });


});
