import * as columnsActions from 'ui/doc_table/actions/columns';

/**
 * rename the column and its alias
 */
export function renameColumn(params, oldColumnName, newColumnName) {
  if (!params.columns.includes(oldColumnName)) {
    return;
  }

  const oldIndexInColumns = params.columns.indexOf(oldColumnName);
  if (params.columnAliases.length) {
    params.columnAliases.splice(oldIndexInColumns, 1, newColumnName);
  }
  params.columns.splice(oldIndexInColumns, 1, newColumnName);
}

/**
 * Adds a new column as well as its alias
 */
export function addColumn(params, columnName) {
  if (params.columnAliases.length) {
    columnsActions.addColumn(params.columnAliases, columnName);
  }
  columnsActions.addColumn(params.columns, columnName);
}

/**
 * Remove a column as well as its alias
 */
export function removeColumn(params, columnName) {
  const oldIndex = params.columns.indexOf(columnName);
  if (params.columnAliases.length) {
    columnsActions.removeColumn(params.columnAliases, params.columnAliases[oldIndex]);
  }
  columnsActions.removeColumn(params.columns, columnName);
}

/**
 * Move a column as well as its alias
 */
export function moveColumn(params, columnName, newIndex) {
  const oldIndex = params.columns.indexOf(columnName);
  if (params.columnAliases.length) {
    columnsActions.moveColumn(params.columnAliases, params.columnAliases[oldIndex], newIndex);
  }
  columnsActions.moveColumn(params.columns, columnName, newIndex);
}
