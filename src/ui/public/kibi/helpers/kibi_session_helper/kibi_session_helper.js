define(function (require) {
  const _ = require('lodash');

  return function KibiSessionHelperFactory($rootScope, $cookies, savedSessions, Promise, config, kibiState, createNotifier) {

    var notify = createNotifier({
      location: 'KibiSessionHelper'
    });

    const _resetInitFlags = function () {
      this.initializing = false;
      this.initialized = false;
      this.dirty = false;
    };

    const _initDone = function () {
      this.initialized = true;
      this.initializing = false;
    };

    function KibiSessionHelper() {
      _resetInitFlags.apply(this);
      this.init();
    }

    KibiSessionHelper.prototype.init = function () {
      var self = this;
      if (self.initialized) {
        return Promise.resolve(self.id);
      } else {
        if (self.initializing) {
          return new Promise(function (resolve, reject) {
            setTimeout(function () {
              self.init().then(function () {
                resolve(self.id);
              });
            }, 100);
          });
        } else {
          self.initializing = true;
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
            var s = kibiState.getSessionId();
            if (!s) {
              // no sesion id
              kibiState.setSessionId(self.id);
              kibiState.save();
            }
            if (s !== self.id) {
              self._copySessionFromTo(s, self.id).catch(notify.warning);
            }
          });

          var cookieId = $cookies.get('ksid');
          if (cookieId) {
            self.id = cookieId;
          } else {
            self.id = self._generateId();
            $cookies.put('ksid', self.id, {expires: self._getExpiresDate()});
          }

          var s = kibiState.getSessionId();
          if (!s || s !== self.id) {
            // no sesion id
            kibiState.setSessionId(self.id);
            kibiState.save();
          }

          return new Promise(function (fulfill, reject) {
            savedSessions.get(self.id).then(function (savedSession) {
              // make sure to always sync it first
              self.savedSession = savedSession;
              if (s !== self.id) {
                self._copySessionFromTo(s, self.id).then(function () {
                  _initDone.apply(self);
                  fulfill(self.id);
                }).catch(function (err) {
                  notify.warning(err); // notify that was not able to copy
                  _initDone.apply(self);
                  fulfill(self.id);
                });
              } else {
                _initDone.apply(self);
                fulfill(self.id);
              }
            }).catch(function (err) {
              // could not get the session with self.id lets create new one
              savedSessions.get().then(function (savedSession) {
                savedSession.title = self.id;
                savedSession.id = self.id;
                savedSession.session_data = {};
                savedSession.timeCreated = new Date();
                self.savedSession = savedSession;
                return self._syncToIndex(savedSession).then(function () {
                  if (s !== self.id) {
                    self._copySessionFromTo(s, self.id).then(function () {
                      _initDone.apply(self);
                      fulfill(self.id);
                    }).catch(function (err) {
                      notify.warning(err); // notify that was not able to copy
                      _initDone.apply(self);
                      fulfill(self.id);
                    });
                  } else {
                    _initDone.apply(self);
                    fulfill(self.id);
                  }
                });
              }).catch(reject);
            });
          });
        }
      }
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

    KibiSessionHelper.prototype.putData = function (data, force) {
      return this.getId().then(() => {
        this.savedSession.session_data = data;
        if (!force) {
          this.dirty = true;
          return this.savedSession;
        } else {
          return this._syncToIndex(this.savedSession);
        }
      });
    };

    KibiSessionHelper.prototype.flush = function () {
      return this.getId().then(() => {
        if (this.dirty) {
          return this._syncToIndex(this.savedSession);
        } else {
          return this.savedSession;
        }
      });
    };

    KibiSessionHelper.prototype.isDirty = function () {
      return this.getId().then(() => {
        return this.dirty;
      });
    };

    KibiSessionHelper.prototype._syncToIndex = function (savedSession) {
      var self = this;
      return new Promise(function (fulfill, reject) {
        savedSession.timeUpdated = new Date();
        savedSession.save(true).then(function () {
          self.dirty = false;
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
      _resetInitFlags.apply(this);
      if (_.isFunction(this.destroyListener1)) {
        this.destroyListener1();
      }
      if (_.isFunction(this.destroyListener2)) {
        this.destroyListener2();
      }
    };

    KibiSessionHelper.prototype._copySessionFromTo = function (fromId, toId) {
      var self = this;
      return Promise.all([savedSessions.get(toId), savedSessions.get(fromId)]).then(([toSavedSession, fromSavedSession]) => {
        toSavedSession.session_data = fromSavedSession.session_data;
        self.savedSession = toSavedSession;
        return self._syncToIndex(toSavedSession);
      });
    };


    return new KibiSessionHelper();
  };
});
