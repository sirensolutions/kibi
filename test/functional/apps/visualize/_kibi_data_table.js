define(function (require) {
  const Common = require('../../../support/pages/common');
  const HeaderPage = require('../../../support/pages/header_page');
  const DiscoverPage = require('../../../support/pages/discover_page');
  const VisualizePage = require('../../../support/pages/visualize_page');
  const SettingsPage = require('../../../support/pages/settings_page');
  const expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('visualize app', function describeIndexTests() {
      const fromTime = '2015-09-19 06:31:44.000';
      const toTime = '2015-09-23 18:31:44.000';

      let common;
      let headerPage;
      let discoverPage;
      let visualizePage;
      let settingsPage;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        visualizePage = new VisualizePage(this.remote);
        settingsPage = new SettingsPage(this.remote);

        return scenarioManager.reload('emptyKibana')
        .then(function () {
          common.debug('navigateTo');
          return settingsPage.navigateTo();
        })
        .then(function () {
          common.debug('createIndexPattern');
          return settingsPage.createIndexPattern();
        })
        .then(function () {
          common.debug('click on the default index button');
          return settingsPage.clickDefaultIndexButton();
        })
        .then(function getSpinnerDone() {
          common.debug('Waiting...');
          return headerPage.getSpinnerDone();
        })
        .catch(common.handleError(this));
      });

      bdd.describe('kibi data table', function indexPatternCreation() {
        bdd.it('should toggle columns on new search', function () {
          const vizName = 'kibidatatable1';

          // remove the timestamp in the URL
          return common.navigateToApp('visualize')
          .then(() => {
            return headerPage.clickVisualize();
          })
          .then(() => {
            return visualizePage.clickKibiDataTable();
          })
          .then(() => {
            common.debug('clickNewSearch');
            return visualizePage.clickNewSearch();
          })
          .then(() => {
            common.debug(`Set absolute time range from "${fromTime}" to "${toTime}"`);
            return headerPage.setAbsoluteRange(fromTime, toTime);
          })
          .then(() => {
            // select some fields to display as columns
            return visualizePage.toggleTableRowDetails();
          })
          .then(() => {
            return visualizePage.toggleColumn('@tags');
          })
          .then(() => {
            return visualizePage.toggleColumn('agent');
          })
          .then(() => {
            return visualizePage.getColumnNames();
          })
          .then(columnNames => {
            common.debug(`column names: ${columnNames}`);
            expect(columnNames).to.eql([ '@tags', 'agent' ]);
            // check that the columns are still there after save and reload
            return visualizePage.clickGo();
          })
          .then(function getSpinnerDone() {
            common.debug('Waiting...');
            return headerPage.getSpinnerDone();
          })
          .then(() => {
            return visualizePage.saveVisualization(vizName);
          })
          .then(message => {
            common.debug(`Saved viz message = ${message}`);
            expect(message).to.be(`Visualization Editor: Saved Visualization "${vizName}"`);
            return visualizePage.waitForToastMessageGone();
          })
          .then(() => {
            return visualizePage.loadSavedVisualization(vizName);
          })
          .then(() => {
            return visualizePage.waitForVisualization();
          })
          .then(() => {
            return visualizePage.getColumnNames();
          })
          .then(columnNames => {
            common.debug(`column names: ${columnNames}`);
            expect(columnNames).to.eql([ '@tags', 'agent' ]);
          });
        });
      });
    });
  };
});
