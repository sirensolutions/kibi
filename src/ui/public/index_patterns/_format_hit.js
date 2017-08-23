import _ from 'lodash';
// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a formatted version

export function formatHit(indexPattern, defaultFormat) {

  function convert(hit, val, fieldName) {
    // kibi: added extera check if the fields are there
    const field = indexPattern.fields.length ? indexPattern.fields.byName[fieldName] : null;
    if (!field) return defaultFormat.convert(val, 'html');
    return field.format.getConverterFor('html')(val, field, hit);
  }

  function formatHit(hit) {
    if (hit.$$_formatted) return hit.$$_formatted;

    // use and update the partial cache, but don't rewrite it. _source is stored in partials
    // but not $$_formatted
    const partials = hit.$$_partialFormatted || (hit.$$_partialFormatted = {});
    const cache = hit.$$_formatted = {};

    _.forOwn(indexPattern.flattenHit(hit), function (val, fieldName) {
      // sync the formatted and partial cache
      const formatted = partials[fieldName] == null ? convert(hit, val, fieldName) : partials[fieldName];
      cache[fieldName] = partials[fieldName] = formatted;
    });

    return cache;
  }

  formatHit.formatField = function (hit, fieldName) {
    // kibi: no hit no formatting
    if (!hit) {
      return;
    }
    // kibi: end
    let partials = hit.$$_partialFormatted;
    if (partials && partials[fieldName] != null) {
      return partials[fieldName];
    }

    if (!partials) {
      partials = hit.$$_partialFormatted = {};
    }

    const val = fieldName === '_source' ? hit._source : indexPattern.flattenHit(hit)[fieldName];
    return partials[fieldName] = convert(hit, val, fieldName);
  };

  return formatHit;
}

