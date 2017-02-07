define(function (require) {
  var Common = require('../../../support/pages/common');
  var SettingsPage = require('../../../support/pages/settings_page');
  //kibi: angularHelper
  var AngularHelper = require('../../../support/angular');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('creating and deleting default index', function describeIndexTests() {
      var common;
      var settingsPage;
      //kibi: angularHelper
      var angularHelper;

      bdd.before(function () {
        common = new Common(this.remote);
        settingsPage = new SettingsPage(this.remote);
        //kibi: angularHelper
        angularHelper = new AngularHelper(this.remote);

        return scenarioManager.reload('emptyKibana')
        .then(function () {
          return settingsPage.navigateTo()
          .then(() => angularHelper.waitForPendingRequests());
        });
      });

      bdd.describe('index pattern creation', function indexPatternCreation() {
        bdd.before(function () {
          return settingsPage.createIndexPattern();
        });

        bdd.it('should allow setting advanced settings', function () {
          return settingsPage.clickAdvancedTab()
          .then(() => angularHelper.waitForPendingRequests())
          .then(function TestCallSetAdvancedSettingsForTimezone() {
            common.log('calling setAdvancedSetting');
            return settingsPage.setAdvancedSettings('dateFormat:tz', 'America/Phoenix');
          })
          .then(function GetAdvancedSetting() {
            return settingsPage.getAdvancedSettings('dateFormat:tz');
          })
          .then(function (advancedSetting) {
            expect(advancedSetting).to.be('America/Phoenix');
          })
          .catch(common.handleError(this));
        });

      });
    });
  };
});
