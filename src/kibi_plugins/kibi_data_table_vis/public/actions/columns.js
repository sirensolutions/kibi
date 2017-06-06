import * as columnsActions from 'ui/doc_table/actions/columns';

/**
 * rename the column and its alias
 */
export function renameColumn(params, oldColumnName, newColumnName) {
  if (!params.columns.includes(oldColumnName)) {
    return;
  }

  const oldIndexInColumns = params.columns.indexOf(oldColumnName);
  params.columnAliases.splice(oldIndexInColumns, 1, newColumnName);
  params.columns.splice(oldIndexInColumns, 1, newColumnName);
}

/**
 * Adds a new column as well as its alias
 */
export function addColumn(params, columnName) {
  columnsActions.addColumn(params.columnAliases, columnName);
  columnsActions.addColumn(params.columns, columnName);
}

/**
 * Remove a column as well as its alias
 */
export function removeColumn(params, columnName) {
  const oldIndex = params.columns.indexOf(columnName);
  columnsActions.removeColumn(params.columnAliases, params.columnAliases[oldIndex]);
  columnsActions.removeColumn(params.columns, columnName);
}

/**
 * Move a column as well as its alias
 */
export function moveColumn(params, columnName, newIndex) {
  const oldIndex = params.columns.indexOf(columnName);
  columnsActions.moveColumn(params.columnAliases, params.columnAliases[oldIndex], newIndex);
  columnsActions.moveColumn(params.columns, columnName, newIndex);
}
