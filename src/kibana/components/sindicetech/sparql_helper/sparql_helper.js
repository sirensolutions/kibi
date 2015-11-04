define(function (require) {

  var _ = require('lodash');
  var antlr4 = require('antlr4');
  var antlr4Sparql = require('antlr4-sparql');


  return function SparqlHelperFactory() {

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
        var start = ctx.start.start;
        var stop  = ctx.start.stop;
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

      //
      // PUBLIC METHODS
      //

      return {
        getVariables: function (query) {
          // here replace any instance of @doc[]...[]@ with neutral string literal value like 'VALUE'
          var queryCopy = query.replace(/(@doc\[.+?\]@)/g, '\'VALUE\'');

          var chars = new antlr4.InputStream(queryCopy);
          var lexer = new antlr4Sparql.SparqlLexer(chars);
          var tokens  = new antlr4.CommonTokenStream(lexer);
          var parser = new antlr4Sparql.SparqlParser(tokens);
          parser.buildParseTrees = true;
          var tree = parser.query();

          var printer = new VariableNamePrinter(queryCopy);
          antlr4.tree.ParseTreeWalker.DEFAULT.walk(printer, tree);

          var varFromSelect = _.unique(printer.selectRegister);
          if (varFromSelect.length > 0) {
            return varFromSelect;
          }
          return _.unique(printer.whereRegister);
        }
      };

    })();

    return new SparqlParserHelper();
  };
});
