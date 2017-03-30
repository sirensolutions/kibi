import _ from 'lodash';
import antlr4 from 'antlr4-base';
import antlr4Sparql from 'antlr4-sparql';

export default function SparqlHelperFactory() {
  function SparqlParserHelper() {}
  SparqlParserHelper.prototype = (function () {

    //
    // PRIVATE methods
    //
    function VariableNamePrinter(query) {
      antlr4Sparql.SparqlParserListener.call(this); // inherit default listener
      this.selectRegister = [];
      this.whereRegister = [];
      this.query = query;
      this.inSelect = false;
      this.inWhere = false;
      return this;
    }

    // inherit default listener
    VariableNamePrinter.prototype = Object.create(antlr4Sparql.SparqlParserListener.prototype);
    VariableNamePrinter.prototype.constructor = VariableNamePrinter;

    VariableNamePrinter.prototype.exitVar = function (ctx) {
      const start = ctx.start.start;
      const stop  = ctx.start.stop;
      if (this.inSelect) {
        this.selectRegister.push(this.query.substring(start, stop + 1));
      } else if (this.inWhere) {
        this.whereRegister.push(this.query.substring(start, stop + 1));
      }
    };

    VariableNamePrinter.prototype.enterSelectVariables = function (ctx) {this.inSelect = true;};
    VariableNamePrinter.prototype.exitSelectVariables  = function (ctx) {this.inSelect = false;};
    VariableNamePrinter.prototype.enterWhereClause = function (ctx) {this.inWhere = true;};
    VariableNamePrinter.prototype.exitWhereClause  = function (ctx) {this.inWhere = false;};

    const ErrorListener = function () {};

    ErrorListener.prototype = Object.create(antlr4.error.ErrorListener.prototype);
    ErrorListener.prototype.syntaxError = function (rec, sym, line, col, msg, e) {
      throw new Error(`Invalid SPARQL query: line ${line}:${col} ${msg}`);
    };

    //
    // PUBLIC METHODS
    //

    return {
      getVariables: function (query) {
        let queryCopy = query;

        // here replace any instance of @doc[]...[]@ with neutral string literal value like 'VALUE'
        if (/['"](@doc\[.+?\]@)['"]/.test(query)) {
          // literal
          queryCopy = query.replace(/(@doc\[.+?\]@)/g, 'VALUE');
        } else if (/<(@doc\[.+?\]@)>/.test(query)) {
          // URI
          queryCopy = query.replace(/(@doc\[.+?\]@)/g, 'VALUE');
        } else if (/(@doc\[.+?\]@)/.test(query)) {
          queryCopy = query.replace(/(@doc\[.+?\]@)/g, '\'VALUE\'');
        }

        const chars = new antlr4.InputStream(queryCopy);
        const lexer = new antlr4Sparql.SparqlLexer(chars);
        const tokens  = new antlr4.CommonTokenStream(lexer);
        const parser = new antlr4Sparql.SparqlParser(tokens);
        parser.buildParseTrees = true;

        parser.removeErrorListeners();
        parser.addErrorListener(new ErrorListener());

        const tree = parser.query();

        const printer = new VariableNamePrinter(queryCopy);
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(printer, tree);

        const varFromSelect = _.unique(printer.selectRegister);
        if (varFromSelect.length > 0) {
          return varFromSelect;
        }
        return _.unique(printer.whereRegister);
      }
    };

  }());

  return new SparqlParserHelper();
};
