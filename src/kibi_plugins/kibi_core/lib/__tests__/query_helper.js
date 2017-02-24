import expect from 'expect.js';
import Promise from 'bluebird';
import QueryHelper from '../query_helper';
import sinon from 'auto-release-sinon';

describe('Query Helper', function () {
  let createClientStub;
  let searchStub;
  let fakeServer;
  let queryHelper;


  const doc = {
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

  const credentials = {user: 'user', password: 'password'};

  const searchResponse = {
    hits: {
      hits: [
        {
          _id: '_id1',
          _source: {
            id: 'id1'
          }
        }
      ]
    }
  };

  beforeEach(function () {
    searchStub = sinon.stub().returns(Promise.resolve(searchResponse));
    createClientStub = sinon.stub()
    .returns({
      search: sinon.stub().returns(Promise.resolve(searchResponse))
    });

    fakeServer = {
      log: function (tags, data) {},
      config() {
        return {
          get(key) {
            if (key === 'elasticsearch.url') {
              return 'http://localhost:12345';
            } else if (key === 'kibana.index') {
              return '.kibi';
            } else {
              return '';
            }
          }
        };
      },
      plugins: {
        elasticsearch: {
          getCluster() {
            return {
              getClient() {
                return {
                  search: searchStub
                };
              },
              createClient: createClientStub
            };
          },
        }
      }
    };
    queryHelper = new QueryHelper(fakeServer);
  });

  describe('fetchDocument test if correct client is used', function () {
    it('no credentials', function () {
      return queryHelper.fetchDocument('index', 'type', 'id')
        .then(function (doc) {
          sinon.assert.calledOnce(searchStub);
          sinon.assert.notCalled(createClientStub);
        });
    });

    it('with credentials', function () {
      return queryHelper.fetchDocument('index', 'type', 'id', credentials)
        .then(function (doc) {
          sinon.assert.notCalled(searchStub);
          sinon.assert.calledOnce(createClientStub);
        });
    });

    it('id with colon', function () {
      return queryHelper.fetchDocument('index', 'type', 'id:test')
        .then(function (doc) {
          sinon.assert.calledOnce(searchStub);
          sinon.assert.notCalled(createClientStub);
        });
    });
  });

  describe('replaceVariablesForREST', function () {
    describe('with URI with credentials', function () {
      it('replace in single string', function () {
        const uri = 'index1/type1/id1';
        const s = 'select * from table1 where id = \'@doc[_source][id]@\'';
        const expected = 'select * from table1 where id = \'id1\'';

        return queryHelper.replaceVariablesUsingEsDocument(s, uri, credentials)
          .then(function (ret) {
            sinon.assert.notCalled(searchStub);
            sinon.assert.calledOnce(createClientStub);
            expect(ret).to.equal(expected);
          });
      });

      it('replace in an array of objects with name and value', function () {
        const uri = 'index1/type1/id1';
        const sA = [
          {name: 'param1', value: 'select * from table1 where id = \'@doc[_source][id]@\''},
          {name: 'param2', value: 'select * from table1 where id = \'@doc[_id]@\''}
        ];
        const expectedA = [
          {name: 'param1', value: 'select * from table1 where id = \'id1\''},
          {name: 'param2', value: 'select * from table1 where id = \'_id1\''}
        ];

        return queryHelper.replaceVariablesUsingEsDocument(sA, uri, credentials)
          .then(function (a) {
            sinon.assert.notCalled(searchStub);
            sinon.assert.calledOnce(createClientStub);
            expect(a).to.eql(expectedA);
          });
      });

      it('malformed uri', function () {
        return queryHelper.replaceVariablesUsingEsDocument('s', 'index1/type1-and-no-id')
          .then(() => expect().fail('should fail'))
          .catch(function (err) {
            sinon.assert.notCalled(searchStub);
            sinon.assert.notCalled(createClientStub);
            expect(err.message).to.equal('Malformed uri - should have at least 3 parts: index, type, id');
          });
      });
    });

    describe('with URI  no credentials', function () {
      it('replace in single string', function () {
        const uri = 'index1/type1/id1';
        const s = 'select * from table1 where id = \'@doc[_source][id]@\'';
        const expected = 'select * from table1 where id = \'id1\'';

        return queryHelper.replaceVariablesUsingEsDocument(s, uri)
          .then(function (ret) {
            sinon.assert.calledOnce(searchStub);
            sinon.assert.notCalled(createClientStub);
            expect(ret).to.equal(expected);
          });
      });

      it('replace in an array of objects with name and value', function () {
        const uri = 'index1/type1/id1';
        const sA = [
          {name: 'param1', value: 'select * from table1 where id = \'@doc[_source][id]@\''},
          {name: 'param2', value: 'select * from table1 where id = \'@doc[_id]@\''}
        ];
        const expectedA = [
          {name: 'param1', value: 'select * from table1 where id = \'id1\''},
          {name: 'param2', value: 'select * from table1 where id = \'_id1\''}
        ];

        return queryHelper.replaceVariablesUsingEsDocument(sA, uri)
          .then(function (a) {
            sinon.assert.calledOnce(searchStub);
            sinon.assert.notCalled(createClientStub);
            expect(a).to.eql(expectedA);
          });
      });

      it('malformed uri', function () {
        return queryHelper.replaceVariablesUsingEsDocument('s', 'index1/type1-and-no-id')
          .then(() => expect().fail('should fail'))
          .catch(function (err) {
            sinon.assert.notCalled(searchStub);
            sinon.assert.notCalled(createClientStub);
            expect(err.message).to.equal('Malformed uri - should have at least 3 parts: index, type, id');
          });
      });
    });

    describe('no URI', function () {
      it('ignore the elastic document and variables', function () {
        const path = '';
        const headers = [
          { name: 'header1', value: 'header1value'}
        ];
        const params = [
          { name: 'param1', value: 'param1value'}
        ];
        const body = 'body';

        const expected = {
          headers: headers,
          params: params,
          body: body,
          path: path
        };

        return queryHelper.replaceVariablesForREST(headers, params, body, path, null, null)
          .then(function (result) {
            sinon.assert.notCalled(searchStub);
            sinon.assert.notCalled(createClientStub);
            expect(result).to.eql(expected);
          });
      });

      it('should not modify supplied params, headers and body', function () {
        const path = 'path/$auth_token';
        const headers = [
          { name: 'header1', value: 'header1value $auth_token'}
        ];
        const params = [
          { name: 'param1', value: 'param1value  $auth_token'}
        ];
        const body = 'body $auth_token';
        const variables = {
          $auth_token: '123456'
        };

        const expHeaders = [
          { name: 'header1', value: 'header1value $auth_token'}
        ];
        const expParams = [
          { name: 'param1', value: 'param1value  $auth_token'}
        ];
        const expBody = 'body $auth_token';
        const expPath = 'path/$auth_token';

        return queryHelper.replaceVariablesForREST(headers, params, body, path, null, variables)
          .then(function (result) {
            // after repalcement supplied params shoud NOT be modified
            sinon.assert.notCalled(searchStub);
            sinon.assert.notCalled(createClientStub);
            expect(headers).to.eql(expHeaders);
            expect(params).to.eql(expParams);
            expect(body).to.eql(expBody);
            expect(path).to.eql(expPath);
          });
      });

      it('ignore the elastic document but use variables', function () {
        const path = 'path/$auth_token';
        const headers = [
          { name: 'header1', value: 'header1value $auth_token'}
        ];
        const params = [
          { name: 'param1', value: 'param1value  $auth_token'}
        ];
        const body = 'body $auth_token';

        const variables = {
          $auth_token: '123456'
        };

        const expected = {
          headers: [
            { name: 'header1', value: 'header1value 123456'}
          ],
          params: [
            { name: 'param1', value: 'param1value  123456'}
          ],
          body: 'body 123456',
          path: 'path/123456'
        };

        return queryHelper.replaceVariablesForREST(headers, params, body, path, null, variables)
          .then(function (result) {
            sinon.assert.notCalled(searchStub);
            sinon.assert.notCalled(createClientStub);
            expect(result).to.eql(expected);
          });
      });
    });
  });

  describe('_replaceVariablesInTheQuery', function () {
    it('replaceVariablesInTheQuery', function () {
      const query = '@doc[_source][id]@';
      const expected = '12345';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('replaceVariablesInTheQuery multiple expresions', function () {
      const query = '  @doc[_source][title]@  @doc[_source][id]@  @doc[_id]@  ';
      const expected = '  title12345  12345  _12345_  ';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('replaceVariablesInTheQuery multiple same expresions', function () {
      const query = '  @doc[_source][id]@  @doc[_source][id]@  ';
      const expected = '  12345  12345  ';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('replaceVariablesInTheQuery sql query', function () {
      const query = 'select label, description, category_code, url ' +
        'from company ' +
        'where id = \'@doc[_source][id]@\' ' +
        'limit 100';
      const expected = 'select label, description, category_code, url ' +
        'from company ' +
        'where id = \'12345\' ' +
        'limit 100';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });
  });

  describe('_replaceVariablesInTheQuery nested', function () {
    it('nested', function () {
      const query = '@doc[_source][nested1][nested2][nested3][id]@';
      const expected = 'nested12345';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('nested multivalued first', function () {
      const query = '@doc[_source][nested1][nested2][nested3][ids][0]@';
      const expected = 'nested_id0';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });
  });

  describe('_replaceVariablesInTheQuery multivalued', function () {
    it('first element of multivalued', function () {
      const query = '@doc[_source][ids][0]@';
      const expected = 'id0';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('second element of multivalued', function () {
      const query = '@doc[_source][ids][1]@';
      const expected = 'id1';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });

    it('third element of multivalued', function () {
      const query = '@doc[_source][ids][2]@';
      const expected = 'id2';
      expect(queryHelper._replaceVariablesInTheQuery(doc, query)).to.eql(expected);
    });
  });
});
