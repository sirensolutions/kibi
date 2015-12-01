var root = require('requirefrom')('');
var queryHelper = root('src/server/lib/sindicetech/query_helper');
var expect = require('expect.js');
var Promise = require('bluebird');
var sinon = require('sinon');

var doc = {
  _id: '_12345_',
  _source: {
    id: '12345',
    title: 'title12345',
    ids: ['id0', 'id1', 'id2'],
    nested1: {
      nested2: {
        nested3: {
          id: 'nested12345',
          ids: ['nested_id0']
        }
      }
    }
  }
};


var stub;

describe('Query Helper', function () {

  before(function () {
    stub = sinon.stub(queryHelper, 'fetchDocument').returns(
      Promise.resolve({
        _id: '_id1',
        _source: {
          id: 'id1'
        }
      })
    );
  });

  after(function () {
    if (stub) {
      stub.restore();
    }
  });

  describe('replaceVariablesForREST', function () {

    describe('with URI', function () {

      it('replace in single string', function (done) {
        var uri = 'index1/type1/id1';
        var s        = 'select * from table1 where id = \'@doc[_source][id]@\'';
        var expected = 'select * from table1 where id = \'id1\'';

        queryHelper.replaceVariablesUsingEsDocument(s, uri).then(function (ret) {
          expect(ret).to.equal(expected);
          done();
        });
      });

      it('replace in an array of objects with name and value', function (done) {
        var uri = 'index1/type1/id1';
        var s_a = [
          {name: 'param1', value: 'select * from table1 where id = \'@doc[_source][id]@\''},
          {name: 'param2', value: 'select * from table1 where id = \'@doc[_id]@\''}
        ];
        var expected_a = [
          {name: 'param1', value: 'select * from table1 where id = \'id1\''},
          {name: 'param2', value: 'select * from table1 where id = \'_id1\''}
        ];

        queryHelper.replaceVariablesUsingEsDocument(s_a, uri).then(function (a) {
          expect(a).to.eql(expected_a);
          done();
        });
      });

      it('malformed uri', function (done) {
        queryHelper.replaceVariablesUsingEsDocument('s', 'index1/type1-and-no-id')
        .catch(function (err) {
          expect(err.message).to.equal('Malformed uri - should have at least 3 parts: index, type, id');
          done();
        });
      });
    });

    describe('no URI', function () {

      it('ignore the elastic document and varaibles', function (done) {
        var path = '';
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
          body: body,
          path: path
        };

        queryHelper.replaceVariablesForREST(headers, params, body, path, null, null).then(function (result) {

          expect(result).to.eql(expected);
          done();
        });
      });

      it('should not modify supplied params, headers and body', function (done) {
        var path = 'path/$auth_token';
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

        var exp_headers = [
          { name: 'header1', value: 'header1value $auth_token'}
        ];
        var exp_params = [
          { name: 'param1', value: 'param1value  $auth_token'}
        ];
        var exp_body = 'body $auth_token';
        var exp_path = 'path/$auth_token';


        queryHelper.replaceVariablesForREST(headers, params, body, path, null, variables).then(function (result) {
          // after repalcement supplied params shoud NOT be modified
          expect(headers).to.eql(exp_headers);
          expect(params).to.eql(exp_params);
          expect(body).to.eql(exp_body);
          expect(path).to.eql(exp_path);
          done();
        });
      });


      it('ignore the elastic document but use variables', function (done) {
        var path = 'path/$auth_token';
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
          body: 'body 123456',
          path: 'path/123456'
        };

        queryHelper.replaceVariablesForREST(headers, params, body, path, null, variables).then(function (result) {

          expect(result).to.eql(expected);
          done();
        });
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

  describe('_replaceVariablesInTheQuery nested', function () {
    it('nested', function () {
      var query = '@doc[_source][nested1][nested2][nested3][id]@';
      var expected = 'nested12345';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('nested multivalued first', function () {
      var query = '@doc[_source][nested1][nested2][nested3][ids][0]@';
      var expected = 'nested_id0';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });
  });


  describe('_replaceVariablesInTheQuery multivalued', function () {

    it('first element of multivalued', function () {
      var query = '@doc[_source][ids][0]@';
      var expected = 'id0';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('second element of multivalued', function () {
      var query = '@doc[_source][ids][1]@';
      var expected = 'id1';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('third element of multivalued', function () {
      var query = '@doc[_source][ids][2]@';
      var expected = 'id2';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

  });


});
