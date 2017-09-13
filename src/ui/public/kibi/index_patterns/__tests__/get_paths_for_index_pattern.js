import expect from 'expect.js';
import ngMock from 'ng_mock';
import { getPathsForIndexPattern } from 'ui/kibi/index_patterns/_get_paths_for_index_pattern';

describe('kibi indexpattern', function () {
  describe('getPathsForIndexPattern', function () {
    let mockGetPathsForIndexPattern;

    beforeEach(ngMock.module('kibana'));
    beforeEach(ngMock.inject(function (Private) {
      mockGetPathsForIndexPattern = Private(getPathsForIndexPattern);
    }));

    it('should return the path for every field in the index pattern', function () {
      const properties = {
        '@message': {
          type: 'string',
          norms: {
            enabled: false
          },
          fields: {
            raw: {
              type: 'string',
              index: 'not_analyzed'
            }
          }
        },
        geo: {
          properties: {
            coordinates: {
              type: 'geo_point'
            },
            dest: {
              type: 'string',
              index: 'not_analyzed'
            },
            src: {
              type: 'string',
              index: 'not_analyzed'
            },
            srcdest: {
              type: 'string',
              index: 'not_analyzed'
            }
          }
        }
      };
      const response = {
        'logstash-2016.11.01': {
          mappings: {
            apache: {
              properties: properties
            },
            nginx: {
              properties: properties
            }
          }
        },
        'logstash-2016.11.02': {
          mappings: {
            apache: {
              properties: properties
            },
            nginx: {
              properties: properties
            }
          }
        }
      };
      const expected = {
        '@message': [ '@message' ],
        'geo.coordinates': [ 'geo', 'coordinates' ],
        'geo.dest': [ 'geo', 'dest' ],
        'geo.src': [ 'geo', 'src' ],
        'geo.srcdest': [ 'geo', 'srcdest' ]
      };

      expect(mockGetPathsForIndexPattern(response)).to.eql(expected);
    });

    it('should support dotted field names', function () {
      const properties = {
        'geo.one': {
          properties: {
            coordinates: {
              type: 'geo_point'
            },
            dest: {
              type: 'string',
              index: 'not_analyzed'
            },
            src: {
              type: 'string',
              index: 'not_analyzed'
            },
            srcdest: {
              type: 'string',
              index: 'not_analyzed'
            }
          }
        }
      };
      const response = {
        'logstash-2016.11.01': {
          mappings: {
            apache: {
              properties: properties
            },
            nginx: {
              properties: properties
            }
          }
        },
        'logstash-2016.11.02': {
          mappings: {
            apache: {
              properties: properties
            },
            nginx: {
              properties: properties
            }
          }
        }
      };
      const expected = {
        'geo.one.coordinates': [ 'geo.one', 'coordinates' ],
        'geo.one.dest': [ 'geo.one', 'dest' ],
        'geo.one.src': [ 'geo.one', 'src' ],
        'geo.one.srcdest': [ 'geo.one', 'srcdest' ]
      };

      expect(mockGetPathsForIndexPattern(response)).to.eql(expected);
    });
  });
});
