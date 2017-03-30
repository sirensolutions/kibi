export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        title: 'Server Status',
        main: 'plugins/status_page/status_page',
        hidden: true,
        url: '/status',

        // kibi: used by the elasticsearch diagnostics
        injectVars: function (server, options) {
          const config = server.config();
          return {
            kbnIndex: config.get('kibana.index')
          };

        }
      }
    }
  });
};
