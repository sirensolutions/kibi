const expect = require('expect.js');
const ngMock = require('ngMock');
const Promise = require('bluebird');
const sinon = require('auto-release-sinon');

let kibiSessionHelper;
let globalState;
let $cookies;
let $rootScope;
let kibiState;

let saveSessionCounter;
let getSaveSessionCounter;
let deleteSessionCounter;

const resetCounters = function () {
  saveSessionCounter = 0;
  getSaveSessionCounter = 0;
  deleteSessionCounter = 0;
};

const savedSessionsMocks = {
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

const makeSureKibiSessionHelperInitialized = function (kibiSessionHelper) {
  if (kibiSessionHelper.initialized) {
    return Promise.resolve(true);
  } else {
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resolve(true);
        });
      }, 100);
    });
  }
};

describe('Kibi Components', function () {
  describe('KibiSessionHelper', function () {

    require('testUtils/noDigestPromises').activateForSuite();

    beforeEach(function () {
      ngMock.module('kibana', function ($provide) {
        $provide.constant('kbnDefaultAppId', '');
        $provide.constant('kibiDefaultDashboardTitle', '');
        $provide.constant('elasticsearchPlugins', []);

        $provide.service('savedSessions', function () {
          return {
            get: function (id) {
              getSaveSessionCounter++;
              let mock;
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

      ngMock.inject(function (_kibiState_, Private, _$cookies_,  _$rootScope_, _globalState_) {
        kibiState = _kibiState_;
        $rootScope = _$rootScope_;
        $cookies = _$cookies_;
        globalState = _globalState_;
        kibiSessionHelper = Private(require('ui/kibi/helpers/kibi_session_helper/kibi_session_helper'));
      });
    });

    describe('getId', function () {

      it('getId when there is: no cookie, no session in es', function (done) {
        const expectedId = 'does_not_exist';
        sinon.stub(kibiSessionHelper, '_generateId', function () {
          return expectedId;
        });

        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          kibiSessionHelper.destroy();

          return kibiSessionHelper.getId().then(function (id) {
            expect(id).to.eql(expectedId);
            expect($cookies.get('ksid')).to.eql(expectedId);
            expect(saveSessionCounter).to.be(1);
            done();
          });
        }).catch(done);
      });

      it('getId when there is: a cookie, no session in es', function (done) {
        const expectedId = 'does_not_exist';
        sinon.stub(kibiSessionHelper, '_generateId', function () {
          return expectedId;
        });

        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          kibiSessionHelper.destroy();
          $cookies.put('ksid', expectedId);

          return kibiSessionHelper.getId().then(function (id) {
            expect(id).to.eql(expectedId);
            expect($cookies.get('ksid')).to.eql(expectedId);
            expect(saveSessionCounter).to.be(1);
            done();
          });
        }).catch(done);
      });

      it('getId when there is: a cookie and session exists in es', function (done) {
        const expectedId = 'exists';
        sinon.stub(kibiSessionHelper, '_generateId', function () {
          return expectedId;
        });

        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          kibiSessionHelper.destroy();
          $cookies.put('ksid', expectedId);

          return kibiSessionHelper.getId().then(function (id) {
            expect(id).to.eql(expectedId);
            expect($cookies.get('ksid')).to.eql(expectedId);
            expect(saveSessionCounter).to.be(0);
            done();
          });
        }).catch(done);
      });

    });

    describe('copySessionFrom', function () {

      it('should not copy anything if either session is undefined', function (done) {
        return Promise.all([
          kibiSessionHelper._copySessionFromTo('', 'toId'),
          kibiSessionHelper._copySessionFromTo('fromId', '')
        ])
        .then(function () {
          expect(saveSessionCounter).to.be(0);
          done();
        }).catch(done);
      });

      it('copy', function (done) {
        const expectedId = 'toId';
        sinon.stub(kibiSessionHelper, '_generateId', function () {
          return expectedId;
        });

        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          kibiSessionHelper.destroy();

          return kibiSessionHelper._copySessionFromTo('fromId', 'toId').then(function (savedSession) {
            expect(savedSession.session_data.secret).to.eql(42);
            expect(savedSession.id).to.eql(expectedId);
            expect(saveSessionCounter).to.be(1);
            expect(getSaveSessionCounter).to.be(2);
            done();
          });
        }).catch(done);
      });

      it('destroy', function (done) {
        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          kibiSessionHelper.id = 'A';
          $cookies.put('ksid', 'A');
          kibiSessionHelper.destroy();

          expect(kibiState.getSessionId()).to.be(undefined);
          return kibiSessionHelper.getId().then(function (sessionId) {
            expect(sessionId).not.eql('A');
            expect($cookies.get('ksid')).not.eql('A');
            done();
          });
        }).catch(done);
      });

    });

    describe('get put ', function () {

      it('saved data should equal retrieved data - there is no cookie - forced save', function (done) {
        const expectedId = 'putget';
        const testData = {secret: 1};
        sinon.stub(kibiSessionHelper, '_generateId', function () {
          return expectedId;
        });
        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          $cookies.remove('ksid');

          return kibiSessionHelper.putData(testData, true).then(function () {
            return kibiSessionHelper.getData().then(function (data) {
              expect(saveSessionCounter).to.be(1);
              expect(getSaveSessionCounter).to.be(0);
              expect(data).to.eql(testData);
              done();
            });
          });
        }).catch(done);
      });

      it('saved data should equal retrieved data - there is cookie - forced save', function (done) {
        const expectedId = 'putget';
        const testData = {secret: 1};

        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          $cookies.put('ksid', expectedId);

          return kibiSessionHelper.putData(testData, true).then(function () {
            return kibiSessionHelper.getData().then(function (data) {
              expect(saveSessionCounter).to.be(1);
              expect(getSaveSessionCounter).to.be(0);
              expect(data).to.eql(testData);
              done();
            });
          });
        }).catch(done);
      });

      it('saved data should equal retrieved data - there is no cookie', function (done) {
        const expectedId = 'putget';
        const testData = {secret: 1};
        sinon.stub(kibiSessionHelper, '_generateId', function () {
          return expectedId;
        });
        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          $cookies.remove('ksid');

          return kibiSessionHelper.putData(testData).then(function () {
            return kibiSessionHelper.getData().then(function (data) {
              expect(saveSessionCounter).to.be(0);
              expect(getSaveSessionCounter).to.be(0);
              expect(data).to.eql(testData);
              done();
            });
          });
        }).catch(done);
      });

      it('saved data should equal retrieved data - there is cookie', function (done) {
        const expectedId = 'putget';
        const testData = {secret: 1};

        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          $cookies.put('ksid', expectedId);

          return kibiSessionHelper.putData(testData).then(function () {
            return kibiSessionHelper.getData().then(function (data) {
              expect(saveSessionCounter).to.be(0);
              expect(getSaveSessionCounter).to.be(0);
              expect(data).to.eql(testData);
              done();
            });
          });
        }).catch(done);
      });

    });

    describe('recreate session when deleted by', function () {

      it('emit kibi:session:changed:deleted', function (done) {
        const expectedId1 = 'expectedId1';
        const expectedId2 = 'expectedId2';
        let counter = 1;
        sinon.stub(kibiSessionHelper, '_generateId', function () {
          if (counter === 1) {
            counter++;
            return expectedId1;
          } else if (counter === 2) {
            counter++;
            return expectedId2;
          }
          throw new Error('Unexpected call to _generateId function');
        });

        makeSureKibiSessionHelperInitialized(kibiSessionHelper).then(function () {
          resetCounters();
          kibiSessionHelper.destroy();

          return kibiSessionHelper.getId().then(function (sessionId1) {
            expect(sessionId1).to.equal(expectedId1);
            // now set up spys and emit event
            const destroySpy = sinon.spy(kibiSessionHelper, 'destroy');
            const initSpy = sinon.spy(kibiSessionHelper, 'init');
            $rootScope.$emit('kibi:session:changed:deleted', expectedId1);

            setTimeout(function () {
              try {
                expect(kibiSessionHelper.id).to.equal(expectedId2);
                expect(destroySpy.callCount).to.equal(1);
                expect(destroySpy.calledBefore(initSpy)).to.be(true);
                // here is 2 because init -> getId -> init
                expect(initSpy.callCount).to.equal(2);
              } catch (err) {
                done(err);
              }
              done();
            }, 500);
          });
        }).catch(done);
      });

    });
  });
});
