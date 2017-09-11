import _ from 'lodash';
import sinon from 'sinon';
import Promise from 'bluebird';
import IndexPattern from 'ui/index_patterns/_index_pattern';
import formatHit from 'ui/index_patterns/_format_hit';
import getComputedFields from 'ui/index_patterns/_get_computed_fields';
import RegistryFieldFormatsProvider from 'ui/registry/field_formats';
import IndexPatternsFlattenHitProvider from 'ui/index_patterns/_flatten_hit';
import IndexPatternsFieldListProvider from 'ui/index_patterns/_field_list';

export function StubIndexPatternProvider(Private) {
  const fieldFormats = Private(RegistryFieldFormatsProvider);
  const flattenHit = Private(IndexPatternsFlattenHitProvider);
  const FieldList = Private(IndexPatternsFieldListProvider);

  // kibi: added the indexList for testing time-based indices
  function StubIndexPattern(pattern, timeField, fields, indexList) {
    this.id = pattern;
    this.popularizeField = sinon.spy();
    this.timeFieldName = timeField;
    this.getNonScriptedFields = sinon.spy();
    this.getScriptedFields = sinon.spy();
    this.getSourceFiltering = sinon.spy();
    this.metaFields = ['_id', '_type', '_source'];
    this.fieldFormatMap = {};
    this.routes = IndexPattern.routes;

    // kibi: stub the paths array
    this.paths = {};
    _.each(fields, field => {
      this.paths[field.name] = field.path;
    });
    // kibi: end

    // kibi: allow to test time-based indices
    this.isTimeBased = _.constant(Boolean(timeField));

    this.toIndexList = sinon.stub().returns(Promise.resolve(indexList || [pattern]));
    this.toDetailedIndexList = _.constant(Promise.resolve([
      {
        index: indexList || pattern,
        min: 0,
        max: 1
      }
    ]));
    // kibi: end
    this.getComputedFields = _.bind(getComputedFields, this);
    this.flattenHit = flattenHit(this);
    this.formatHit = formatHit(this, fieldFormats.getDefaultInstance('string'));
    this.formatField = this.formatHit.formatField;

    this._reindexFields = function () {
      this.fields = new FieldList(this, this.fields || fields);
    };

    this.stubSetFieldFormat = function (fieldName, id, params) {
      const FieldFormat = fieldFormats.byId[id];
      this.fieldFormatMap[fieldName] = new FieldFormat(params);
      this._reindexFields();
    };

    this._reindexFields();
  }

  return StubIndexPattern;
}
