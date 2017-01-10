// KIBI5: port this
/*global ace*/
ace.define('ace/mode/sparql', function (require, exports, module) {

  const oop = require('../lib/oop');
  const TextMode = require('./text').Mode;
  const Tokenizer = require('../tokenizer').Tokenizer;
  const SparqlHighlightRules = require('./sparql_highlight_rules').SparqlHighlightRules;
  const MatchingBraceOutdent = require('./matching_brace_outdent').MatchingBraceOutdent;
  const Range = require('../range').Range;

  const Mode = function () {
    this.$tokenizer = new Tokenizer(new SparqlHighlightRules().getRules());
  };
  oop.inherits(Mode, TextMode);

  exports.Mode = Mode;

});
ace.define('ace/mode/sparql_highlight_rules', function (require, exports, module) {

  const oop = require('../lib/oop');
  const lang = require('../lib/lang');
  const TextHighlightRules = require('./text_highlight_rules').TextHighlightRules;

  const SparqlHighlightRules = function () {

    const builtinFunctions = lang.arrayToMap(
        'str|lang|langmatches|datatype|bound|sameterm|isiri|isuri|isblank|isliteral|union|a'.split('|')
        );

    const keywords = lang.arrayToMap(
        ('base|BASE|prefix|PREFIX|select|SELECT|ask|ASK|construct|CONSTRUCT|describe|DESCRIBE|where|WHERE|' +
         'from|FROM|reduced|REDUCED|named|NAMED|order|ORDER|limit|LIMIT|offset|OFFSET|filter|FILTER|' +
         'optional|OPTIONAL|graph|GRAPH|by|BY|asc|ASC|desc|DESC').split('|')
        );

    const buildinConstants = lang.arrayToMap(
        'true|TRUE|false|FALSE'.split('|')
        );

    const builtinVariables = lang.arrayToMap(
        ('').split('|')
        );

    // regexp must not have capturing parentheses. Use (?:) instead.
    // regexps are ordered -> the first match is used

    this.$rules = {
      'start' : [
        {
          token : 'comment',
          regex : '#.*$'
        },
        {
          token : 'sparql.iri.constant.buildin',
          regex : '\\<\\S+\\>'
        },
        {
          token : 'sparql.variable',
          regex : '[\\?\\$][a-zA-Z]+'
        },
        {
          token : 'sparql.prefix.constant.language',
          regex : '[a-zA-Z]+\\:'
        },
        {
          token : 'string.regexp',
          regex : '[/](?:(?:\\[(?:\\\\]|[^\\]])+\\])|(?:\\\\/|[^\\]/]))*[/]\\w*\\s*(?=[).,;]|$)'
        },
        {
          token : 'string', // single line
          regex : '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
        },
        {
          token : 'string', // single line
          regex : '[\'](?:(?:\\\\.)|(?:[^\'\\\\]))*?[\']'
        },
        {
          token : 'constant.numeric', // hex
          regex : '0[xX][0-9a-fA-F]+\\b'
        },
        {
          token : 'constant.numeric', // float
          regex : '[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b'
        },
        {
          token : 'constant.language.boolean',
          regex : '(?:true|false)\\b'
        },
        {
          token : function (value) {
            if (value === 'self') {
              return 'variable.language';
            } else if (keywords.hasOwnProperty(value)) {
              return 'keyword';
            } else if (buildinConstants.hasOwnProperty(value)) {
              return 'constant.language';
            } else if (builtinVariables.hasOwnProperty(value)) {
              return 'variable.language';
            } else if (builtinFunctions.hasOwnProperty(value)) {
              return 'support.function';
            } else if (value === 'debugger') {
              return 'invalid.deprecated';
            } else {
              return 'identifier';
            }
          },
          regex : '[a-zA-Z_$][a-zA-Z0-9_$]*\\b'
        },
        {
          token : 'keyword.operator',
          regex : '\\*|\\+|\\|\\-|\\<|\\>|=|&|\\|'
        },
        {
          token : 'lparen',
          regex : '[\\<({]'
        },
        {
          token : 'rparen',
          regex : '[\\>)}]'
        },
        {
          token : 'text',
          regex : '\\s+'
        }
      ],
      'comment' : [
        {
          token : 'comment', // comment spanning whole line
          regex : '.+'
        }
      ]
    };
  };

  oop.inherits(SparqlHighlightRules, TextHighlightRules);
  exports.SparqlHighlightRules = SparqlHighlightRules;
});
