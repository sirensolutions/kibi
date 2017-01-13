import management from 'ui/management';
import 'plugins/kibi_core/management/sections/kibi_dashboard_groups/controllers/dashboard_groups_editor';

management.getSection('kibana').register('dashboardgroups', {
  display: 'Dashboard Groups',
  order: 14,
  url: '#/management/kibana/dashboardgroups'
});
