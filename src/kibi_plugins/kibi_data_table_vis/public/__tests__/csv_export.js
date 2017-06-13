import { toCsv } from 'plugins/kibi_data_table_vis/actions/csv_export';
import expect from 'expect.js';

describe('exportAsCsv', function () {
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
    const config = {
      get(key) {
        switch (key) {
          case 'csv:separator':
            return ',';
          case 'csv:quoteValues':
            return true;
        }
      }
    };
    const indexPattern = {
      hasTimeField() {
        return false;
      }
    };

    const csvRows = toCsv(config, rows, indexPattern, columns);

    expect(csvRows).to.be(
      'one,two,"with double-quotes("")"' + '\r\n' +
      '1,2,"""foobar"""' + '\r\n'
    );
  });
});
