define(function (require) {
  var Common = require('../../../support/pages/common');
  var HeaderPage = require('../../../support/pages/header_page');
  var SettingsPage = require('../../../support/pages/settings_page');
  var DiscoverPage = require('../../../support/pages/discover_page');
  // kibi: angularHelper
  var AngularHelper = require('../../../support/angular');
  var expect = require('intern/dojo/node!expect.js');

  return function (bdd, scenarioManager) {
    bdd.describe('shared links', function describeIndexTests() {
      var common;
      var headerPage;
      var settingsPage;
      var discoverPage;
      // kibi: angularHelper
      var angularHelper;
      var baseUrl;
      // The message changes for Firefox < 41 and Firefox >= 41
      // var expectedToastMessage = 'Share search: URL selected. Press Ctrl+C to copy.';
      // var expectedToastMessage = 'Share search: URL copied to clipboard.';
      // Pass either one.
      var expectedToastMessage = /Share search: URL (selected. Press Ctrl+C to copy.|copied to clipboard.)/;

      bdd.before(function () {
        common = new Common(this.remote);
        headerPage = new HeaderPage(this.remote);
        settingsPage = new SettingsPage(this.remote);
        discoverPage = new DiscoverPage(this.remote);
        // kibi: angularHelper
        angularHelper = new AngularHelper(this.remote);

        baseUrl = common.getHostPort();

        var fromTime = '2015-09-19 06:31:44.000';
        var toTime = '2015-09-23 18:31:44.000';

        // start each test with an empty kibana index
        return scenarioManager.reload('emptyKibana')
        // and load a set of makelogs data
        .then(function loadIfEmptyMakelogs() {
          return scenarioManager.loadIfEmpty('logstashFunctional');
        })
        .then(function (navigateTo) {
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
        //kibi: disable the hashed urls which we turned on by default
        .then(function () {
          common.debug('disable the hashed urls');
          return settingsPage.clickAdvancedTab();
        })
        .then(function () {
          common.debug('disable the hashed urls');
          return settingsPage.setAdvancedSettings('state:storeInSessionStorage', false);
        })
        .then(function GetAdvancedSetting() {
          common.debug('check that hashed urls are disabled');
          return settingsPage.getAdvancedSettings('state:storeInSessionStorage');
        })
        .then(function (advancedSetting) {
          expect(advancedSetting).to.be('false');
        })
        //kibi: end
        .then(function () {
          common.debug('discover');
          return common.navigateToApp('discover');
        })
        .then(function () {
          common.debug('setAbsoluteRange');
          return headerPage.setAbsoluteRange(fromTime, toTime);
        })
        .catch(common.handleError(this));
      });


      bdd.describe('shared link', function () {

        bdd.it('should show "Share a link" caption', function () {
          var expectedCaption = 'Share a link';
          return discoverPage.clickShare()
          // kibi: wait for session to be flushed
          .then(() => angularHelper.waitForPendingRequests())
          .then(function () {
            return discoverPage.getShareCaption();
          })
          .then(function (actualCaption) {
            expect(actualCaption).to.be(expectedCaption);
          })
          .catch(common.handleError(this));
        });


        bdd.it('should show the correct formatted URL', function () {
          var expectedUrl = baseUrl
            + '/app/kibana?_t=1453775307251#'
            + '/discover?_g=(refreshInterval:(display:Off,pause:!f,value:0),time'
            + ':(from:\'2015-09-19T06:31:44.000Z\',mode:absolute,to:\'2015-09'
            + '-23T18:31:44.000Z\'))&_k=()&_a=(columns:!(_source),index:\'logstash-'
            + '*\',interval:auto,query:(query_string:(analyze_wildcard:!t,query'
            + ':\'*\')),sort:!(\'@timestamp\',desc))';
          return discoverPage.getSharedUrl()
          .then(function (actualUrl) {
            // strip the timestamp out of each URL
            expect(actualUrl.replace(/_t=\d{13}/,'_t=TIMESTAMP'))
              .to.be(expectedUrl.replace(/_t=\d{13}/,'_t=TIMESTAMP'));
          })
          .catch(common.handleError(this));
        });

        bdd.it('should show toast message for copy to clipboard', function () {
          return discoverPage.clickCopyToClipboard()
          .then(function () {
            return headerPage.getToastMessage();
          })
          .then(function (toastMessage) {
            expect(toastMessage).to.match(expectedToastMessage);
          })
          .then(function () {
            return headerPage.waitForToastMessageGone();
          })
          .catch(common.handleError(this));
        });

        // NOTE: This test has to run immediately after the test above
        bdd.it('should show toast message for copy to clipboard', function () {
          return discoverPage.clickCopyToClipboard()
          .then(function () {
            return headerPage.getToastMessage();
          })
          .then(function (toastMessage) {
            expect(toastMessage).to.match(expectedToastMessage);
          })
          .then(function () {
            return headerPage.waitForToastMessageGone();
          })
          .catch(common.handleError(this));
        });


      });
    });
  };
});
