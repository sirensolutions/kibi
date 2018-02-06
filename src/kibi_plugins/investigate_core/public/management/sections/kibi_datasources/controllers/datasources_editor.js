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
import { map } from 'lodash';
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
  // Setup parameters for connection helper panel
  $scope.databaseParams = {
    databaseType: '',
    databaseName: ''
  };

  // Default values for JDBC datasource params
  const datasourceDefaults = {
    "Dremio": {
      "driverClassName": "com.dremio.jdbc.Driver",
      "defaultURL": "jdbc:dremio:direct={{host}}:{{port}}{{databasename}}",
      "defaultPort": 31010,
      "disclaimer": "This is a sample connection string, see the <a target=\"_blank\" href=\"https://docs.dremio.com/drivers/dremio-jdbc-driver.html\">Dremio JDBC documentation</a> for further information."
    },
    "MySQL": {
      "driverClassName": "com.mysql.jdbc.Driver" ,
      "defaultURL": "jdbc:mysql://{{host}}:{{port}}{{databasename}}?useLegacyDatetimeCode=false",
      "defaultPort": 3306,
      "disclaimer": "This is a sample connection string, see the <a target=\"_blank\" href=\"https://dev.mysql.com/doc/connector-j/5.1/en/connector-j-reference.html\">MySQL Connector/J documentation</a> for further information."
    },
    "PostgreSQL": {
      "driverClassName": "org.postgresql.Driver",
      "defaultURL": "jdbc:postgresql://{{host}}:{{port}}{{databasename}}",
      "defaultPort": 5432,
      "disclaimer": "This is a sample connection string, see the <a target=\"_blank\" href=\"https://jdbc.postgresql.org/documentation/94/connect.html\">PostgreSQL JDBC documentation</a> for further information."
    },
    "SQL Server 2017": {
      "driverClassName": "com.microsoft.sqlserver.jdbc.SQLServerDriver",
      "defaultURL": "jdbc:sqlserver://{{host}}:{{port}}{{databasename}}",
      "defaultPort": 1433,
      "disclaimer": "This is a sample connection string, see the <a target=\"_blank\" href=\"https://docs.microsoft.com/en-us/sql/connect/jdbc/building-the-connection-url\">SQL Server JDBC documentation</a> for further information."
    },
    "SAP ASE 15.7" : {
      "driverClassName": "net.sourceforge.jtds.jdbc.Driver",
      "defaultURL": "jdbc:jtds:sybase://{{host}}:{{port}}{{databasename}}",
      "defaultPort": 5000,
      "disclaimer": "This is a sample connection string, see the <a target=\"_blank\" href=\"http://jtds.sourceforge.net/faq.html#urlFormat\">jTDS documentation</a> for further information." +
                    " If your setup is using the jConnect JDBC Driver, see the <a target=\"_blank\" href=\"https://wiki.scn.sap.com/wiki/display/SYBCON/jConnect+Driver+Overview\">jConnect documentation</a> for further information."
    },
    "Oracle Database 12c": {
      "driverClassName": "oracle.jdbc.OracleDriver",
      "defaultURL": "jdbc:oracle:thin:@//{{host}}:{{port}}{{databasename}}",
      "defaultPort": 1521,
      "disclaimer": "This is a sample connection string, see the <a target=\"_blank\" href=\"https://docs.oracle.com/cd/E11882_01/java.112/e16548/urls.htm#JJDBC08200\">Oracle JDBC documentation</a> for further information."
    },
    "Spark SQL 2.2":  {
      "driverClassName": "com.simba.spark.jdbc41.Driver",
      "defaultURL": "jdbc:spark://{{host}}:{{port}}{{databasename}};UseNativeQuery=1",
      "defaultPort": 10000,
      "disclaimer": "This is a sample connection string, see the <a target=\"_blank\" href=\"https://www.simba.com/products/Spark/doc/JDBC_InstallGuide/content/jdbc/sp/using/connectionurl.htm\">Simba Spark JDBC documentation</a> for further information."
    },
    "Presto": {
      "driverClassName": "com.facebook.presto.jdbc.PrestoDriver",
      "defaultURL":"jdbc:presto://{{host}}:{{port}}{{databasename}}",
      "defaultPort": 8080,
      "disclaimer": "This is a sample connection string, see the <a target=\"_blank\" href=\"https://prestodb.io/docs/current/installation/jdbc.html\">Presto JDBC documentation</a> for further information."
    },
  };

  // Pull out the connection types to populate the dropdown select in the connection helper
  $scope.possibleDatabaseTypes = Object.keys(datasourceDefaults);

  $scope.isNew = $route.current.locals.isNew;
  $scope.isValid = function () {
    return $element.find('form[name="objectForm"]').hasClass('ng-valid');
  };

  $scope.isDeleteValid = function () {
    return $scope.datasource && $scope.datasource.title && $scope.datasource.datasourceType;
  };

  $scope.deleteObject = function () {
    const id = $scope.datasource.title;
    // ask user to delete it as well
    const confirmModalOptions = {
      confirmButtonText: 'Delete the datasource',
      onConfirm: () => {
        jdbcDatasources.delete(id).then(() => {
          notify.info(`Datasource ${id} successfully deleted`);
        }).catch(err => {
          notify.error(err);
        });
      }
    };
    confirmModal(
      `Are you sure you want to delete the datasource [${id}].`,
      confirmModalOptions
    );
  };

  $scope.saveObject = function () {
    if (datasource.datasourceType === 'sql_jdbc_new') {
      const d = jdbcDatasourceTranslate.savedDatasourceToJdbcDatasource(datasource);
      return jdbcDatasources.save(d)
      .then(() => {
        notify.info('Datasource ' + d._id + ' successfully saved');
        kbnUrl.change('management/siren/datasources/' + d._id);
      })
      .catch(notify.error);
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

  /** _populateConnectionString
   *  databaseParams {object}
   *  databaseParams.databaseType {string} The value selected in the connection helper dropdown select
   *  databaseParams.databaseName {string} (optional) User entered database name for JDBC connection
   *
   * Takes in database helper parameters and populates the suggested connection string.
   * Also populates the drivername parameter if not already set by the user.
  */
  function _populateConnectionString(databaseParams) {
    if(datasource.datasourceType === 'sql_jdbc_new' && databaseParams.databaseType) {
      if($scope.isNew) {
        const databaseName = databaseParams.databaseName || '';
        const defaultPort = datasourceDefaults[databaseParams.databaseType].defaultPort || '';
        // Pull out the default driver class names
        const defaultDriverClassNames = map(datasourceDefaults, defaultObject => defaultObject.driverClassName);

        // if there is no drivername (or the drivername is one of the defaults)
        // Update it with the new default. If it is custom-entered by the user, leave it there
        if (!datasource.datasourceParams.drivername) {
          datasource.datasourceParams.drivername = datasourceDefaults[databaseParams.databaseType].driverClassName;
        } else if (defaultDriverClassNames.indexOf(datasource.datasourceParams.drivername) !== -1) {
          datasource.datasourceParams.drivername = datasourceDefaults[databaseParams.databaseType].driverClassName;
        }

        datasource.datasourceParams.disclaimer = datasourceDefaults[databaseParams.databaseType].disclaimer || '';
        let url = datasourceDefaults[databaseParams.databaseType].defaultURL;

        if (url) {
          // SQL Server and Dremio add the database as query params
          let databaseString;
          if (databaseParams.databaseType === 'SQL Server 2017') {
            databaseString = `;databaseName=${databaseName}`;
          } else if (databaseParams.databaseType === 'Dremio') {
            databaseString = `;schema=${databaseName}`;
          } else {
            databaseString = `/${databaseName}`;
          }

          url = url.replace(/{{port}}/, (defaultPort) ? defaultPort : '');
          url = url.replace(/{{host}}/, 'localhost');
          url = url.replace(/{{databasename}}/, (databaseName) ? databaseString : '');
        }
        datasource.datasourceParams.connection_string = url;
      }
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

  // Toggle the connection helper panel
  $scope.openConnectionPanel = () => $scope.toggleConnectionPanel = !$scope.toggleConnectionPanel;
  $scope.acceptConnectionString = () => $scope.toggleConnectionPanel = false;

  $scope.newObject = function () {
    kbnUrl.change('management/siren/datasources', {});
  };

  $scope.$watch('datasource.datasourceType', function (newval, oldval) {
    // here reinit the datasourceDef
    if (datasource.datasourceType === 'sql_jdbc_new' && datasource.title === 'New Saved Datasource') {
      datasource.title = '';
    }

    setDatasourceSchema(datasource);
  });

  $scope.$watchGroup([
    'databaseParams.databaseType',
    'databaseParams.databaseName'
  ], function ([ databaseType, databaseName ]) {
    _populateConnectionString({
      databaseType,
      databaseName
    });
  });

  // currently supported only for sql_jdbc_new
  $scope.testConnection = function () {
    const modalOptions = {
      title: 'JDBC datasource configuration successful',
      confirmButtonText: 'Yes, take me there',
      cancelButtonText: 'No, will do later',
      onConfirm: () => kbnUrl.change('/management/siren/virtualindices/'),
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
  [ 'isValid', 'newObject', 'saveObject', 'isDeleteValid', 'deleteObject' ]
  .forEach(name => {
    $element.data(name, $scope[name]);
  });
}

uiModules
.get('apps/management', ['kibana'])
.controller('DatasourcesEditor', controller);
