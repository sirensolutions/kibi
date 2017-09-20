import { SQLHelperFactory } from 'ui/kibi/helpers/sql_helper';
import expect from 'expect.js';
import ngMock from 'ng_mock';

let sqlHelper;

function init() {
  return function () {
    ngMock.module('kibana');
    ngMock.inject(function (Private) {
      sqlHelper = Private(SQLHelperFactory);
    });
  };
}

describe('Kibi Components', function () {

  describe('SQLHelper', function () {

    describe('should extract parameters correctly from the following queries', function () {

      beforeEach(init());

      const queries = [
        {
          query: 'SELECT currency.id, currency.name AS currencyName, country.name AS country ' +
            'FROM currencies, country WHERE country.currency = currency.id',
          expectedVariables: ['currency.id', 'currencyName', 'country']
        },
        {
          query: 'SELECT currency.id, [currency.name] AS currencyName, country.name AS country ' +
            'FROM currencies, country WHERE country.currency = currency.id',
          expectedVariables: ['currency.id', 'currencyName', 'country']
        },
        {
          query: 'SELECT currency.*, country.name AS country FROM currencies, country WHERE country.currency = currency.id',
          expectedVariables: ['country']
        },
        {
          query: 'SELECT DISTINCT name FROM currencies',
          expectedVariables: ['name']
        },
        {
          query: 'SELECT name FROM (SELECT * FROM currencies)',
          expectedVariables: ['name']
        },
        {
          query: 'ELECT name FROM (SELECT * FROM currencies)',
          expectToThrow: true
        },
        {
          query: 'SELECT name, \'value\' FROM table',
          expectedVariables: ['name']
        },
        {
          query: 'SELECT DISTINCT first_name, last_name FROM people',
          expectedVariables: ['first_name', 'last_name']
        },
        {
          query: 'SELECT COUNT(id) AS count FROM people WHERE country = 20',
          expectedVariables: ['count']
        },
        {
          query: 'select investor.id, count(investment_investor.investmentId) as c ' +
            'from investor, investment_investor, investor_countrycode ' +
            'where investor.id = investment_investor.investorId ' +
            'and investor.id = investor_countrycode.investorid ' +
            'and investor_countrycode.countrycode = \'SWE\' ' +
            'group by investor.id ' +
            'order by c desc ' +
            'limit 100',
          expectedVariables: ['investor.id', 'c']
        },
        {
          query: 'select quantity FROM @doc[_source][table]@ WHERE code = @doc[_source][code]@',
          expectedVariables: ['quantity']
        },
        {
          query: 'select quantity FROM @doc[_source][table]@ WHERE code = \'@doc[_source][code]@\'',
          expectedVariables: ['quantity']
        },
        {
          query: 'select quantity FROM @doc[_source][table]@ WHERE code = \'@doc[_source][code]@',
          expectToThrow: true
        },
        {
          query: 'select company.label ' +
            'from company ' +
            'where company.category_code IN ( ' +
            'select category_code from company ' +
            'where company.id = \'@doc[_source][companyidF]@\' ' +
            ') ' +
            'limit 100',
          expectedVariables: ['company.label']
        },
        {
          query: `select distinct company.label,company.id,number_of_employees
          from company
          where company.category_code IN
          (
            select category_code
            from company
            where company.id = '@doc[_source][id]@'
          )
          order by number_of_employees desc
          limit 20`,
          expectedVariables: [ 'company.label', 'company.id', 'number_of_employees' ]
        },
        {
          query: `select distinct company.label,company.id,number_of_employees
          from company
          where company.category_code IN
          (
            select category_code
            from company
            where company.id = @doc[_source][id]@
          )
          order by number_of_employees desc
          limit 20`,
          expectedVariables: [ 'company.label', 'company.id', 'number_of_employees' ]
        }
      ];

      const testQuery = function (queryDef) {
        if (queryDef.expectToThrow) {
          expect(sqlHelper.getVariables).withArgs(queryDef.query).to.throwError();
        } else {
          expect(sqlHelper.getVariables(queryDef.query)).to.eql(queryDef.expectedVariables);
        }
      };

      for (let i = 0; i < queries.length; i++) {
        it(queries[i].query, testQuery.bind(this, queries[i]));
      }
    });

  });

});
