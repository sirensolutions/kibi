import datasourcesSchema from '../datasources_schema';
import expect from 'expect.js';
import { sortBy, find } from 'lodash';

describe('datasources schema', function () {
  it('should get the base schema', function () {
    const base = datasourcesSchema.getBase();
    expect(base).to.have.length(1);
    expect(base[0].name).to.be('timeout');
  });

  it('should get the sqlite schema', function () {
    const sqlite = datasourcesSchema.getSchema('sqlite');
    expect(find(sqlite, 'name', 'db_file_path').label).to.be('Database file path');
  });

  it('should fail getting unknown schema', function () {
    expect(datasourcesSchema.getSchema).withArgs('nope').to.throwError('Could not get schema for datasource type: nope.');
  });

  it('should merge base schema with the custom schema', function () {
    const schemas = {
      base: [
        {
          name: 'aaa'
        },
        {
          name: 'bbb',
          value: 1,
          leaveit: 'boy'
        }
      ],
      rest: [
        {
          name: 'bbb',
          value: 2
        },
        {
          name: 'ccc'
        }
      ]
    };

    const origSchemas = datasourcesSchema.setSchemas(schemas);
    const schema = sortBy(datasourcesSchema.getSchema('rest'), 'name');

    datasourcesSchema.setSchemas(origSchemas);

    expect(schema).to.have.length(3);
    expect(schema[0].name).to.be('aaa');
    expect(schema[1].name).to.be('bbb');
    expect(schema[1].value).to.be(2);
    expect(schema[1].leaveit).to.be('boy');
    expect(schema[2].name).to.be('ccc');
  });
});
