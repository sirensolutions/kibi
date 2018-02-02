import 'plugins/investigate_core/management/sections/kibi_datasources/styles/datasources_editor.less';
import 'plugins/investigate_core/management/sections/kibi_datasources/services/_saved_datasource';
import 'plugins/investigate_core/management/sections/kibi_datasources/services/saved_datasources';
import 'ui/kibi/components/query_engine_client/query_engine_client';
import 'ui/kibi/directives/kibi_validate';
import SetDatasourceSchemaProvider from 'plugins/investigate_core/management/sections/kibi_datasources/lib/set_datasource_schema';
import template from 'plugins/investigate_core/management/sections/kibi_datasources/index.html';
import kibiUtils from 'kibiutils';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';
import { findKey } from 'lodash';
import { jdbcDatasourceTranslate } from 'plugins/investigate_core/management/sections/kibi_datasources/services/jdbc_datasource_translate';

uiRoutes
.when('/management/siren/datasources', {
  template,
  reloadOnSearch: false,
  resolve: {
    datasource: function (savedDatasources) {
      return savedDatasources.get();
    },
    isNew: function () {
      return true;
    }
  }
})
.when('/management/siren/datasources/:id?', {
  template,
  reloadOnSearch: false,
  resolve: {
    datasource: function ($route, courier, savedDatasources, jdbcDatasources) {
      // first try to get it from _siren/connector
      return jdbcDatasources.get($route.current.params.id)
      .then(datasource => {
        return jdbcDatasourceTranslate.jdbcDatasourceToSavedDatasource(datasource);
      })
      .catch(err => {
        return savedDatasources.get($route.current.params.id)
        .catch(courier.redirectWhenMissing({
          datasource: '/management/siren/datasources'
        }));
      });
    },
    isNew: function () {
      return false;
    }
  }
});

function controller(Private, $window, $scope, $route, kbnUrl, createNotifier,
  queryEngineClient, $element, kibiWarnings, jdbcDatasources, confirmModal) {
  const setDatasourceSchema = Private(SetDatasourceSchemaProvider);
  const notify = createNotifier({
    location: 'Datasources Configuration Editor'
  });
  const datasource = $scope.datasource = $route.current.locals.datasource;

  const datasourceDefaults = {
    "Dremio": {
      "id": "Dremio",
      "driverClassName": "com.dremio.jdbc.Driver",
      "defaultURL": "jdbc:dremio:direct={{host}}:{{port}}{{databasename}}",
      "defaultPort": 31010
    },
    "MySQL": {
      "id": "MySQL",
      "driverClassName": "com.mysql.jdbc.Driver" ,
      "defaultURL": "jdbc:mysql://{{username}}{{host}}:{{port}}{{databasename}}",
      "defaultPort": 3306,
      "disclaimer": "This is a suggested connection string, your setup may vary and may require the addition of, for example, <a href=\"https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference-configuration-properties.html\">UseLegacyDatetime</a>"
    },
    "PostgreSQL": {
      "driverClassName": "org.postgresql.Driver",
      "defaultURL": "jdbc:postgresql://{{username}}{{host}}:{{port}}{{databasename}}",
      "defaultPort": 5342
    },
    "SQLserver 2017": {
      "driverClassName": "com.microsoft.sqlserver.jdbc.SQLServerDriver",
      "defaultURL": "jdbc:sqlserver://{{host}}:{{port}}{{username}}{{databasename}}",
      "defaultPort": 1433
    },
    "Oracle 12a": {
      "driverClassName": "oracle.jdbc.OracleDriver",
      "defaultURL": "jdbc:oracle:thin:@{{host}}:{{port}}",
      "defaultPort": 1521
    },
    "Presto": {
      "driverClassName": "com.facebook.presto.jdbc.PrestoDriver",
      "defaultURL":"jdbc:presto://{{host}}:{{port}}",
      "defaultPort": 8080
    },
  };

  $scope.isNew = $route.current.locals.isNew;
  $scope.isValid = function () {
    return $element.find('form[name="objectForm"]').hasClass('ng-valid');
  };

  $scope.saveObject = function () {
    if (datasource.datasourceType === 'sql_jdbc_new') {
      const d = jdbcDatasourceTranslate.savedDatasourceToJdbcDatasource(datasource);
      return jdbcDatasources.save(d).then(() => {
        notify.info('Datasource ' + d._id + ' successfully saved');
        kbnUrl.change('management/siren/datasources/' + d._id);
      });
    }

    if (kibiWarnings.datasource_encryption_warning) {
      let encrypted = false;
      for (let s = 0; s < datasource.schema.length; s++) {
        const field = datasource.schema[s];
        if (field.encrypted) {
          encrypted = true;
          break;
        }
      }
      if (encrypted && !$window.confirm('You haven\'t set a custom encryption key;' +
          ' are you sure you want to save this datasource?')) {
        return;
      }
    }

    // old jdbc datasources
    if (kibiUtils.isJDBC(datasource.datasourceType)) {
      const msg = 'Changes in a JDBC datasource requires the application to be restarted. ' +
        'Please restart Siren Investigate and do not forget to set investigate_core.load_jdbc to true.';
      notify.warning(msg);
    }

    if (datasource.datasourceType === kibiUtils.DatasourceTypes.tinkerpop3) {
      const datasourceUrl = datasource.datasourceParams.url;
      const baseUrl = datasourceUrl.replace(/\/graph\/query(Batch)?/, '');

      queryEngineClient.gremlinPing(baseUrl).then(function (response) {
        if (response.data.error) {
          notify.warning('Kibi Gremlin Server not available at this address: ' + baseUrl + '. Please check the configuration');
        } else {
          _saveDatasource(datasource);
        }
      })
      .catch(function (err) {
        notify.warning('Kibi Gremlin Server not available at this address: ' + baseUrl + '. Please check the configuration');
      });
    } else {
      _saveDatasource(datasource);
    }
  };

  function _populateDatasourceDefaults(datasource) {

    if(datasource.datasourceType === 'sql_jdbc_new') {
      if (!datasource.datasourceParams.datasourcedriver) {
        datasource.datasourceParams.datasourcedriver = findKey(datasourceDefaults, {
          "driverClassName": datasource.datasourceParams.drivername
        });
      }

      const singleDatasourceDefaults = datasourceDefaults[datasource.datasourceParams.datasourcedriver];
      const driverName = singleDatasourceDefaults.driverClassName;
      const defaultPort = singleDatasourceDefaults.defaultPort || '';

      datasource.datasourceParams.drivername = driverName;
      datasource.datasourceParams.defaultPort = defaultPort;
      datasource.datasourceParams.disclaimer = singleDatasourceDefaults.disclaimer || '';

      datasource.title = (datasource.title !== "New Saved Datasource")
        ? datasource.title
        : datasource.datasourceParams.datasourcedriver;

      _populateConnectionString(datasource);
    }
  }

  function _populateConnectionString(datasource) {
    const userName = datasource.datasourceParams.username || '';
    const password = datasource.datasourceParams.password || '';
    const databaseName = datasource.datasourceParams.databasename || '';
    const defaultPort = datasource.datasourceParams.defaultPort || '';
    if(datasource.datasourceParams.datasourcedriver) {
      let url = datasourceDefaults[datasource.datasourceParams.datasourcedriver].defaultURL;

      if (url) {
        const usernameString = (datasource.datasourceParams.datasourcedriver === 'SQLserver 2017')
        ? `;username=${userName};password=${password}`
        : `${userName}:${password}@`;

        let databaseString;
        if (datasource.datasourceParams.datasourcedriver === 'SQLserver 2017') {
          databaseString = `;database=${databaseName}`;
        } else if (datasource.datasourceParams.datasourcedriver === 'Dremio') {
          databaseString = `;schema=${databaseName}`;
        } else {
          databaseString = `/${databaseName}`;
        }

        url = url.replace(/{{username}}/, (userName && password) ? usernameString : '');
        url = url.replace(/{{port}}/, (defaultPort) ? defaultPort : '');
        url = url.replace(/{{host}}/, 'localhost');
        url = url.replace(/{{databasename}}/, (databaseName) ? databaseString : '');
      }

      datasource.datasourceParams.connection_string = url;
    }
  }

  function _saveDatasource(datasource) {
    // make sure that any parameter which does not belong to the schema
    // is removed from datasourceParams
    for (const prop in datasource.datasourceParams) {
      if (datasource.datasourceParams.hasOwnProperty(prop)) {
        let remove = true;
        for (let j = 0; j < datasource.schema.length; j++) {
          if (datasource.schema[j].name === prop) {
            remove = false;
            break;
          }
        }
        if (remove) {
          delete datasource.datasourceParams[prop];
        }
      }
    }

    datasource.save().then(function (datasourceId) {
      if (datasourceId) {
        $scope.isNew = false;
        notify.info('Datasource ' + datasource.title + ' successfully saved');
        queryEngineClient.clearCache().then(function () {
          kbnUrl.change('management/siren/datasources/' + datasourceId);
        });
      }
    });
  }

  $scope.newObject = function () {
    kbnUrl.change('management/siren/datasources', {});
  };

  $scope.$watch('datasource.datasourceType', function (newval, oldval) {
    // here reinit the datasourceDef
    if (datasource.datasourceType === 'sql_jdbc_new' && datasource.title === 'New saved datasource') {
      datasource.title = '';
    }

    setDatasourceSchema(datasource);
  });

  $scope.$watch('datasource.datasourceParams.datasourcedriver', function (newval, oldval) {
    _populateDatasourceDefaults(datasource);
  });

  $scope.$watchGroup([
    'datasource.datasourceParams.username',
    'datasource.datasourceParams.password',
    'datasource.datasourceParams.databasename',
  ], function () {
    _populateConnectionString(datasource);
  });

  // currently supported only for sql_jdbc_new
  $scope.testConnection = function () {
    const modalOptions = {
      title: 'JDBC datasource configuration successful',
      confirmButtonText: 'Yes, take me there',
      cancelButtonText: 'No, will do later',
      onConfirm: () => kbnUrl.change('/management/siren/virtualindexes/'),
      onCancel: () => {}
    };

    jdbcDatasources.validate(jdbcDatasourceTranslate.savedDatasourceToJdbcDatasource(datasource))
    .then(res => {
      notify.info('Connection OK');
      confirmModal(
        'Next step is to map a remote table (or view) by creating a Virtual Index. Do that now?',
        modalOptions
      );
    })
    .catch(err => {
      if (err && err.error && err.error.reason) {
        notify.error(err.error.reason + ' ' + JSON.stringify(err));
      } else if (err && err.error && err.message) {
        notify.error(err.message + ' ' + JSON.stringify(err));
      } else if (err) {
        notify.error('Unknown error: ' + JSON.stringify(err));
      } else {
        // this happens when Investigate backend is down
        notify.error('Unknown connection error. Please refresh the browser and try again');
      }
    });
  };

  // expose some methods to the navbar buttons
  [ 'isValid', 'newObject', 'saveObject' ]
  .forEach(name => {
    $element.data(name, $scope[name]);
  });
}

uiModules
.get('apps/management', ['kibana'])
.controller('DatasourcesEditor', controller);
