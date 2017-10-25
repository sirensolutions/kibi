import datasourcesSchema from '../datasources_schema';
import expect from 'expect.js';
import { find } from 'lodash';

describe('datasources schema', function () {

  it('should get the sqlite schema', function () {
    const sqlite = datasourcesSchema.getSchema('sqlite');
    expect(find(sqlite, 'name', 'db_file_path').label).to.be('Database file path');
  });

  it('should fail getting unknown schema', function () {
    expect(datasourcesSchema.getSchema).withArgs('nope').to.throwError('Could not get schema for datasource type: nope.');
  });

});
