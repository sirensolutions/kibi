import uiRoutes from 'ui/routes';
import devTools from 'ui/registry/dev_tools';
import 'plugins/kibana/dev_tools/directives/dev_tools_app';
// kibi: added by kibi
import translateJoinQueryIndexTemplate from './views/translate_join_query_index.html';
import './directives/translate_join_query';
// kibi:end

uiRoutes
.when('/dev_tools', {
  resolve: {
    redirect(Private, kbnUrl) {
      const items = Private(devTools).inOrder;
      kbnUrl.redirect(items[0].url.substring(1));
    }
  }
})
// kibi: added by kibi
.when('/dev_tools/translateJoinQuery', {
  template: translateJoinQueryIndexTemplate
});
// kibi: end