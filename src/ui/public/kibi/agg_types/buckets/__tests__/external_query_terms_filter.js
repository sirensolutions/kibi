import sinon from 'sinon'; //TODO MERGE 5.5.2 check if sandbox is needed
import ngMock from 'ng_mock';
import expect from 'expect.js';
import { VisProvider } from 'ui/vis';
import { stubbedLogstashIndexPatternService } from 'fixtures/stubbed_logstash_index_pattern';

describe('External query terms filter aggregation', function () {
  let agg;
  let kibiState;
  let Vis;
  let indexPattern;

  beforeEach(ngMock.module('kibana', function ($provide) {
    $provide.constant('kbnDefaultAppId', '');
  }));
  beforeEach(ngMock.inject(function (_kibiState_, Private) {
    Vis = Private(VisProvider);
    indexPattern = Private(stubbedLogstashIndexPatternService);
    kibiState = _kibiState_;
    kibiState.isSelectedEntityDisabled = sinon.stub();
    kibiState.getEntityURI = sinon.stub();
  }));

  function init(aggParams) {
    const aggName = 'external_query_terms_filter';
    const vis = new Vis(indexPattern, {
      type: 'table',
      aggs: [
        {
          type: aggName,
          params: aggParams
        }
      ]
    });

    agg = vis.aggs.byTypeName[aggName][0];
  }

  it('should build dbfilter query', function () {
    const expected = {
      params: {
        filters: {
          query1: {
            dbfilter: {
              queryid: 'query1',
              negate: false,
              queryVariableName: 'var1',
              path: 'field1',
              entity: undefined
            }
          }
        }
      }
    };

    init({
      queryDefinitions: [
        {
          queryId: 'query1',
          joinElasticsearchField: 'field1',
          queryVariableName: 'var1'
        }
      ]
    });
    expect(agg.write()).to.eql(expected);
  });

  it('should include the entity in the dbfilter', function () {
    const expected = {
      params: {
        filters: {
          query1: {
            dbfilter: {
              queryid: 'query1',
              negate: false,
              queryVariableName: 'var1',
              path: 'field1',
              entity: 'myentity'
            }
          }
        }
      }
    };

    init({
      queryDefinitions: [
        {
          queryId: 'query1',
          joinElasticsearchField: 'field1',
          queryVariableName: 'var1'
        }
      ]
    });
    kibiState.isSelectedEntityDisabled.returns(false);
    kibiState.getEntityURI.returns('myentity');
    expect(agg.write()).to.eql(expected);
  });

  it('should not include the entity in the dbfilter if disabled', function () {
    const expected = {
      params: {
        filters: {
          query1: {
            dbfilter: {
              queryid: 'query1',
              negate: false,
              queryVariableName: 'var1',
              path: 'field1'
            }
          }
        }
      }
    };

    init({
      queryDefinitions: [
        {
          queryId: 'query1',
          joinElasticsearchField: 'field1',
          queryVariableName: 'var1'
        }
      ]
    });
    kibiState.isSelectedEntityDisabled.returns(true);
    kibiState.getEntityURI.returns('myentity');
    expect(agg.write()).to.eql(expected);
  });

  it('should negate the dbfilter', function () {
    const expected = {
      params: {
        filters: {
          'NOT query1': {
            dbfilter: {
              queryid: 'query1',
              negate: true,
              queryVariableName: 'var1',
              path: 'field1',
              entity: undefined
            }
          }
        }
      }
    };

    init({
      queryDefinitions: [
        {
          negate: true,
          queryId: 'query1',
          joinElasticsearchField: 'field1',
          queryVariableName: 'var1'
        }
      ]
    });
    kibiState.isSelectedEntityDisabled.returns(false);
    expect(agg.write()).to.eql(expected);
  });
});
