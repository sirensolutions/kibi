import { saveAs } from '@spalger/filesaver';
import { get, isObject, map } from 'lodash';

export function toCsv(config, rows, indexPattern, columns) {
  const separator = config.get('csv:separator');
  const quoteValues = config.get('csv:quoteValues');
  const nonAlphaNumRE = /[^a-zA-Z0-9]/;
  const allDoubleQuoteRE = /"/g;

  if (indexPattern.hasTimeField()) {
    columns = [ indexPattern.timeFieldName, ...columns ];
  }

  function escape(val) {
    if (isObject(val)) {
      val = val.valueOf();
    }
    val = String(val);
    if (quoteValues && nonAlphaNumRE.test(val)) {
      val = '"' + val.replace(allDoubleQuoteRE, '""') + '"';
    }
    return val;
  }

  // escape each cell in each row
  const csvRows = rows.map(function (row) {
    return map(columns, (column, i) => {
      if (i === 0 && indexPattern.hasTimeField()) {
        const text = indexPattern.formatField(row, column);
        return escape(text);
      } else {
        return escape(get(row._source, column));
      }
    });
  });

  // add the columns to the rows
  csvRows.unshift(columns.map(escape));

  return csvRows.map(row => `${row.join(separator)}\r\n`).join('');
};

export function ExportAsCsvProvider(config) {
  return function exportAsCsv(rows, indexPattern, columns) {
    const csv = new Blob([ toCsv(config, rows, indexPattern, columns) ], { type: 'text/plain' });
    saveAs(csv, 'kibi-table.csv');
  };
}
