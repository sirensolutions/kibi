define(function (require) {
  var _ = require('lodash');

  var $rootScope;
  var sqlHelper;

  function init() {
    return function () {
      module('kibana');

      inject(function ($injector, Private, _$rootScope_) {
        $rootScope = _$rootScope_;
        sqlHelper = Private(require('components/sindicetech/sql_helper/sql_helper'));
      });
    };
  }

  describe('Kibi Components', function () {

    describe('SQLHelper', function () {

      describe('should extract parameters correctly from the following queries', function () {

        beforeEach(init());


        var query1 = 'SELECT currency.id, currency.name AS currencyName, country.name AS country ' +
          'FROM currencies, country WHERE country.currency = currency.id';
        it(query1, function () {
          expect(sqlHelper.getVariables(query1)).to.eql(['currency.id', 'currencyName', 'country']);
        });


        var query2 = 'SELECT currency.id, [currency.name] AS currencyName, country.name AS country ' +
          'FROM currencies, country WHERE country.currency = currency.id';
        it(query2, function () {
          expect(sqlHelper.getVariables(query2)).to.eql(['currency.id', 'currencyName', 'country']);
        });


        var query3 = 'SELECT currency.*, country.name AS country ' +
          'FROM currencies, country WHERE country.currency = currency.id';
        it(query3, function () {
          expect(sqlHelper.getVariables(query3)).to.eql(['country']);
        });


        var query4 = 'SELECT DISTINCT name FROM currencies';
        it(query4, function () {
          expect(sqlHelper.getVariables(query4)).to.eql(['name']);
        });


        var query5 = 'SELECT name FROM (SELECT * FROM currencies)';
        it(query5, function () {
          expect(sqlHelper.getVariables(query5)).to.eql(['name']);
        });


        var query6 = 'ELECT name FROM (SELECT * FROM currencies)';
        it(query6, function () {
          expect(sqlHelper.getVariables(query6)).to.throw;
        });


        var query7 = 'SELECT name, \'value\' FROM table';
        it(query7, function () {
          expect(sqlHelper.getVariables(query7)).to.eql(['name']);
        });


        var query8 = 'SELECT DISTINCT first_name, last_name FROM people';
        it(query8, function () {
          expect(sqlHelper.getVariables(query8)).to.eql(['first_name', 'last_name']);
        });


        var query9 = 'SELECT COUNT(id) AS count FROM people WHERE country = 20';
        it(query9, function () {
          expect(sqlHelper.getVariables(query9)).to.eql(['count']);
        });

        var query10 = 'select investor.id, count(investment_investor.investmentId) as c ' +
          'from investor, investment_investor, investor_countrycode ' +
          'where investor.id = investment_investor.investorId ' +
          'and investor.id = investor_countrycode.investorid ' +
          'and investor_countrycode.countrycode = \'SWE\' ' +
          'group by investor.id ' +
          'order by c desc ' +
          'limit 100';
        it(query10, function () {
          expect(sqlHelper.getVariables(query10)).to.eql(['investor.id', 'c']);
        });

        var query11 = 'select quantity FROM @doc[_source][table]@ WHERE code = @doc[_source][code]@';
        it(query11, function () {
          expect(sqlHelper.getVariables(query11)).to.eql(['quantity']);
        });

        var query12 = 'select quantity FROM @doc[_source][table]@ WHERE code = \'@doc[_source][code]@\'';
        it(query12, function () {
          expect(sqlHelper.getVariables(query12)).to.eql(['quantity']);
        });

        var query13 = 'select quantity FROM @doc[_source][table]@ WHERE code = \'@doc[_source][code]@';
        it(query13, function () {
          expect(sqlHelper.getVariables(query13)).to.throw;
        });

        var queryNestedSelectIn = 'select company.label ' +
          'from company ' +
          'where company.category_code IN ( ' +
          'select category_code from company ' +
          'where company.id = \'@doc[_source][companyidF]@\' ' +
          ') ' +
          'limit 100';
        it(queryNestedSelectIn, function () {
          expect(sqlHelper.getVariables(queryNestedSelectIn)).to.eql(['company.label']);
        });

      });

    });

  });

});
