module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        title: 'Server Status',
        main: 'plugins/statusPage/statusPage',
        hidden: true,
        url: '/status',

        autoload: [].concat(
          kibana.autoload.styles,
          'ui/chrome',
          'angular'
        ),
        injectVars: function (server, options) {
          let config = server.config();
          return {
            kbnIndex: config.get('kibana.index')
          };

        }
      }
    }
  });
};
