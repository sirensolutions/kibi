var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('lodash');
var handlebars = require('handlebars'); //it has to be in node_nodules
var http = require('http');
var queryEngine = require('../lib/sindicetech/queryEngine');

var _validateQueryDefs = function (queryDefs) {
  if (queryDefs && queryDefs instanceof Array) {
    return true;
  }
  return false;
};

router.get('/clearCache', function (req, res, next) {
  res.send({
    done: queryEngine.clearCache()
  });
});

router.get('/getQueriesHtml', function (req, res, next) {

  var entityURI    = req.query.entityURI;
  var folderName   = req.query.folderName;
  var queryDefs    = JSON.parse(req.query.queryDefs);

  if (_validateQueryDefs(queryDefs) === false) {
    res.send({
      query: '',
      error: 'queryDefs should be an Array of queryDef objects'
    });
    return;
  }

  queryEngine.getQueriesHtml(entityURI, folderName, queryDefs)
  .then(function (queries) {

    res.send({
      query: req.query,
      snippets: queries
    });

  }).catch(function (error) {

    res.send({
      query: req.query,
      error: error
    });

  });

});

router.get('/getIdsFromQueries', function (req, res, next) {

  var entityURI  = req.query.entityURI;
  var folderName = req.query.folderName;
  var queryDefs  = JSON.parse(req.query.queryDefs);

  if (_validateQueryDefs(queryDefs) === false) {
    res.send({
      query: '',
      error: 'queryDefs should be an Array of QueryDef objects'
    });
    return;
  }
  queryEngine.getIdsFromQueries(entityURI, queryDefs, folderName)
  .then(function (queries) {

    res.send({
      query: req.query,
      snippets: queries
    });

  }).catch(function (error) {

    res.send({
      query: req.query,
      error: error
    });

  });
});


router.get('/getQueriesData', function (req, res, next) {

  var entityURI  = req.query.entityURI;
  var folderName = req.query.folderName;
  var queryDefs  = JSON.parse(req.query.queryDefs);

  if (_validateQueryDefs(queryDefs) === false) {
    res.send({
      query: '',
      error: 'queryDefs should be an Array '
    });
    return;
  }

  // TODO: add some validation throw an error if mandatory params are missing
  // test with queryIds parameter set

  queryEngine.getQueriesData(entityURI, folderName, queryDefs)
  .then(function (queries) {

    res.send({
      query: req.query,
      snippets: queries
    });

  }).catch(function (error) {

    res.send({
      query: req.query,
      error: error
    });

  });
});

module.exports = router;
