import _ from 'lodash';
import uiModules from 'ui/modules';

uiModules
.get('queries_editor/services/saved_queries')
.factory('SavedQuery', function (courier) {
  _.class(SavedQuery).inherits(courier.SavedObject);
  function SavedQuery(id) {
    courier.SavedObject.call(this, {
      type: SavedQuery.type,
      mapping: SavedQuery.mapping,
      searchSource: SavedQuery.searchSource,
      init: SavedQuery.init,

      id: id,

      defaults: {
        title: 'New Saved Query',
        description: '',
        activationQuery: '',
        resultQuery: '',
        datasourceId: '',
        tags: '',
        rest_params: '[]',
        rest_headers: '[]',
        rest_variables: '[]',
        rest_body: '',
        rest_method: 'GET',
        rest_path: '',
        rest_resp_status_code: 200,
        activation_rules: '[]',
        version: 2
      }
    });
  }

  SavedQuery.type = 'query';
  SavedQuery.mapping = {
    title: 'string',
    description: 'string',
    activationQuery: 'string',
    resultQuery: 'string',
    datasourceId: 'string',
    tags: 'string',
    rest_params: 'json',
    rest_headers: 'json',
    rest_variables: 'json',
    rest_body: 'string',
    rest_method: 'string',
    rest_path: 'string',
    rest_resp_status_code: 'long',
    activation_rules: 'json',
    version: 'integer'
  };
  SavedQuery.init = function () {
    try {
      if (this.rest_params && typeof this.rest_params === 'string') {
        this.rest_params = JSON.parse(this.rest_params);
      }
    } catch (e) {
      throw new Error('Could not parse rest_params for query [' + this.id + ']');
    }
    try {
      if (this.rest_headers && typeof this.rest_headers === 'string') {
        this.rest_headers = JSON.parse(this.rest_headers);
      }
    } catch (e) {
      throw new Error('Could not parse rest_headers for query [' + this.id + ']');
    }
    try {
      if (this.rest_variables && typeof this.rest_variables === 'string') {
        this.rest_variables = JSON.parse(this.rest_variables);
      }
    } catch (e) {
      throw new Error('Could not parse rest_variables for query [' + this.id + ']');
    }
    try {
      if (this.activation_rules && typeof this.activation_rules === 'string') {
        this.activation_rules = JSON.parse(this.activation_rules);
      }
    } catch (e) {
      throw new Error('Could not parse activation_rules for query [' + this.id + ']');
    }
  };
  SavedQuery.searchSource = true;

  return SavedQuery;
});
