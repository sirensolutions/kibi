import { QUERY_DEACTIVATED } from './_symbols';
import url    from 'url';
import Promise from 'bluebird';
import QueryHelper from './query_helper';

function RulesHelper(server) {
  this.queryHelper = new QueryHelper(server);
}

RulesHelper.prototype.evaluate = function (rules, selectedDocuments, credentials) {
  const self = this;
  // for now there should be only 1 selectedDocument
  if (selectedDocuments.length > 1) {
    return Promise.reject(new Error('RulesHelper supports only 1 selected document at the moment'));
  }

  const { index, type, id } = selectedDocuments[0];

  return self.queryHelper.fetchDocument(index, type, id, credentials).then(function (doc) {

    for (let i = 0; i < rules.length; i++) {

      let pass = false;
      const rule = rules[i];

      let regex = /^@doc\[.+?\]@$/;
      if (!regex.test(rule.s)) {
        return QUERY_DEACTIVATED;
      }

      let propertyGroup = rule.s.replace('@doc', '');
      propertyGroup = propertyGroup.substring(0, propertyGroup.length - 1);
      const value = self.queryHelper._getValue(doc, propertyGroup);

      switch (rule.p) {
        case 'is_not_empty':
          if (value instanceof Array) {
            pass = value.length > 0;
          } else {
            pass = value !== '' && value !== undefined && value !== null;
          }
          break;
        case 'exists':
          pass = typeof value !== 'undefined';
          break;
        case 'is_an_array':
          pass = self.queryHelper._getValue(doc, propertyGroup) instanceof Array;
          break;
        case 'length_greater_than':
          const expected = parseInt(rule.v);
          pass = value.length && value.length > expected;
          break;
        case 'matches':
          regex = new RegExp(rule.v);
          pass = regex.test(value);
          break;
        default:
      }

      if (pass !== true) {
        return false;
      }
    }

    // all the rules passed return true
    return true;
  });

};

module.exports = RulesHelper;
