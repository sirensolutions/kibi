import expect from 'expect.js';

import {
  remote,
  bdd,
  scenarioManager,
} from '../../../support';

import PageObjects from '../../../support/page_objects';

bdd.describe('visualize app', function describeIndexTests() {
  const fromTime = '2015-09-19 06:31:44.000';
  const toTime = '2015-09-23 18:31:44.000';

  bdd.describe('kibi data table', function indexPatternCreation() {
    bdd.it('should display columns of the saved search', async function () {
      const savedSearchName = 'mysavedsearch';

      // remove the timestamp in the URL
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.header.clickDiscover();

      PageObjects.common.debug('setAbsoluteRange');
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);
      await PageObjects.discover.clickFieldListItem('machine.os');
      await PageObjects.discover.clickFieldListItemAdd('machine.os');
      await PageObjects.discover.clickFieldListItem('bytes');
      await PageObjects.discover.clickFieldListItemAdd('bytes');
      await PageObjects.discover.saveSearch(savedSearchName);
      await PageObjects.header.waitForToastMessageGone();

      await PageObjects.header.clickVisualize();
      await PageObjects.visualize.createNewVisualization();
      await PageObjects.visualize.clickKibiDataTable();

      PageObjects.common.debug('select search');
      await PageObjects.visualize.selectSearch(savedSearchName);

      PageObjects.common.debug(`Set absolute time range from "${fromTime}" to "${toTime}"`);
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      const columnNames = await PageObjects.visualize.getColumnNames();
      PageObjects.common.debug(`column names: ${columnNames}`);
      expect(columnNames).to.eql([ 'machine.os', 'bytes' ]);
    });

    bdd.it('should toggle columns on new search', async function () {
      const vizName = 'kibidatatable1';

      // remove the timestamp in the URL
      await PageObjects.common.navigateToApp('visualize');

      // 2 clicks are necessary to go to the landing page.
      // otherwise, it edits the visualization of the previous test
      await PageObjects.header.clickVisualize();
      await PageObjects.header.clickVisualize();

      await PageObjects.visualize.createNewVisualization();
      await PageObjects.visualize.clickKibiDataTable();
      PageObjects.common.debug('clickNewSearch');
      await PageObjects.visualize.clickNewSearch();

      PageObjects.common.debug(`Set absolute time range from "${fromTime}" to "${toTime}"`);
      await PageObjects.header.setAbsoluteRange(fromTime, toTime);

      // select some fields to display as columns
      await PageObjects.visualize.toggleTableRowDetails();
      await PageObjects.visualize.toggleColumn('@tags');
      await PageObjects.visualize.toggleColumn('agent');

      const columnNames = await PageObjects.visualize.getColumnNames();
      PageObjects.common.debug(`column names: ${columnNames}`);
      expect(columnNames).to.eql([ '@tags', 'agent' ]);

      // check that the columns are still there after save and reload
      await PageObjects.visualize.clickGo();
      PageObjects.common.debug('Waiting...');
      await PageObjects.header.isGlobalLoadingIndicatorHidden();
      const message = await PageObjects.visualize.saveVisualization(vizName);
      PageObjects.common.debug(`Saved viz message = ${message}`);
      expect(message).to.be(`Visualization Editor: Saved Visualization "${vizName}"`);
      await PageObjects.visualize.waitForToastMessageGone();

      await PageObjects.visualize.loadSavedVisualization(vizName);
      await PageObjects.visualize.waitForVisualization();

      const columnNames2 = await PageObjects.visualize.getColumnNames();
      PageObjects.common.debug(`column names: ${columnNames2}`);
      expect(columnNames2).to.eql([ '@tags', 'agent' ]);
    });
  });
});
