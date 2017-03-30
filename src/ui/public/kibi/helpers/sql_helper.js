import antlr4 from 'antlr4-base';
import antlr4SQL from 'antlr4-sql';

export default function SQLHelperFactory() {

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
      const alias = ctx.column_alias();
      let parameter;
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

    const ErrorListener = function () {};

    ErrorListener.prototype = Object.create(antlr4.error.ErrorListener.prototype);
    ErrorListener.prototype.syntaxError = function (rec, sym, line, col, msg, e) {
      throw new Error(`Invalid SQL query: line ${line}:${col} ${msg}`);
    };

    //
    // PUBLIC METHODS
    //

    return {
      getVariables: function (query) {
        let queryCopy = query;

        // here replace any instance of @doc[]...[]@ with neutral string value like 'VALUE'
        if (/'(@doc\[.+?\]@)'/.test(query)) {
          queryCopy = query.replace(/(@doc\[.+?\]@)/g, 'VALUE');
        } else if (/(@doc\[.+?\]@)/.test(query)) {
          queryCopy = query.replace(/(@doc\[.+?\]@)/g, '\'VALUE\'');
        }

        const chars = new antlr4.InputStream(queryCopy);
        const lexer = new antlr4SQL.SQLLexer(chars);
        const tokens = new antlr4.CommonTokenStream(lexer);
        const parser = new antlr4SQL.SQLParser(tokens);
        parser.buildParseTrees = true;

        parser.removeErrorListeners();
        parser.addErrorListener(new ErrorListener());

        const context = parser.select_stmt();

        const parametersParser = new SelectParametersParser(queryCopy);
        antlr4.tree.ParseTreeWalker.DEFAULT.walk(parametersParser, context);

        return parametersParser.parameters;
      }
    };

  }());

  return new SQLParserHelper();
};
