define(function (require) {
  const _ = require('lodash');
  const SavedObjectNotFound = require('ui/errors').SavedObjectNotFound;

  return function KibiSessionHelperFactory($rootScope, $cookies, savedSessions, Promise, config, kibiState, createNotifier) {

    var notify = createNotifier({
      location: 'KibiSessionHelper'
    });

    function KibiSessionHelper() {
      this.initialized = false;
    }

    KibiSessionHelper.prototype.init = function () {
      var self = this;
      if (self.initialized) {
        return Promise.resolve(self.id);
      }

      self.destroyListener1 = $rootScope.$on('kibi:session:changed:deleted', function (event, deletedId) {
        // destroy and init the session only if current one was deleted from elasticsearch
        self.getId().then(function (currentId) {
          if (currentId === deletedId) {
            self.destroy();
            self.init();
          }
        });
      });

      self.destroyListener2 = $rootScope.$on('$routeChangeSuccess', function () {
        var self = this;
        var s = kibiState.getSessionId();

        if (!s) {
          // no sesion id
          self.getId().then(function (sessionId) {
            kibiState.setSessionId(sessionId);
            kibiState.save();
          }).catch(notify.error);

        } else {
          // there is a sesion id
          self.getId().then(function (sessionId) {
            if (s !== sessionId) {
              return self._copySessionFrom(s).then(function (savedSession) {
                kibiState.setSessionId(sessionId);
                kibiState.save();
              }).catch(function (err) {
                notify.error(err);
                if (err instanceof SavedObjectNotFound) {
                  // something happen and the session object does not exists anymore
                  // override the non-existing sessionId from the url
                  // to prevent the error happenning again
                  kibiState.setSessionId(sessionId);
                  kibiState.save();
                }
              });
            }
          }).catch(notify.error);
        }
      });

      var cookieId = $cookies.get('ksid');
      if (cookieId) {
        self.id = cookieId;
      } else {
        self.id = self._generateId();
        $cookies.put('ksid', self.id, {expires: self._getExpiresDate()});
      }

      return new Promise(function (fulfill, reject) {
        savedSessions.get(self.id).then(function (savedSession) {
          self.initialized = true;
          self.savedSession = savedSession;
          fulfill(self.id);
        }).catch(function (err) {
          savedSessions.get().then(function (savedSession) {
            savedSession.title = self.id;
            savedSession.id = self.id;
            savedSession.session_data = {};
            savedSession.timeCreated = new Date();
            self._updateOrCreate(savedSession).then(function (savedSession) {
              self.savedSession = savedSession;
              self.initialized = true;
              fulfill(self.id);
            }).catch(reject);
          });
        });
      });
    };

    KibiSessionHelper.prototype._getExpiresDate = function () {
      var d = new Date();
      d.setTime(d.getTime() + (config.get('kibi:session_cookie_expire') * 1000));
      return d;
    };

    KibiSessionHelper.prototype._generateId = function () {
      return 'xxxxxxxxxx'.replace(/[x]/g, function (c) {
        var r = Math.random() * 16 | 0;
        return r.toString(16);
      });
    };

    KibiSessionHelper.prototype.getId = function () {
      return this.init();
    };

    KibiSessionHelper.prototype.getData = function () {
      return this.getId().then(() => this.savedSession.session_data);
    };

    KibiSessionHelper.prototype.putData = function (data) {
      var self = this;
      return self.getId().then(function () {
        self.savedSession.session_data = data;
        return self._updateOrCreate(self.savedSession);
      });
    };

    KibiSessionHelper.prototype._updateOrCreate = function (savedSession) {
      return new Promise(function (fulfill, reject) {
        savedSession.timeUpdated = new Date();
        savedSession.save(true).then(function () {
          fulfill(savedSession);
        }).catch(function (err) {
          reject(new Error('Could not save the session ' + savedSession.id));
        });
      });
    };

    KibiSessionHelper.prototype.destroy = function () {
      $cookies.remove('ksid');
      delete this.id;
      delete this.session_data;
      this.initialized = false;
      if (_.isFunction(this.destroyListener1)) {
        this.destroyListener1();
      }
      if (_.isFunction(this.destroyListener2)) {
        this.destroyListener2();
      }
    };

    KibiSessionHelper.prototype._copySessionFrom = function (idFrom) {
      var self = this;
      self.destroy();
      return self.getId().then((toId) => {
        return Promise.all([savedSessions.get(toId), savedSessions.get(idFrom)]).then(([toSavedSession, fromSavedSession]) => {
          toSavedSession.session_data = fromSavedSession.session_data;
          return self._updateOrCreate(toSavedSession);
        });
      });
    };


    return new KibiSessionHelper();
  };
});
