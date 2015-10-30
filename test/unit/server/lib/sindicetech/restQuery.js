var root = require('requirefrom')('');
var mockery = require('mockery');
var Promise = require('bluebird');
var expect = require('expect.js');
var restQuery;

var fakeDoc1 = {
  id: 'post1',
  title: 'title1'
};

var fakeDoc2 = {
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

    mockery.registerMock('request-promise', function (rp_options) {

      // here return different resp depends on rp_options.href
      if (rp_options.uri.href === 'http://localhost:3000/posts') {
        return Promise.resolve(fakeDoc1);
      } else if (rp_options.uri.href === 'http://localhost:3000/user/1') {
        return Promise.resolve(fakeDoc2);
      } else {
        return Promise.reject(new Error('Document does not exists'));
      }
    });

    done();
  });

  after(function (done) {
    mockery.disable();
    mockery.deregisterAll();
    done();
  });

  describe('checkIfItIsRelevant - should be', function () {

    it('empty uri, empty activationQuery', function (done) {
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
        activationQuery: ''
      });

      restQuery.checkIfItIsRelevant({}).then(function (ret) {
        expect(ret).to.eql({ boolean: true });
        done();
      });
    });

    it('NOT empty uri, empty activationQuery', function (done) {
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
        activationQuery: ''
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).then(function (ret) {
        expect(ret).to.eql({ boolean: true });
        done();
      });
    });

    it('NOT empty uri, NOT empty activationQuery', function (done) {
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
        activationQuery: '^/company'
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).then(function (ret) {
        expect(ret).to.eql({ boolean: true });
        done();
      });
    });
  });

  describe('checkIfItIsRelevant - should NOT be', function () {

    it('NOT empty uri, NOT empty activationQuery', function (done) {
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
        activationQuery: '^/people'
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).then(function (ret) {
        expect(ret).to.eql({ boolean: false });
        done();
      });
    });

  });

  describe('checkIfItIsRelevant - should reject', function () {

    it('cause wrong regex', function (done) {
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
        activationQuery: 'd\\'
      });

      restQuery.checkIfItIsRelevant({selectedDocuments: ['/company/company/id1']}).catch(function (err) {
        expect(err.message).to.equal('Problem parsing regex [d\\]');
        done();
      });
    });

  });


  describe('fetchResults', function () {

    it('simple get request', function (done) {
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
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
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
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
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
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
      var RestQuery = root('src/server/lib/sindicetech/restQuery');
      var restQuery = new RestQuery({
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
