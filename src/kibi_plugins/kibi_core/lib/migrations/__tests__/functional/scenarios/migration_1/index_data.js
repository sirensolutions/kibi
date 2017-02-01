import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

/**
 * Defines the following objects:
 *
 * - a configuration
 * - 1 saved query at version 1 that requires an entity selection (companies-in-the-same-domain).
 * - 2 saved queries at version 1 that do not depend on an entity selection (top-20-companies, top-50-companies).
 * - 1 saved query at version 1 that already contains a renamed attribute (top-200-companies)
 * - 1 query at version 2 that does not depend on an entity.
 */
export default [
  {
    index: {
      _index: '.kibi',
      _type: 'config',
      _id: packageJson.kibi_version
    }
  },
  {
    buildNum: packageJson.build.number,
    'dateFormat:tz': 'UTC'
  },
  {
    index: {
      _index: '.kibi',
      _type: 'query',
      _id: 'companies-in-the-same-domain'
    }
  },
  {
    _previewTemplateId: 'kibi-table-jade',
    activation_rules: '[]',
    description: '',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    rest_body: '',
    rest_headers: '[]',
    rest_method: 'GET',
    rest_params: '[]',
    rest_path: '',
    rest_resp_restriction_path: '$',
    rest_resp_status_code: 200,
    st_activationQuery: '',
    st_datasourceId: 'sql-datasource',
    st_resultQuery: 'select distinct company.label, company.id from company where company.category_code IN ' +
                      '(select category_code from company where company.id = \'@doc[_source][id]@\')',
    st_tags: [],
    title: 'Companies in the same domain',
    version: 1
  },
  {
    index: {
      _index: '.kibi',
      _type: 'query',
      _id: 'top-20-companies'
    }
  },
  {
    _previewTemplateId: 'kibi-table-jade',
    activation_rules: '[]',
    description: 'Top 20 companies',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    rest_body: '',
    rest_headers: '[]',
    rest_method: 'GET',
    rest_params: '[]',
    rest_path: '',
    rest_resp_restriction_path: '$',
    rest_resp_status_code: 200,
    st_activationQuery: '',
    st_datasourceId: 'sql-datasource',
    st_resultQuery: 'select id, label, employees from company order by employees desc limit 20',
    st_tags: [],
    title: 'Top 20 companies by number of employees',
    version: 1
  },
  {
    index: {
      _index: '.kibi',
      _type: 'query',
      _id: 'top-50-companies'
    }
  },
  {
    _previewTemplateId: 'kibi-table-jade',
    activation_rules: '[]',
    description: 'Top 50 companies',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    rest_body: '',
    rest_headers: '[]',
    rest_method: 'GET',
    rest_params: '[]',
    rest_path: '',
    rest_resp_restriction_path: '$',
    rest_resp_status_code: 200,
    st_activationQuery: '',
    st_datasourceId: 'sql-datasource',
    st_resultQuery: 'select id, label, employees from company order by employees desc limit 50',
    st_tags: [],
    title: 'Top 50 companies by number of employees',
    version: 1
  },
  {
    index: {
      _index: '.kibi',
      _type: 'query',
      _id: 'top-100-companies'
    }
  },
  {
    activation_rules: '[]',
    description: 'Top 100 companies',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    rest_body: '',
    rest_headers: '[]',
    rest_method: 'GET',
    rest_params: '[]',
    rest_path: '',
    rest_resp_status_code: 200,
    activationQuery: '',
    datasourceId: 'sql-datasource',
    resultQuery: 'select id, label, employees from company order by employees desc limit 100',
    tags: [],
    title: 'Top 100 companies by number of employees',
    version: 2
  },
  {
    index: {
      _index: '.kibi',
      _type: 'query',
      _id: 'top-200-companies'
    }
  },
  {
    _previewTemplateId: 'kibi-table-jade',
    activation_rules: '[]',
    description: 'Top 200 companies',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    rest_body: '',
    rest_headers: '[]',
    rest_method: 'GET',
    rest_params: '[]',
    rest_path: '',
    rest_resp_restriction_path: '$',
    rest_resp_status_code: 200,
    st_activationQuery: '',
    st_datasourceId: 'sql-datasource',
    datasourceId: 'sql-datasource-2',
    st_resultQuery: 'select id, label, employees from company order by employees desc limit 200',
    st_tags: [],
    title: 'Top 200 companies by number of employees',
    version: 1
  }
];
