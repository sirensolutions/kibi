import { saveAs } from '@spalger/filesaver';
import { isObject, map } from 'lodash';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';

export function ExportAsCsvProvider(Private, config) {
  const stringFormat = Private(RegistryFieldFormatsProvider).getDefaultInstance('string');

  function toCsv(config, rows, indexPattern, columns) {
    const separator = config.get('csv:separator');
    const quoteValues = config.get('csv:quoteValues');
    const nonAlphaNumRE = /[^a-zA-Z0-9]/;
    const allDoubleQuoteRE = /"/g;

    if (indexPattern.isTimeBased()) {
      columns = [ indexPattern.timeFieldName, ...columns ];
    }

    function convert(hit, val, fieldName) {
      if (fieldName === '_source') {
        return JSON.stringify(hit._source);
      }

      const field = indexPattern.fields.byName[fieldName];
      if (!field) {
        return stringFormat.convert(val, 'text');
      }
      return field.format.getConverterFor('text')(val, field, hit);
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
      const flattenRow = indexPattern.flattenHit(row);
      return map(columns, column => escape(convert(row, flattenRow[column], column)));
    });

    // add the columns to the rows
    csvRows.unshift(columns.map(escape));

    return csvRows.map(row => `${row.join(separator)}\r\n`).join('');
  };

  function exportAsCsv(rows, indexPattern, columns) {
    const csv = new Blob([ toCsv(config, rows, indexPattern, columns) ], { type: 'text/plain' });
    saveAs(csv, 'kibi-table.csv');
  };

  return {
    toCsv,
    exportAsCsv
  };
}
