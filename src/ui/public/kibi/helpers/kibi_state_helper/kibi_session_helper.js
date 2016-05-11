define(function (require) {
  return function KibiSessionHelperFactory($cookies, savedSessions, Promise, config) {

    function KibiSessionHelper() {
      this.initialized = false;
    }

    KibiSessionHelper.prototype.init = function () {
      var self = this;
      if (self.initialized) {
        return Promise.resolve(self.id);
      }

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
      this.initialized = false;
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
