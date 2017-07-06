const angular = require('angular');
const expect = require('expect.js');
const $ = require('jquery');
const _ = require('lodash');
const sinon = require('auto-release-sinon');
const searchResponse = require('fixtures/search_response');
const ngMock = require('ngMock');

require('ui/kibi/kibi_doc_table');

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

   /**
   * getTableColumn returns the column content
   */
  function getTableColumn() {
    return _.trim($elem.find('.discover-table-datafield').text());
  };

  const destroy = function () {
    $scope.$destroy();
    $parentScope.$destroy();
  };

  beforeEach(ngMock.module('kibana', function ($provide) {
    $provide.constant('kbnDefaultAppId', '');
    $provide.constant('elasticsearchPlugins', ['siren-join']);
  }));

  beforeEach(function () {
    $elem = angular.element(
      `<kibi-doc-table
        query-column="queryColumn"
        search-source="searchSource"
        columns="columns"
        column-aliases="columnAliases"
        options="options"
        page-size="pageSize">
      </kibi-doc-table>`);
    ngMock.inject(function (Private) {
      searchSource = Private(require('fixtures/stubbed_search_source'));
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

  it('should set the source filtering defintion', function () {
    expect($scope.indexPattern.getSourceFiltering.called).to.be(true);
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
                _source: {label: 'labelValue'}
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
                _source: {label: 'labelValue'}
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
            '"-",1,2,"""foobar"""' + '\r\n'
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

      it('should output meta fields', function () {
        init($elem, {
          savedVis: {
            id: 'my-table'
          },
          searchSource,
          columns: []
        });

        $scope.columns = [
          '_index',
          '_type',
          '_id',
          'one',
          'two'
        ];
        $scope.hits = [
          {
            _index: 'myindex',
            _type: 'mytype',
            _id: 'myid',
            _source: {
              one: 1,
              two: 2,
              time: '08/29/2016'
            }
          }
        ];

        const csv = $scope.toCsv();
        expect(csv).to.eql('time,"_index","_type","_id",one,two\r\n"August 29th 2016, 00:00:00.000",myindex,mytype,myid,1,2\r\n');
      });
    });

    describe('Page size option', function () {
      it('should display sample according to custom page size', function () {
        const _createHits = number => {
          const hits = [];

          for (let i = 0; i < number; i++) {
            const hit = {
              _index: 'aaa',
              _type: 'AAA',
              _id: i + 1,
              _source: {
                label: `myvalue ${i + 1}`
              }
            };
            hits.push(hit);
          }
          return hits;
        };
        const columnContent = (lb, up) => _.range(lb, up + 1).map(i => `myvalue ${i}`, '').join('');

        init($elem, {
          searchSource: searchSource,
          columns: ['label'],
          columnAliases: [],
          pageSize: 20
        });

        searchSource.crankResults({
          hits: {
            total: 5000,
            hits: _createHits(50)
          }
        });
        $scope.$digest();

        expect(getTableColumn()).to.be(columnContent(1, 20));
      });
    });

    it('should set the source filtering definition', function () {
      expect($scope.indexPattern.getSourceFiltering.called).to.be(true);
    });
  });
});

