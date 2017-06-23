import angular from 'angular';
import expect from 'expect.js';
import _ from 'lodash';
import ngMock from 'ng_mock';
import 'ui/private';
import 'ui/doc_table';
import StubbedSearchSourceProvider from 'fixtures/stubbed_search_source';
import mockSavedObjects from 'fixtures/kibi/mock_saved_objects';
import MockState from 'fixtures/mock_state';

describe('Kibi doc table extra features', function () {
  let $elem;
  let $parentScope;
  let $scope;
  let searchSource;

  const init = function (props, templates = []) {
    ngMock.module('kibana', function ($provide) {
      const appState = new MockState({ filters: [] });
      $provide.service('getAppState', function () {
        return function () { return appState; };
      });
    });

    ngMock.module('templates_editor/services/saved_templates', function ($provide) {
      $provide.service('savedTemplates', (Promise, Private) => mockSavedObjects(Promise, Private)('savedTemplates', templates));
    });

    ngMock.inject(function ($document, Private, $rootScope, $compile, $timeout) {
      searchSource = Private(StubbedSearchSourceProvider);

      $parentScope = $rootScope;
      $parentScope.searchSource = searchSource;
      _.assign($parentScope, props);

      $elem = angular.element(`
        <doc-table
          search-source="searchSource"
          columns="columns"
          sorting="sorting"

          cell-click-handlers="cellClickHandlers"
          column-aliases="columnAliases"
          increase-sample="increaseSample"
          csv="csv"
          template-id="templateId"
          show-custom-view="showCustomView"
          custom-view="customView"
          custom-viewer-mode="customViewerMode"
          page-size="pageSize"
        ></doc-table>
      `);
      angular.element($document[0].body).attr('class', 'kibi-data-table-vis').append($elem);
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
   * getTableHeader returns the column names
   */
  function getTableHeader() {
    return _.trim($elem.find('.table-header-name').text());
  };

  /**
   * getTableColumn returns the column content
   */
  function getTableColumn() {
    return _.trim($elem.find('.discover-table-datafield').text());
  };

  beforeEach(ngMock.module('kibana', function ($provide) {
    $provide.constant('kbnDefaultAppId', '');
    $provide.constant('kibiDefaultDashboardTitle', '');
  }));

  afterEach(function () {
    $elem.remove();
    $scope.$destroy();
    $parentScope.$destroy();
  });

  describe('column aliases', function () {
    it('should display the column name if there is no alias', function () {
      init({
        columns: [ 'label' ],
        columnAliases: [],
      });

      searchSource.crankResults({
        hits: {
          total: 49487,
          hits: [
            {
              _index: 'aaa',
              _type: 'AAA',
              _id: '42',
              _source: { label: 'labelValue' }
            }
          ]
        }
      });
      $scope.$digest();
      expect(_.trim($elem.find('.table-header-name').text())).to.equal('label');
    });

    it('should replace the column name with its alias', function () {
      init({
        columns: [ 'label' ],
        columnAliases: [ 'labelAlias' ]
      });
      searchSource.crankResults({
        hits: {
          total: 49487,
          hits: [
            {
              _index: 'aaa',
              _type: 'AAA',
              _id: '42',
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
      init({
        columns: [ 'cthulhu' ]
      });
    });

    it('should have a query column match', function () {
      searchSource.crankResults({
        hits: {
          total: 49487,
          hits: [
            {
              _index: 'aaa',
              _type: 'AAA',
              _id: '42',
              _source: {},
              fields: {
                // coming from the inject method used for the relational column
                cthulhu: [ 'high priest', 'low priest' ]
              }
            }
          ]
        }
      });
      $scope.$digest();

      expect(_.trim($elem.find('.table-header-name').text())).to.equal('cthulhu');
      expect(_.trim($elem.find('.discover-table-datafield').text())).to.equal('high priest, low priest');
    });

    it('should be empty cell if the relational column does not have a match', function () {
      searchSource.crankResults({
        hits: {
          total: 49487,
          hits: [
            {
              _index: 'aaa',
              _type: 'AAA',
              _id: '43',
              _source: {},
              fields: {
                // coming from the inject method used for the relational column
                cthulhu: []
              }
            }
          ]
        }
      });
      $scope.$digest();

      expect(getTableHeader()).to.equal('cthulhu');
      expect(getTableColumn()).to.equal('');
    });
  });

  it('should increase the sample that is displayed', function () {
    const _createHits = number => {
      const hits = [];

      for (let i = 0; i < number; i++) {
        const hit = {
          _index: 'aaa',
          _type: 'AAA',
          _id: i + 1,
          _source: {
            aaa: `myvalue ${i + 1}`
          }
        };
        hits.push(hit);
      }
      return hits;
    };
    const columnContent = (lb, up) => _.range(lb, up + 1).map(i => `myvalue ${i}`, '').join('');
    const pageRightSelector = 'button:has(> .fa-chevron-right)';

    init({
      columns: [ 'aaa' ],
      increaseSample: true
    });

    searchSource.crankResults({
      hits: {
        total: 5000,
        hits: _createHits(50)
      }
    });
    $scope.$digest();

    expect(getTableColumn()).to.be(columnContent(1, 50));

    // get more results
    searchSource.crankResults({
      hits: {
        total: 5000,
        hits: _createHits(100)
      }
    });

    // go to the next page
    $elem.find(pageRightSelector).click();
    $scope.$digest();

    expect(getTableColumn()).to.be(columnContent(51, 100));
    // three calls to searchSource.onResults:
    // 1. at the start when there is no result
    // 2. when there are 50 results
    // 3. when there are 100
    expect(searchSource.getOnResultsCount()).to.be(3);
  });

  it('if custom page size is set should display sample according to custom page size', function () {
    const _createHits = number => {
      const hits = [];

      for (let i = 0; i < number; i++) {
        const hit = {
          _index: 'aaa',
          _type: 'AAA',
          _id: i + 1,
          _source: {
            aaa: `myvalue ${i + 1}`
          }
        };
        hits.push(hit);
      }
      return hits;
    };
    const columnContent = (lb, up) => _.range(lb, up + 1).map(i => `myvalue ${i}`, '').join('');
    const pageRightSelector = 'button:has(> .fa-chevron-right)';

    init({
      columns: [ 'aaa' ],
      increaseSample: true,
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

  it('should add a click action on a cell', function () {
    let clicks = 0;

    init({
      columns: [ 'aaa', 'bbb' ],
      cellClickHandlers(row, column) {
        const ret = {
          hasSelectedEntity: false,
          isSelectedEntityDisabled: false
        };

        if (column === 'aaa' && row._id === 2) {
          ret.clickHandler = () => clicks++;
        }
        return ret;
      }
    });

    searchSource.crankResults({
      hits: {
        total: 49487,
        hits: [
          {
            _index: 'myindex',
            _type: 'mytype',
            _id: 1,
            _source: {
              aaa: 'aaa1',
              bbb: 'bbb1'
            }
          },
          {
            _index: 'myindex',
            _type: 'mytype',
            _id: 2,
            _source: {
              aaa: 'aaa2',
              aaa: 'bbb2'
            }
          }
        ]
      }
    });
    $scope.$digest();

    const links = $elem.find('.cell-click');
    expect(links).to.have.length(1);

    links.click();
    $scope.$digest();
    expect(clicks).to.be(1);
  });

  it('should display the custom view', function () {
    const customTemplate = {
      id: 'cool template',
      templateEngine: 'html-angular',
      templateSource: `
        <div
          ng-repeat="hit in hits|limitTo:limit track by hit._index+hit._type+hit._id+hit._score"
          class="snippet"
          style="width: 99%; border:1px #ddd solid; margin: 4px; padding: 4px; float: left"
        >
          <table id="mytabletest">
            <thead>
              <th>Property</th>
              <th>Value</th>
            </thead>
            <tbody>
              <tr ng-repeat="column in columns">
                <td>
                  {{ column }}:
                </td>
                <td>
                  {{ hit._source[column] }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      `
    };

    init({
      customView: true,
      showCustomView: true,
      customViewerMode: 'record',
      templateId: 'cool template',
      columns: [ 'aaa', 'bbb' ]
    }, [ customTemplate ]);

    searchSource.crankResults({
      hits: {
        total: 49487,
        hits: [
          {
            _index: 'myindex',
            _type: 'mytype',
            _id: 1,
            _source: {
              aaa: 'AAA',
              bbb: 'BBB',
              ccc: 'CCC'
            }
          }
        ]
      }
    });
    $scope.$digest();

    const content = $elem.find('#mytabletest').text().trim().replace(/\s+/g, ' ');
    expect(content).to.be('Property Value aaa: AAA bbb: BBB');
  });

  describe('pager resets', function () {
    it('should NOT reset the pager on query/filter change', function () {
      const _createHits = number => {
        const hits = [];

        for (let i = 0; i < number; i++) {
          const hit = {
            _index: 'aaa',
            _type: 'AAA',
            _id: i + 1,
            _source: {
              aaa: `myvalue ${i + 1}`
            }
          };
          hits.push(hit);
        }
        return hits;
      };
      const columnContent = (lb, up) => _.range(lb, up + 1).map(i => `myvalue ${i}`, '').join('');
      const pageRightSelector = 'button:has(> .fa-chevron-right)';

      init({
        columns: [ 'aaa' ],
        increaseSample: true
      });

      searchSource.crankResults({
        hits: {
          total: 5000,
          hits: _createHits(50)
        }
      });
      $scope.$digest();

      expect(getTableColumn()).to.be(columnContent(1, 50));

      // get more results
      searchSource.crankResults({
        hits: {
          total: 5000,
          hits: _createHits(100)
        }
      });

      // go to the next page
      $elem.find(pageRightSelector).click();
      $scope.$digest();

      expect(getTableColumn()).to.be(columnContent(51, 100));
      expect($scope.pager.currentPage).to.be(2);

      $scope.filtersOrQueryChanged = false;

      // Trigger the pager update
      searchSource.crankResults({
        hits: {
          total: 5000,
          hits: _createHits(150)
        }
      });
      $parentScope.$digest();

      expect(getTableColumn()).to.be(columnContent(51, 100));
      expect($scope.pager.currentPage).to.be(2);



    });

    it('should reset the pager on query/filter change', function () {
      const _createHits = number => {
        const hits = [];

        for (let i = 0; i < number; i++) {
          const hit = {
            _index: 'aaa',
            _type: 'AAA',
            _id: i + 1,
            _source: {
              aaa: `myvalue ${i + 1}`
            }
          };
          hits.push(hit);
        }
        return hits;
      };
      const columnContent = (lb, up) => _.range(lb, up + 1).map(i => `myvalue ${i}`, '').join('');
      const pageRightSelector = 'button:has(> .fa-chevron-right)';

      init({
        columns: [ 'aaa' ],
        increaseSample: true
      });

      searchSource.crankResults({
        hits: {
          total: 5000,
          hits: _createHits(50)
        }
      });
      $scope.$digest();

      expect(getTableColumn()).to.be(columnContent(1, 50));

      // get more results
      searchSource.crankResults({
        hits: {
          total: 5000,
          hits: _createHits(100)
        }
      });

      // go to the next page
      $elem.find(pageRightSelector).click();
      $scope.$digest();

      expect(getTableColumn()).to.be(columnContent(51, 100));
      expect($scope.pager.currentPage).to.be(2);

      $scope.filtersOrQueryChanged = true;

      // Trigger the pager update
      searchSource.crankResults({
        hits: {
          total: 5000,
          hits: _createHits(150)
        }
      });
      $parentScope.$digest();

      expect(getTableColumn()).to.be(columnContent(1, 50));
      expect($scope.pager.currentPage).to.be(1);



    });
  });
});
