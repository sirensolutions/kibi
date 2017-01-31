import requirefrom from 'requirefrom';

const packageJson = requirefrom('src/utils')('package_json');

/**
 * Defines the following objects:
 *
 * - a configuration
 * - 2 templates at version 1 (kibi-template-jade, kibi-template-handlebars)
 * - 1 template at version 1 that already contains a renamed attribute (kibi-jinja2)
 * - 1 template at version 2
 * - 1 query at version 2
 */
module.exports = [
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
      _id: 'top-50-companies'
    }
  },
  {
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
    activationQuery: '',
    datasourceId: 'sql-datasource',
    resultQuery: 'select id, label, employees from company order by employees desc limit 50',
    tags: [],
    title: 'Top 50 companies by number of employees',
    version: 2
  },
  {
    index: {
      _index: '.kibi',
      _type: 'template',
      _id: 'kibi-table-handlebars'
    }
  },
  {
    description: 'A Handlebars template',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    st_templateEngine: 'handlebars',
    st_templateSource: '{{! Handlebars table template example}}',
    title: 'kibi-table-handlebars',
    version: 1
  },
  {
    index: {
      _index: '.kibi',
      _type: 'template',
      _id: 'kibi-table-jade'
    }
  },
  {
    description: 'A Jade template.',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    st_templateEngine: 'jade',
    st_templateSource: '//- Jade generic table template example',
    title: 'kibi-table-jade',
    version: 1
  },
  {
    index: {
      _index: '.kibi',
      _type: 'template',
      _id: 'kibi-jinja2'
    }
  },
  {
    description: 'A Jinja2 template.',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    st_templateEngine: 'jinja',
    templateEngine: 'jinja2',
    st_templateSource: '//- Jade generic table template example',
    title: 'kibi-table-jade',
    version: 1
  },
  {
    index: {
      _index: '.kibi',
      _type: 'template',
      _id: 'kibi-table-jade-2'
    }
  },
  {
    description: 'Another Jade template.',
    kibanaSavedObjectMeta: {
      searchSourceJSON: '{}'
    },
    templateEngine: 'jade',
    templateSource: '//- Another jade generic table template example',
    title: 'kibi-table-jade-2',
    version: 2
  }
];
