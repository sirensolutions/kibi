import 'ngreact';
import { uiModules } from 'ui/modules';
import DatasourceTree from './datasource_tree';

const app = uiModules.get('app/kibana', ['react']);
app.directive('datasourceTree', function (reactDirective) {
  return reactDirective(DatasourceTree);
});
