module.exports = {
  atn: require('node_modules/antlr4/atn/index'),
  dfa: require('node_modules/antlr4/dfa/index'),
  tree: require('node_modules/antlr4/tree/index'),
  error: require('node_modules/antlr4/error/index'),
  Token: require('node_modules/antlr4/Token').Token,
  CommonToken: require('node_modules/antlr4/Token').Token,
  InputStream: require('node_modules/antlr4/InputStream').InputStream,
  // does not make any sense for the browser
  //FileStream = require('./FileStream').FileStream;
  CommonTokenStream: require('node_modules/antlr4/CommonTokenStream').CommonTokenStream,
  Lexer: require('node_modules/antlr4/Lexer').Lexer,
  Parser: require('node_modules/antlr4/Parser').Parser,
  PredictionContextCache: require('node_modules/antlr4/PredictionContext').PredictionContextCache,
  ParserRuleContext: require('node_modules/antlr4/ParserRuleContext').ParserRuleContext,
  Interval: require('node_modules/antlr4/IntervalSet').Interval,
  Utils: require('node_modules/antlr4/Utils')
};
