import _ from 'lodash';
import uniqFilters from 'ui/filter_bar/lib/uniq_filters';

export default function CountHelperFactory(createNotifier, kibiState) {

  const notify = createNotifier({
    location: 'Count Helper'
  });

  function CountHelper() {
  }

  /*
   * The parameter savedSearch should be a reference to a SavedSearch
   * instance, not a SavedSearch id
   */
  CountHelper.prototype.constructCountQuery = function (filters, queries, time) {
    const query = {
      size: 0, // we do not need hits just a count
      query: {
        bool: {
          must: {
            match_all: {}
          },
          must_not: [],
          filter: {
            bool: {
              must: []
            }
          }
        }
      }
    };

    if (filters) {
      _.each(filters, function (filter) {

        if (filter.meta && filter.meta.disabled === true) {
          return;  // this return does not break is like continue
        }

        if (filter.meta && filter.meta.negate === true) {

          if (filter.query) {
            query.query.bool.must_not.push(filter.query);
          } else if (filter.dbfilter) {
            query.query.bool.must_not.push({dbfilter: filter.dbfilter});
          } else if (filter.or) {
            query.query.bool.must_not.push({or: filter.or});
          } else if (filter.exists) {
            query.query.bool.must_not.push({exists: filter.exists});
          } else if (filter.geo_bounding_box) {
            query.query.bool.must_not.push({geo_bounding_box: filter.geo_bounding_box});
          } else if (filter.missing) {
            query.query.bool.must_not.push({missing: filter.missing});
          } else if (filter.range) {
            query.query.bool.must_not.push({range: filter.range});
          } else if (filter.script) {
            query.query.bool.must_not.push({script: filter.script});
          } else if (filter.join_set) {
            query.query.bool.must_not.push({join_set: filter.join_set});
          } else if (filter.join_sequence) {
            query.query.bool.must_not.push({join_sequence: filter.join_sequence});
          } else {
            notify.warning('Got unknown filter: ' + JSON.stringify(_.omit(filter, 'meta'), null, ' '));
          }
        } else {

          if (filter.query && !kibiState._isDefaultQuery(filter.query)) {
            // here add only if not "match *" as it would not add anything to the query anyway
            query.query.bool.filter.bool.must.push(filter.query);
          } else if (filter.dbfilter) {
            query.query.bool.filter.bool.must.push({dbfilter: filter.dbfilter});
          } else if (filter.or) {
            query.query.bool.filter.bool.must.push({or: filter.or});
          } else if (filter.exists) {
            query.query.bool.filter.bool.must.push({exists: filter.exists});
          } else if (filter.geo_bounding_box) {
            query.query.bool.filter.bool.must.push({geo_bounding_box: filter.geo_bounding_box});
          } else if (filter.missing) {
            query.query.bool.filter.bool.must.push({missing: filter.missing});
          } else if (filter.range) {
            query.query.bool.filter.bool.must.push({range: filter.range});
          } else if (filter.script) {
            query.query.bool.filter.bool.must.push({script: filter.script});
          } else if (filter.join_set) {
            query.query.bool.filter.bool.must.push({join_set: filter.join_set});
          } else if (filter.join_sequence) {
            query.query.bool.filter.bool.must.push({join_sequence: filter.join_sequence});
          } else {
            notify.warning('Got unknown filter: ' + JSON.stringify(_.omit(filter, 'meta'), null, ' '));
          }

        }

      });
    }

    _.each(queries, (q) => {
      if (!kibiState._isDefaultQuery(q)) {
        // here add only if not "match *" as it would not add anything to the query anyway
        query.query.bool.filter.bool.must.push(q);
      }
    });

    // add time
    if (time) {
      query.query.bool.filter.bool.must.push(time);
    }
    return query;
  };

  return new CountHelper();
};
