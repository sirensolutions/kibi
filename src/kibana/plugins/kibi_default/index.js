define(function (require) {

  require('routes')
  .when('/default', {
    resolve: {
      path: function (Private, Promise, configFile, kbnUrl) {
        var urlHelper   = Private(require('components/kibi/url_helper/url_helper'));

        return new Promise(function (resolve, reject) {
          urlHelper.getInitialPath().then(function (path) {
            resolve(path);
            kbnUrl.redirect(path);
          }).catch(function (err) {
            var path = '/' + configFile.default_app_id;
            resolve(path);
            kbnUrl.redirect(path);
          });
        });
      }
    }
  });

  return {
    order: Infinity,
    name: 'kibi_default',
    display: 'Kibi default',
    url: '#/default'
  };
});
