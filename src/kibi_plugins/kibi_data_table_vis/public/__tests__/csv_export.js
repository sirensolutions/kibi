import sinon from 'sinon'; //TODO MERGE 5.5.2 check if sandbox is needed
import { ExportAsCsvProvider } from 'plugins/kibi_data_table_vis/actions/csv_export';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { StubIndexPatternProvider } from 'test_utils/stub_index_pattern';

describe('exportAsCsv', function () {
  let config;
  let timeBasedIndexPattern;
  let indexPattern;
  let toCsv;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_config_, Private) {
    const fields = [ 'one', 'two', 'with double-quotes(")' ];
    const IndexPattern = Private(StubIndexPatternProvider);

    config = _config_;
    indexPattern = new IndexPattern('plain', null, fields);
    timeBasedIndexPattern = new IndexPattern('plain', 'time', fields);
    toCsv = Private(ExportAsCsvProvider).toCsv;
  }));

  it('should output hits as a CSV', function () {
    const columns = [
      'one',
      'two',
      'with double-quotes(")'
    ];
    const rows = [
      {
        _source: {
          one: 1,
          two: 2,
          'with double-quotes(")': '"foobar"'
        }
      }
    ];
    const csvRows = toCsv(config, rows, indexPattern, columns);

    expect(csvRows).to.be(
      'one,two,"with double-quotes("")"' + '\r\n' +
      '1,2,"""foobar"""' + '\r\n'
    );
  });

  it('should output meta fields', function () {
    const columns = [
      '_index',
      '_type',
      '_id',
      'one',
      'two'
    ];
    const rows = [
      {
        _index: 'myindex',
        _type: 'mytype',
        _id: 'myid',
        _source: {
          one: 1,
          two: 2
        }
      }
    ];
    const csvRows = toCsv(config, rows, indexPattern, columns);

    expect(csvRows).to.be(
      '"_index","_type","_id",one,two' + '\r\n' +
      'myindex,mytype,myid,1,2' + '\r\n'
    );
  });

  it('should export time field', function () {
    const columns = [
      'one'
    ];
    const rows = [
      {
        _index: 'myindex',
        _type: 'mytype',
        _id: 'myid',
        _source: {
          one: 1,
          time: '11 feb 2017'
        }
      }
    ];
    const csvRows = toCsv(config, rows, timeBasedIndexPattern, columns);

    expect(csvRows).to.be(
      'time,one' + '\r\n' +
      '"11 feb 2017",1' + '\r\n'
    );
  });

  it('should export source if column name is _source', function () {
    const columns = [
      '_source'
    ];
    const row = {
      _index: 'myindex',
      _type: 'mytype',
      _id: 'myid',
      _source: {
        one: 1,
        time: '11 feb 2017'
      }
    };
    const csvRows = toCsv(config, [ row ], timeBasedIndexPattern, columns);

    expect(csvRows).to.be(
      'time,"_source"' + '\r\n' +
      '"11 feb 2017","' + JSON.stringify(row._source).replace(/"/g, '""') + '"\r\n'
    );
  });

  it('should handle missing date in time-based index', function () {
    const columns = [
      'one'
    ];
    const row = {
      _index: 'myindex',
      _type: 'mytype',
      _id: 'myid',
      _source: {
        one: 1
      }
    };
    const csvRows = toCsv(config, [ row ], timeBasedIndexPattern, columns);

    expect(csvRows).to.be(
      'time,one' + '\r\n' +
      '" - ",1' + '\r\n'
    );
  });
});
