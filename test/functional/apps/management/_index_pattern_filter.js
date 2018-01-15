import expect from 'expect.js';

export default function ({ getService, getPageObjects }) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const PageObjects = getPageObjects(['settings']);

  describe('index pattern filter', function describeIndexTests() {
    before(function () {
      // delete .kibana index and then wait for Kibana to re-create it
      return kibanaServer.uiSettings.replace({})
      .then(function () {
        return PageObjects.settings.navigateTo();
      })
      .then(function () {
        return PageObjects.settings.clickKibanaIndices();
      })
      // kibi: to run below tests Siren Investigate needs to click add index pattern if none already exists
      // In kibana when you open the index patterns page and none exist it automatically opens 'add index pattern' page
      .then(function () {
        return PageObjects.settings.clickLinkText('Add Index Pattern');
      });
      // kibi: end
    });

    beforeEach(function () {
      return PageObjects.settings.createIndexPattern();
    });

    afterEach(function () {
      return PageObjects.settings.removeIndexPattern();
    });

    it('should filter indexed fields', async function () {
      await PageObjects.settings.navigateTo();
      await PageObjects.settings.clickKibanaIndices();
      // kibi: open fields tab as default tab in Siren Investigate is different to kibana
      await PageObjects.settings.clickIndexedFieldsTab();
      // kibi: end
      await PageObjects.settings.getFieldTypes();

      await PageObjects.settings.setFieldTypeFilter('string');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('string');
        }
      });

      await PageObjects.settings.setFieldTypeFilter('number');

      await retry.try(async function () {
        const fieldTypes = await PageObjects.settings.getFieldTypes();
        expect(fieldTypes.length).to.be.above(0);
        for (const fieldType of fieldTypes) {
          expect(fieldType).to.be('number');
        }
      });
    });
  });
}
