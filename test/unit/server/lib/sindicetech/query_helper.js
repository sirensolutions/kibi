var root = require('requirefrom')('');
var queryHelper = root('src/server/lib/sindicetech/query_helper');
var expect = require('expect.js');


describe('Query Helper', function () {
  var doc = {
    _id: '_12345_',
    _source: {
      id: '12345',
      title: 'title12345'
    }
  };


  describe('replaceVariablesForREST', function () {

    it('ignore the elastic document and varaibles', function (done) {
      var headers = [
        { name: 'header1', value: 'header1value'}
      ];
      var params = [
        { name: 'param1', value: 'param1value'}
      ];
      var body = 'body';

      var expected = {
        headers: headers,
        params: params,
        body: body
      };

      queryHelper.replaceVariablesForREST(headers, params, body, null, null).then(function (result) {

        expect(result).to.eql(expected);
        done();
      });
    });

    it('ignore the elastic document but use variables', function (done) {
      var headers = [
        { name: 'header1', value: 'header1value $auth_token'}
      ];
      var params = [
        { name: 'param1', value: 'param1value  $auth_token'}
      ];
      var body = 'body $auth_token';

      var variables = {
        $auth_token: '123456'
      };

      var expected = {
        headers: [
          { name: 'header1', value: 'header1value 123456'}
        ],
        params: [
          { name: 'param1', value: 'param1value  123456'}
        ],
        body: 'body 123456'
      };

      queryHelper.replaceVariablesForREST(headers, params, body, null, variables).then(function (result) {

        expect(result).to.eql(expected);
        done();
      });
    });

  });

  describe('_replaceVariablesInTheQuery', function () {
    it('replaceVariablesInTheQuery', function () {
      var query = '@doc[_source][id]@';
      var expected = '12345';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('replaceVariablesInTheQuery multiple expresions', function () {
      var query = '  @doc[_source][title]@  @doc[_source][id]@  @doc[_id]@  ';
      var expected = '  title12345  12345  _12345_  ';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('replaceVariablesInTheQuery multiple same expresions', function () {
      var query = '  @doc[_source][id]@  @doc[_source][id]@  ';
      var expected = '  12345  12345  ';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });


    it('replaceVariablesInTheQuery sql query', function () {
      var query = 'select label, description, category_code, url ' +
                'from company ' +
                'where id = \'@doc[_source][id]@\' ' +
                'limit 100';
      var expected = 'select label, description, category_code, url ' +
                'from company ' +
                'where id = \'12345\' ' +
                'limit 100';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });
  });


});
