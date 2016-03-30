var expect = require('expect.js');
var ngMock = require('ngMock');
var Promise = require('bluebird');

var kibiSessionHelper;
var globalState;
var $cookies;
var $rootScope;

var saveSessionCounter;
var getSaveSessionCounter;
var deleteSessionCounter;

var savedSessionsMocks = {
  putget: {
    id: 'putget'
  },
  exists: {
    id: 'exists'
  },
  toId: {
    id: 'toId'
  },
  fromId: {
    id: 'fromId',
    session_data: {secret: 42}
  }
};


describe('Kibi Components', function () {
  describe('KibiSessionHelper', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.service('savedSessions', function () {
          return {
            get: function (id) {
              getSaveSessionCounter++;
              var mock;
              if (id === undefined) {
                mock = {
                  id: undefined
                };
              } else {
                mock = savedSessionsMocks[id];
                if (!mock) {
                  return Promise.reject(new Error('Session [' + id + '] does not exists'));
                }
              }

              mock.save = function () {
                saveSessionCounter++;
                return Promise.resolve(this.id);
              };

              mock.delete = function () {
                deleteSessionCounter++;
                return Promise.resolve(this.id);
              };

              return Promise.resolve(mock);
            }
          };
        });
      });

      ngMock.inject(function ($injector, Private, _$cookies_,  _$rootScope_, _globalState_, _$location_) {
        $rootScope = _$rootScope_;
        $cookies = _$cookies_;
        globalState = _globalState_;
        kibiSessionHelper = Private(require('ui/kibi/helpers/kibi_state_helper/kibi_session_helper'));
      });

      saveSessionCounter = 0;
      getSaveSessionCounter = 0;
      deleteSessionCounter = 0;
    });

    describe('getId', function () {

      it('getId when there is: no cookie, no session in es', function (done) {
        var expectedId = 'does_not_exist';
        kibiSessionHelper._generateId = function () {
          return expectedId;
        };
        $cookies.remove('ksid');

        kibiSessionHelper.getId().then(function (id) {
          expect(id).to.eql(expectedId);
          expect($cookies.get('ksid')).to.eql(expectedId);
          expect(saveSessionCounter).to.be(1);
          done();
        }).catch(done);

      });


      it('getId when there is: a cookie, no session in es', function (done) {
        var expectedId = 'does_not_exist';
        kibiSessionHelper._generateId = function () {
          return expectedId;
        };
        $cookies.put('ksid', expectedId);

        kibiSessionHelper.getId().then(function (id) {
          expect(id).to.eql(expectedId);
          expect($cookies.get('ksid')).to.eql(expectedId);
          expect(saveSessionCounter).to.be(1);
          done();
        }).catch(done);
      });

      it('getId when there is: a cookie and session exists in es', function (done) {
        var expectedId = 'exists';
        kibiSessionHelper._generateId = function () {
          return expectedId;
        };
        $cookies.put('ksid', expectedId);

        kibiSessionHelper.getId().then(function (id) {
          expect(id).to.eql(expectedId);
          expect($cookies.get('ksid')).to.eql(expectedId);
          expect(saveSessionCounter).to.be(0);
          done();
        }).catch(done);
      });

    });

    describe('copySessionFrom', function () {

      it('copy', function (done) {
        var expectedId = 'toId';
        kibiSessionHelper._generateId = function () {
          return expectedId;
        };
        $cookies.remove('ksid');

        kibiSessionHelper.copySessionFrom('fromId').then(function (savedSession) {
          expect(savedSession.session_data.secret).to.eql(42);
          expect(savedSession.id).to.eql(expectedId);
          expect($cookies.get('ksid')).to.eql(expectedId);
          expect(saveSessionCounter).to.be(1);
          expect(deleteSessionCounter).to.be(1);
          expect(getSaveSessionCounter).to.be(3);
          done();
        }).catch(done);
      });


      it('destroy', function (done) {
        kibiSessionHelper.id = 'A';
        $cookies.put('ksid', 'A');

        kibiSessionHelper.destroy();
        kibiSessionHelper.getId().then(function (sessionId) {
          expect(sessionId).not.eql('A');
          expect($cookies.get('ksid')).not.eql('A');
          done();
        }).catch(done);
      });

    });

    describe('get put ', function () {

      it('saved data should equal retrieved data - there is no cookie', function (done) {
        var expectedId = 'putget';
        kibiSessionHelper._generateId = function () {
          return expectedId;
        };
        $cookies.remove('ksid');

        var testData = {secret: 1};
        kibiSessionHelper.putData(testData).then(function () {
          return kibiSessionHelper.getData().then(function (data) {
            expect(saveSessionCounter).to.be(1);
            expect(getSaveSessionCounter).to.be(3);
            expect(data).to.eql(testData);
            done();
          });
        }).catch(done);
      });

      it('saved data should equal retrieved data - there is cookie', function (done) {
        var expectedId = 'putget';
        $cookies.put('ksid', expectedId);

        var testData = {secret: 1};
        kibiSessionHelper.putData(testData).then(function () {
          return kibiSessionHelper.getData().then(function (data) {
            expect(saveSessionCounter).to.be(1);
            expect(getSaveSessionCounter).to.be(3);
            expect(data).to.eql(testData);
            done();
          });
        }).catch(done);
      });

    });

  });
});
