import SetDatasourceSchemaProvider from '../set_datasource_schema';
import expect from 'expect.js';
import ngMock from 'ng_mock';
import { find } from 'lodash';

describe('set datasource schema', function () {
  let setDatasourceSchema;

  beforeEach(function () {
    ngMock.module('kibana', $provide => {
      const schemas = {
        sqlite: [
          {
            name: 'timeout',
            label: 'Timeout',
            inputType: 'number',
            dataType: 'integer',
            required: false,
            multivalued: false,
            encrypted: false,
            defaultValue: 1000,
            placeholder: 'Timeout in ms'
          },
          {
            name: 'db_file_path',
            label: 'Database file path',
            required: true,
            multivalued: false,
            encrypted: false,
            inputType: 'text',
            defaultValue: '',
            placeholder: 'Absolute path to the database file'
          },
          {
            name: 'cache_enabled',
            label: 'Cache enabled',
            inputType: 'checkbox',
            required: false,
            multivalued: false,
            encrypted: false,
            defaultValue: false,
            placeholder: 'Enable server side cache for this datasource'
          },
        ]
      };
      $provide.constant('kibiDatasourcesSchema', schemas);
    });

    ngMock.inject(function (Private) {
      setDatasourceSchema = Private(SetDatasourceSchemaProvider);
    });
  });

  it('should set the schema of the sqlite datasource', function () {
    const datasource = {
      id: 'd1',
      datasourceType: 'sqlite'
    };

    setDatasourceSchema(datasource);
    expect(datasource.schema.length).not.to.be(0);
    expect(find(datasource.schema, 'name', 'db_file_path')).to.be.ok();
  });

  it('should reset the schema if the datasource type is unknown', function () {
    const datasource = {
      id: 'd1',
      datasourceType: 'nope'
    };

    setDatasourceSchema(datasource);
    expect(datasource.schema.length).to.be(0);
    expect(datasource.datasourceDef).to.be(null);
  });

  it('should return a clean datasource', function () {
    const datasource = {
      datasourceType: 'sqlite',
      datasourceParams: {
        nope: 'nope',
        cache_enabled: true
      }
    };

    setDatasourceSchema(datasource);
    expect(datasource.schema.length).not.to.be(0);
    expect(datasource.datasourceParams.nope).to.be(undefined);
    expect(datasource.datasourceParams.timeout).to.be(1000);
    expect(datasource.datasourceParams.cache_enabled).to.be(true);
  });
});
