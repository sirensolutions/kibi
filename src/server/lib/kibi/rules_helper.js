var url    = require('url');
var Promise = require('bluebird');
var logger = require('../logger');
var queryHelper = require('../sindicetech/query_helper');

function RulesHelper() {}


RulesHelper.prototype.evaluate = function (rules, selectedDocuments) {

  // for now there should be only 1 selectedDocument
  if (selectedDocuments.length !== 1) {
    return Promise.reject(new Error('RulesHelper supports only 1 selected document at the moment'));
  }

  if (selectedDocuments[0] === '') {
    return Promise.reject(new Error('Empty selected document uri'));
  }

  var uri = selectedDocuments[0];
  var parts = uri.trim().split('/');
  if (parts.length < 3) {
    return Promise.reject(new Error('Malformed uri - should have at least 3 parts: index, type, id'));
  }

  var index = parts[0];
  var type = parts[1];
  var id = parts[2];


  return queryHelper.fetchDocument(index, type, id).then(function (doc) {

    var checks = [rules.length];
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];

      var regex = /^@doc\[.+?\]@$/;
      if (!regex.test(rule.s)) {
        return false;
      }

      var propertyGroup = rule.s.replace('@doc', '');
      propertyGroup = propertyGroup.substring(0, propertyGroup.length - 1);
      var value = queryHelper._getValue(doc, propertyGroup);

      switch (rule.p) {
        case 'is_not_empty':
          if (value instanceof Array) {
            checks[i] = value.length > 0;
          } else {
            checks[i] = value !== '';
          }
          break;
        case 'exists':
          checks[i] = typeof value !== 'undefined';
          break;
        case 'is_an_array':
          checks[i] = queryHelper._getValue(doc, propertyGroup) instanceof Array;
          break;
        case 'length_greater_than':
          var expected = parseInt(rule.v);
          checks[i] = value.length && value.length > expected;
          break;
        case 'matches':
          regex = new RegExp(rule.v);
          checks[i] = regex.test(value);
          break;
        default:
      }

      if (checks[i] !== true) {
        return false;
      }
    }

    // all the rules passed return true
    return true;
  });

};

module.exports = new RulesHelper();
