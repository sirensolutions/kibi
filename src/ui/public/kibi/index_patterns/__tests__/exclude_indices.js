import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';
import { Notifier }  from 'ui/notify/notifier';
import { IndexPatternsExcludeIndicesProvider } from 'ui/kibi/index_patterns/_exclude_indices';

describe('Kibi index pattern', function () {
  describe('excludeIndices', function () {
    let excludeIndices;
    let configStub;
    let $rootScope;
    let excludes;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private, config, _$rootScope_) {
      excludes = Private(IndexPatternsExcludeIndicesProvider);
      configStub = sinon.stub(config, 'get');
      $rootScope = _$rootScope_;
    }));

    afterEach(function () {
      configStub.restore();
      Notifier.prototype._notifs.length = 0; // clear notification
    });

    describe('Index map', function () {
      it('should exclude indices that match the patterns', function () {
        configStub.withArgs('siren:indexExclusionRegexList').returns([
          'watcher.*',
          '\\.kibi.*'
        ]);
        const indicesMap = {
          '.watcher_alarms': {},
          '.watcher': {},
          '.kibi': {},
          '.kibiaccess': {},
          'data1': {},
        };
        const expectedIndicesMap = {
          'data1': {}
        };

        expect(excludes.excludeIndices(indicesMap)).to.eql(expectedIndicesMap);
      });

      it('should ignore invalid regexes in the list', function () {
        configStub.withArgs('siren:indexExclusionRegexList').returns([
          'watcher\\', // invalid
          '\\.kibi*',
        ]);
        const indicesMap = {
          '.watcher_alarms': {},
          '.watcher': {},
          '.kibi': {},
          '.kibiaccess': {},
          'data1': {},
        };
        const expectedIndicesMap = {
          '.watcher_alarms': {},
          '.watcher': {},
          'data1': {}
        };

        expect(excludes.excludeIndices(indicesMap)).to.eql(expectedIndicesMap);
        expect(Notifier.prototype._notifs).to.have.length(1);
        expect(Notifier.prototype._notifs[0].count).to.equal(5);
        expect(Notifier.prototype._notifs[0].type).to.equal('warning');
        expect(Notifier.prototype._notifs[0].content).to.equal(
          'Exclude indices: The following exclude regex pattern is invalid [ watcher\\]. ' +
          'Correct it in Management -> Advanced Settings -> siren:indexExclusionRegexList'
        );
      });
    });

    describe('Index array', function () {
      it('should exclude indices that match the patterns', function () {
        configStub.withArgs('siren:indexExclusionRegexList').returns([
          'watcher.*',
          '\\.kibi.*'
        ]);
        const indicesArray = [
          { index: '.watcher_alarms' },
          { index: '.watcher' },
          { index: '.kibi' },
          { index: '.kibi_access' },
          { index: 'data' }
        ];

        const expectedIndicesArray = [
          { index: 'data' }
        ];

        expect(excludes.excludeIndices(indicesArray)).to.eql(expectedIndicesArray);
      });

      it('should ignore invalid regexes in the list', function () {
        configStub.withArgs('siren:indexExclusionRegexList').returns([
          'watcher\\', // invalid
          '\\.kibi*',
        ]);

        const indicesArray = [
          { index: '.watcher_alarms' },
          { index: '.watcher' },
          { index: '.kibi' },
          { index: '.kibi_access' },
          { index: 'data' }
        ];

        const expectedIndicesArray = [
          { index: '.watcher_alarms' },
          { index: '.watcher' },
          { index: 'data' }
        ];

        expect(excludes.excludeIndices(indicesArray)).to.eql(expectedIndicesArray);
        expect(Notifier.prototype._notifs).to.have.length(1);
        expect(Notifier.prototype._notifs[0].count).to.equal(5);
        expect(Notifier.prototype._notifs[0].type).to.equal('warning');
        expect(Notifier.prototype._notifs[0].content).to.equal(
          'Exclude indices: The following exclude regex pattern is invalid [ watcher\\]. ' +
          'Correct it in Management -> Advanced Settings -> siren:indexExclusionRegexList'
        );
      });
    });
  });
});
