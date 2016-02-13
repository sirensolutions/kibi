var antlr4 = require('antlr4-base');
var sparqlLexer = require('node_modules/antlr4-javascript-sparql/lib/SparqlLexer.js');
var sparqlParser = require('node_modules/antlr4-javascript-sparql/lib/SparqlParser.js');
var sparqlParserListener = require('node_modules/antlr4-javascript-sparql/lib/SparqlParserListener');
var sparqlParserVisitor = require('node_modules/antlr4-javascript-sparql/lib/SparqlParserVisitor');
var listener = sparqlParserListener(antlr4);

module.exports = {
  SparqlLexer: sparqlLexer(antlr4),
  SparqlParser: sparqlParser(antlr4, listener),
  SparqlParserListener: listener,
  SparqlParserVisitor: sparqlParserVisitor(antlr4)
};
