module.exports = function (server, name) {
  return {
    debug: function (data) {
      server.log(['debug', name], data);
    },
    info: function (data) {
      server.log(['info', name], data);
    },
    warn: function (data) {
      server.log(['warning', name], data);
    },
    error: function (data) {
      server.log(['error', name], data);
    }
  };
};
