var expect = require('expect.js');
var Promise = require('bluebird');
var clientSearchCounter;
var createdClientSearchCounter;

var fakeServer = {
  log: function (tags, data) {},
  config: function () {
    return {
      get: function (key) {
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
      client: {
        search: function (options) {
          clientSearchCounter++;
          return Promise.resolve({
            hits: {
              hits: [
                {
                  _id: '_id1',
                  _source: {
                    id: 'id1',
                    numerical_ids: [1,2],
                    string_ids: ['a','b'],
                    mixed_ids: [1,'a',2,'b']
                  },
                }
              ]
            }
          });
        }
      },
      createClient: function (credentials) {
        return {
          search: function (options) {
            createdClientSearchCounter++;
            return Promise.resolve({
              hits: {
                hits: [
                  {
                    _id: '_id1',
                    _source: {
                      id: 'id1',
                      numerical_ids: [1,2],
                      string_ids: ['a','b'],
                      mixed_ids: [1,'a',2,'b']
                    }
                  }
                ]
              }
            });
          }
        };
      }
    }
  }
};
var QueryHelper = require('../query_helper');
var queryHelper = new QueryHelper(fakeServer);

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

var credentials = {user: 'user', password: 'password'};

describe('Query Helper', function () {

  beforeEach(function () {
    clientSearchCounter = 0;
    createdClientSearchCounter = 0;
  });

  describe('fetchDocument test if correct client is used', function () {
    it('no credentials', function (done) {
      queryHelper.fetchDocument('index', 'type', 'id').then(function (doc) {
        expect(clientSearchCounter).to.equal(1);
        expect(createdClientSearchCounter).to.equal(0);
        done();
      });
    });

    it('with credentials', function (done) {
      queryHelper.fetchDocument('index', 'type', 'id', credentials).then(function (doc) {
        expect(clientSearchCounter).to.equal(0);
        expect(createdClientSearchCounter).to.equal(1);
        done();
      });
    });

    it('id with colon', function (done) {
      queryHelper.fetchDocument('index', 'type', 'id:test').then(function (doc) {
        expect(clientSearchCounter).to.equal(1);
        expect(createdClientSearchCounter).to.equal(0);
        done();
      });
    });
  });

  describe('replaceVariablesForREST', function () {
    [
      {
        description: 'with URI with credentials',
        options: {
          selectedDocuments: [
            {
              index: 'index1',
              type: 'type1',
              id: 'id1'
            }
          ],
          credentials
        },
        assertions() {
          expect(clientSearchCounter).to.equal(0);
          expect(createdClientSearchCounter).to.equal(1);
        }
      },
      {
        description: 'with URI no credentials',
        options: {
          selectedDocuments: [
            {
              index: 'index1',
              type: 'type1',
              id: 'id1'
            }
          ]
        },
        assertions() {
          expect(clientSearchCounter).to.equal(1);
          expect(createdClientSearchCounter).to.equal(0);
        }
      }
    ].forEach(({ description, options, assertions }) => {
      describe(description, function () {

        it('replace in single string', function () {
          var s        = 'select * from table1 where id = \'@doc[_source][id]@\'';
          var expected = 'select * from table1 where id = \'id1\'';

          return queryHelper.replaceVariablesUsingEsDocument(s, options)
            .then(function (ret) {
              assertions();
              expect(ret).to.equal(expected);
            });
        });

        it('replace in single where value is an array of integers', function () {
          var s = '[@doc[_source][numerical_ids]@]';
          var expected = '[1,2]';
          return queryHelper.replaceVariablesUsingEsDocument(s, options)
            .then(function (ret) {
              assertions();
              expect(ret).to.equal(expected);
            });
        });

        it('replace in single where value is an array strings', function () {
          var s = '[@doc[_source][string_ids]@]';
          var expected = '["a","b"]';
          return queryHelper.replaceVariablesUsingEsDocument(s, options)
            .then(function (ret) {
              assertions();
              expect(ret).to.equal(expected);
            });
        });

        it('replace in single where value is an array of mixed strings and integers', function () {
          var s = '[@doc[_source][mixed_ids]@]';
          var expected = '[1,"a",2,"b"]';
          return queryHelper.replaceVariablesUsingEsDocument(s, options).then(function (ret) {
            assertions();
            expect(ret).to.equal(expected);
          });
        });

        it('replace in an array of objects with name and value', function () {
          var sA = [
            {name: 'param1', value: 'select * from table1 where id = \'@doc[_source][id]@\''},
            {name: 'param2', value: 'select * from table1 where id = \'@doc[_id]@\''}
          ];
          var expectedA = [
            {name: 'param1', value: 'select * from table1 where id = \'id1\''},
            {name: 'param2', value: 'select * from table1 where id = \'_id1\''}
          ];

          return queryHelper.replaceVariablesUsingEsDocument(sA, options)
            .then(function (a) {
              assertions();
              expect(a).to.eql(expectedA);
            });
        });

        it('bad document identifier', function () {
          const s = 'select * from table1 where id = \'@doc[_source][id]@\'';
          const badDocument = [
            {
              index: 'index1',
              type: 'type1-and-no-id'
            }
          ];
          return queryHelper.replaceVariablesUsingEsDocument(s, { selectedDocuments: badDocument })
          .then(() => expect().fail('should fail'))
            .catch(function (err) {
              expect(clientSearchCounter).to.equal(0);
              expect(createdClientSearchCounter).to.equal(0);
              expect(err.message).to.equal('The selected document should be identified with 3 components: index, type, and id');
            });
        });
      });
    });
  });

  describe('no URI', function () {

    it('ignore the elastic document and variables', function (done) {
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

      queryHelper.replaceVariablesForREST(headers, params, body, path).then(function (result) {
        expect(clientSearchCounter).to.equal(0);
        expect(createdClientSearchCounter).to.equal(0);
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

      var expHeaders = [
        { name: 'header1', value: 'header1value $auth_token'}
      ];
      var expParams = [
        { name: 'param1', value: 'param1value  $auth_token'}
      ];
      var expBody = 'body $auth_token';
      var expPath = 'path/$auth_token';


      queryHelper.replaceVariablesForREST(headers, params, body, path, undefined, variables).then(function (result) {
        // after repalcement supplied params shoud NOT be modified
        expect(clientSearchCounter).to.equal(0);
        expect(createdClientSearchCounter).to.equal(0);
        expect(headers).to.eql(expHeaders);
        expect(params).to.eql(expParams);
        expect(body).to.eql(expBody);
        expect(path).to.eql(expPath);
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

      queryHelper.replaceVariablesForREST(headers, params, body, path, undefined, variables).then(function (result) {
        expect(clientSearchCounter).to.equal(0);
        expect(createdClientSearchCounter).to.equal(0);
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
