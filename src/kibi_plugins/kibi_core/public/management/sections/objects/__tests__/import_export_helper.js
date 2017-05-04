import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'auto-release-sinon';
import Promise from 'bluebird';
import noDigestPromises from 'test_utils/no_digest_promises';
import ImportExportHelperProvider from '../import_export_helper';

describe('Kibi Components', function () {
  describe('ImportExportHelper', function () {

    noDigestPromises.activateForSuite();

    let importExportHelper;
    let indexPatterns;
    let config;
    let notify;
    let notifyErrorSpy;
    let notifyWarningSpy;
    let es;

    function init() {
      notifyErrorSpy = sinon.spy();
      notifyWarningSpy = sinon.spy();
      notify = {
        error: notifyErrorSpy,
        warning: notifyWarningSpy
      };

      ngMock.module('kibana', function ($provide) {
        $provide.constant('kibiVersion', 'x.x.x-x');
      });
      ngMock.inject(function (Private, _indexPatterns_, _config_, _es_) {
        es = _es_;
        indexPatterns = _indexPatterns_;
        config = _config_;
        importExportHelper = Private(ImportExportHelperProvider);
      });
    }

    beforeEach(init);

    it('addExtraObjectForExportAll should add kibi config and index-patterns', (done) => {
      const objectToExport = [];
      sinon.stub(indexPatterns, 'getIds').returns(Promise.resolve(['index-pattern-1']));
      importExportHelper.addExtraObjectForExportAll(objectToExport).then((results) => {
        expect(results.length).to.equal(2);
        expect(results[0][0]).to.eql({
          id: 'x.x.x-x',
          type: 'config'
        });
        expect(results[1][0]).to.eql({
          id: 'index-pattern-1',
          type: 'index-pattern'
        });
        done();
      }).catch(done);
    });

    it('loadConfig should notify error if config version !== kibiVersion', (done) => {
      const configToLoad = {
        _id: 'y.y.y-y'
      };

      importExportHelper.loadConfig(configToLoad, notify).then(() => {
        sinon.assert.notCalled(notifyWarningSpy);
        sinon.assert.calledOnce(notifyErrorSpy);
        sinon.assert.calledWith(
          notifyErrorSpy,
          'Config object version [y.y.y-y] in the import ' +
          'does not match current version [x.x.x-x]\n' +
          'Non of the advanced settings parameters were imported'
        );
        done();
      }).catch(done);
    });

    it('loadConfig should set the correct config values if config version === kibiVersion', (done) => {
      const configToLoad = {
        _id: 'x.x.x-x',
        _source: {
          key1: 'value1'
        }
      };
      const configSetSpy = sinon.stub(config, 'set').returns(Promise.resolve());

      importExportHelper.loadConfig(configToLoad, notify).then(() => {
        sinon.assert.notCalled(notifyWarningSpy);
        sinon.assert.notCalled(notifyErrorSpy);

        sinon.assert.calledOnce(configSetSpy);
        sinon.assert.calledWith(configSetSpy, 'key1', 'value1');
        done();
      }).catch(done);
    });

    it('loadIndexPatterns should trigger a warning when there is no idices that match the pattern', (done) => {
      const indexPatternDocuments = [
        {
          _id: 'index-pattern-do-not-match-any-indices'
        }
      ];
      sinon.stub(importExportHelper, 'createIndexPattern');
      sinon.stub(es.indices, 'getFieldMapping').returns(Promise.reject(new Error('No indices match')));

      importExportHelper.loadIndexPatterns(indexPatternDocuments , notify).then(() => {
        sinon.assert.notCalled(notifyErrorSpy);
        sinon.assert.calledOnce(notifyWarningSpy);
        sinon.assert.calledWith(
          notifyWarningSpy,
          'Imported index-pattern: [index-pattern-do-not-match-any-indices] did not match any indices. ' +
          'If you would like to remove it go to Settings->Indices'
        );
        done();
      }).catch(done);
    });

  });
});
