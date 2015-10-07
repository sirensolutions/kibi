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

  it('replaceVariablesInTheQuery', function () {
    var query = '@doc[_source][id]@';
    var expected = '12345';
    expect(queryHelper.replaceVariablesInTheQuery(doc, query)).to.eql(expected);
  });

  it('replaceVariablesInTheQuery multiple expresions', function () {
    var query = '  @doc[_source][title]@  @doc[_source][id]@  @doc[_id]@  ';
    var expected = '  title12345  12345  _12345_  ';
    expect(queryHelper.replaceVariablesInTheQuery(doc, query)).to.eql(expected);
  });

  it('replaceVariablesInTheQuery multiple same expresions', function () {
    var query = '  @doc[_source][id]@  @doc[_source][id]@  ';
    var expected = '  12345  12345  ';
    expect(queryHelper.replaceVariablesInTheQuery(doc, query)).to.eql(expected);
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
    expect(queryHelper.replaceVariablesInTheQuery(doc, query)).to.eql(expected);
  });

});
