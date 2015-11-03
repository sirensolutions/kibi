define(function (require) {

  var _ = require('lodash');
  var antlr4 = require('antlr4');
  var antlr4SQL = require('antlr4-sql');

  return function SQLHelperFactory() {

    function SQLParserHelper() {}

    SQLParserHelper.prototype = (function () {

      /**
       * Listens for walker events generated while traversing
       * the first select clause of a query.
       *
       * Puts column names and aliases in the `parameters` array,
       * excluding column wildcards.
       */
      function SelectParametersParser(query) {
        antlr4SQL.SQLListener.call(this);
        this.parameter = null;
        this.parameters = [];
        this.query = query;
        this.inSelectClause = false;
        this.ignoreSelectClause = false;
        return this;
      }

      SelectParametersParser.prototype = Object.create(antlr4SQL.SQLListener.prototype);
      SelectParametersParser.prototype.constructor = SelectParametersParser;

      SelectParametersParser.prototype.enterSelect_stmt = function (ctx) {
        if (this.inSelectClause) {
          this.ignoreSelectClause = true;
        }
        this.inSelectClause = true;
        if (this.ignoreSelectClause) {
          return;
        }
      };

      SelectParametersParser.prototype.exitSelect_stmt = function (ctx) {
        this.inSelectClause = false;
      };

      SelectParametersParser.prototype.exitLiteral_value = function (ctx) {
        this.parameter = null;
      };

      SelectParametersParser.prototype.enterResult_column  = function (ctx) {
        if (!this.inSelectClause || this.ignoreSelectClause) {
          return;
        }
        var alias = ctx.column_alias();
        var parameter;
        if (alias) {
          parameter = alias.getText();
        } else {
          parameter = ctx.getText();
          if (parameter === '*' || parameter.substring(parameter.length - 2) === '.*') {
            parameter = null;
          }
        }
        if (parameter) {
          this.parameter = parameter;
        }
      };

      SelectParametersParser.prototype.exitResult_column  = function (ctx) {
        if (!this.inSelectClause || this.ignoreSelectClause) {
          return;
        }
        if (this.parameter) {
          this.parameters.push(this.parameter);
          this.parameter = null;
        }
      };

      //
      // PUBLIC METHODS
      //

      return {
        getVariables: function (query) {
          // here replace any instance of @doc[]...[]@ with neutral string value like 'VALUE'
          var queryCopy = query.replace(/(@doc\[.+?\]@)/g, '\'VALUE\'');


          var chars = new antlr4.InputStream(queryCopy);
          var lexer = new antlr4SQL.SQLLexer(chars);
          var tokens  = new antlr4.CommonTokenStream(lexer);
          var parser = new antlr4SQL.SQLParser(tokens);
          parser.buildParseTrees = true;

          var context = parser.select_stmt();

          var parametersParser = new SelectParametersParser(queryCopy);
          antlr4.tree.ParseTreeWalker.DEFAULT.walk(parametersParser, context);

          return parametersParser.parameters;
        }
      };

    })();

    return new SQLParserHelper();
  };
});
