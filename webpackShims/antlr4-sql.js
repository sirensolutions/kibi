var antlr4 = require('antlr4-base');
var SQLLexer = require('node_modules/antlr4-javascript-sql/lib/SQLLexer.js');
var SQLParser = require('node_modules/antlr4-javascript-sql/lib/SQLParser.js');
var SQLListener = require('node_modules/antlr4-javascript-sql/lib/SQLListener');
var SQLVisitor = require('node_modules/antlr4-javascript-sql/lib/SQLVisitor');

var listener = SQLListener(antlr4);
var visitor = SQLVisitor(antlr4);

module.exports = {
  SQLLexer: SQLLexer(antlr4),
  SQLParser: SQLParser(antlr4, listener, visitor),
  SQLListener: listener,
  SQLVisitor: visitor
};
