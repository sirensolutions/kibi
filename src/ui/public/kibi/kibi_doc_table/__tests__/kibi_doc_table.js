import angular from 'angular';
import expect from 'expect.js';
import $ from 'jquery';
import _ from 'lodash';
import sinon from 'auto-release-sinon';
import searchResponse from 'fixtures/search_response';
import ngMock from 'ng_mock';
import 'ui/kibi/kibi_doc_table';
import StubbedSearchSourceProvider from 'fixtures/stubbed_search_source';

describe('Kibi doc table', function () {
  let $elem;
  let $parentScope;
  let $scope;
  let $timeout;
  let searchSource;

  const init = function ($elem, props) {
    ngMock.inject(function ($rootScope, $compile, _$timeout_) {
      $timeout = _$timeout_;
      $parentScope = $rootScope;
      $rootScope.savedVis = props.savedVis;
      const childScope = $parentScope.$new();
      _.assign($parentScope, props);

      $compile($elem)($parentScope);

      // I think the prereq requires this?
      $timeout(function () {
        $elem.scope().$digest();
      }, 0);

      $scope = $elem.isolateScope();

      $scope.$digest();
    });
  };

  const destroy = function () {
    $scope.$destroy();
    $parentScope.$destroy();
  };

  beforeEach(ngMock.module('kibana', function ($provide) {
    $provide.constant('kbnDefaultAppId', '');
    $provide.constant('kibiDefaultDashboardTitle', '');
  }));

  beforeEach(function () {
    $elem = angular.element(
      `<kibi-doc-table
        query-column="queryColumn"
        search-source="searchSource"
        columns="columns"
        column-aliases="columnAliases"
        options="options">
      </kibi-doc-table>`);
    ngMock.inject(function (Private) {
      searchSource = Private(StubbedSearchSourceProvider);
    });
    init($elem, {
      searchSource: searchSource,
      columns: [],
      options: {
        sorting: ['@timestamp', 'desc'],
      },
      queryColumn: {}
    });
  });

  afterEach(function () {
    destroy();
  });

  it('should compile', function () {
    expect($elem.text()).to.not.be.empty();
  });

  it('should set the indexPattern to that of the searchSource', function () {
    expect($scope.indexPattern).to.be(searchSource.get('index'));
  });

  it('should set size and sort on the searchSource', function () {
    expect($scope.searchSource.sort.called).to.be(true);
    expect($scope.searchSource.size.called).to.be(true);
  });

  it('should have an addRows function that increases the row count', function () {
    expect($scope.addRows).to.be.a(Function);
    searchSource.crankResults();
    $scope.$digest();
    expect($scope.limit).to.be(50);
    $scope.addRows();
    expect($scope.limit).to.be(100);
  });

  it('should reset the row limit when results are received', function () {
    $scope.limit = 100;
    expect($scope.limit).to.be(100);
    searchSource.crankResults();
    $scope.$digest();
    expect($scope.limit).to.be(50);
  });

  it('should put the hits array on scope', function () {
    expect($scope.hits).to.be(undefined);
    searchSource.crankResults();
    $scope.$digest();
    expect($scope.hits).to.be.an(Array);
  });

  it('should destroy the searchSource when the scope is destroyed', function () {
    expect(searchSource.destroy.called).to.be(false);
    $scope.$destroy();
    expect(searchSource.destroy.called).to.be(true);
  });

  it('should have a header and a table element', function () {
    searchSource.crankResults();
    $scope.$digest();

    expect($elem.find('thead').length).to.be(1);
    expect($elem.find('table').length).to.be(1);
  });

  describe('Kibi additional functionalities tests', function () {

    describe('test if column aliases work', function () {

      it('should correctly display the column name if there is no alias', function () {
        init($elem, {
          searchSource: searchSource,
          columns: ['label'],
          columnAliases: [],
          queryColumn: {}
        });
        searchSource.crankResults({
          hits: {
            total : 49487,
            max_score : 1.0,
            hits: [
              {
                _index: 'aaa',
                _type: 'AAA',
                _id: '42',
                _score: 1,
                _source: { label: 'labelValue' }
              }
            ]
          }
        });
        $scope.$digest();
        expect(_.trim($elem.find('.table-header-name').text())).to.equal('label');
      });

      it('should correctly replace an column name with an alias', function () {
        init($elem, {
          searchSource: searchSource,
          columns: ['label'],
          columnAliases: ['labelAlias'],
          queryColumn: {}
        });
        searchSource.crankResults({
          hits: {
            total : 49487,
            max_score : 1.0,
            hits: [
              {
                _index: 'aaa',
                _type: 'AAA',
                _id: '42',
                _score: 1,
                _source: { label: 'labelValue' }
              }
            ]
          }
        });
        $scope.$digest();
        expect(_.trim($elem.find('.table-header-name').text())).to.equal('labelAlias');
      });
    });

    describe('inject sql query column', function () {
      beforeEach(function () {
        init($elem, {
          searchSource: searchSource,
          columns: [],
          queryColumn: { name: 'cthulhu' }
        });
      });

      it('should have a query column match', function () {
        searchSource.crankResults({
          took: 73,
          timed_out: false,
          _shards: {
            total: 144,
            successful: 144,
            failed: 0
          },
          hits: {
            total : 49487,
            max_score : 1.0,
            hits: [
              {
                _index: 'aaa',
                _type: 'AAA',
                _id: '42',
                _score: 1,
                _source: {},
                fields: {
                  cthulhu: [ 'high priest', 'low priest' ]
                }
              },
              {
                _index: 'aaa',
                _type: 'AAA',
                _id: '43',
                _score: 1,
                _source: {},
                fields: {
                  cthulhu: []
                }
              }
            ]
          }
        });
        $scope.$digest();

        expect($scope.hits).to.have.length(2);

        let hit = _.find($scope.hits, function (hit) {
          return hit._id === '42';
        });
        expect(hit._source.cthulhu).to.be('high priest, low priest');
        expect(hit.fields.cthulhu).to.be(undefined);

        hit = _.find($scope.hits, function (hit) {
          return hit._id === '43';
        });
        expect(hit._source.cthulhu).to.be('-');
        expect(hit.fields.cthulhu).to.be(undefined);
      });
    });

    describe('exportAsCsv', function () {
      let origBlob;
      function FakeBlob(slices, opts) {
        this.slices = slices;
        this.opts = opts;
      }

      beforeEach(function () {
        origBlob = window.Blob;
        window.Blob = FakeBlob;
      });

      afterEach(function () {
        window.Blob = origBlob;
      });

      it('calls _saveAs properly', function () {
        init($elem, {
          searchSource: searchSource,
          columns: [],
          queryColumn: { name: 'cthulhu' }
        });

        const saveAs = sinon.stub($scope, '_saveAs');
        $scope.columns = [
          'one',
          'two',
          'with double-quotes(")'
        ];
        $scope.hits = [
          {
            _source: {
              one: 1,
              two: 2,
              'with double-quotes(")': '"foobar"'
            }
          }
        ];

        $scope.exportAsCsv();

        expect(saveAs.callCount).to.be(1);
        const call = saveAs.getCall(0);
        expect(call.args[0]).to.be.a(FakeBlob);
        expect(call.args[0].slices).to.eql([
          'time,one,two,"with double-quotes("")"' + '\r\n' +
            // "-" this is the time column since the index pattern has a time field.
            '" - ",1,2,"""foobar"""' + '\r\n'
        ]);
        expect(call.args[0].opts).to.eql({
          type: 'text/plain'
        });
        expect(call.args[1]).to.be('kibi-table.csv');
      });

      it('should use the vis ID as the filename', function () {
        init($elem, {
          savedVis: {
            id: 'my-table'
          },
          searchSource: searchSource,
          columns: [],
          queryColumn: { name: 'cthulhu' }
        });

        const saveAs = sinon.stub($scope, '_saveAs');
        $scope.columns = [
          'one',
          'two'
        ];
        $scope.hits = [
          {
            _source: {
              one: 1,
              two: 2,
              time: '08/29/2016'
            }
          }
        ];

        $scope.exportAsCsv();

        expect(saveAs.callCount).to.be(1);
        const call = saveAs.getCall(0);
        expect(call.args[0]).to.be.a(FakeBlob);
        expect(call.args[0].slices).to.eql([
          'time,one,two\r\n"August 29th 2016, 00:00:00.000",1,2\r\n'
        ]);
        expect(call.args[0].opts).to.eql({
          type: 'text/plain'
        });
        expect(call.args[1]).to.be('my-table.csv');
      });
    });
  });
});
