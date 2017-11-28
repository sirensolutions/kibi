import { ObjDefine } from 'ui/utils/obj_define';
import { IndexPatternsFieldFormatProvider } from 'ui/index_patterns/_field_format/field_format';
import { RegistryFieldFormatsProvider } from 'ui/registry/field_formats';
import { filter } from 'lodash';
import { getKbnFieldType } from '../../../utils';

export function IndexPatternsFieldProvider(Private, shortDotsFilter, $rootScope, createNotifier) {
  const notify = createNotifier({ location: 'IndexPattern Field' });
  const FieldFormat = Private(IndexPatternsFieldFormatProvider);
  const fieldFormats = Private(RegistryFieldFormatsProvider);

  function Field(indexPattern, spec) {
    // unwrap old instances of Field
    if (spec instanceof Field) spec = spec.$$spec;

    // constuct this object using ObjDefine class, which
    // extends the Field.prototype but gets it's properties
    // defined using the logic below
    const obj = new ObjDefine(spec, Field.prototype);

    if (spec.name === '_source') {
      spec.type = '_source';
    }

    // find the type for this field, fallback to unknown type
    let type = getKbnFieldType(spec.type);
    if (spec.type && !type) {
      notify.error(
        'Unknown field type "' + spec.type + '"' +
        ' for field "' + spec.name + '"' +
        ' in indexPattern "' + indexPattern.title + '"'
      );
    }

    if (!type) type = getKbnFieldType('unknown');

    let format = spec.format;
    if (!format || !(format instanceof FieldFormat)) {
      format = indexPattern.fieldFormatMap[spec.name] || fieldFormats.getDefaultInstance(spec.type);
    }

    const indexed = !!spec.indexed;
    const scripted = !!spec.scripted;
    const searchable = !!spec.searchable || scripted;
    const aggregatable = !!spec.aggregatable || scripted;
    const readFromDocValues = !!spec.readFromDocValues && !scripted;
    const sortable = spec.name === '_score' || ((indexed || aggregatable) && type.sortable);
    const filterable = spec.name === '_id' || scripted || ((indexed || searchable) && type.filterable);
    const visualizable = aggregatable;

    obj.fact('name');
    obj.fact('esType', spec.esType);
    obj.fact('type');
    obj.writ('count', spec.count || 0);

    // scripted objs
    obj.fact('scripted', scripted);
    obj.writ('script', scripted ? spec.script : null);
    obj.writ('lang', scripted ? (spec.lang || 'painless') : null);

    // stats
    obj.fact('searchable', searchable);
    obj.fact('aggregatable', aggregatable);
    obj.fact('readFromDocValues', readFromDocValues);

    // usage flags, read-only and won't be saved
    obj.comp('format', format);
    obj.comp('sortable', sortable);
    obj.comp('filterable', filterable);
    obj.comp('visualizable', visualizable);

    // computed values
    obj.comp('indexPattern', indexPattern);
    obj.comp('displayName', shortDotsFilter(spec.name));
    obj.comp('$$spec', spec);

    // conflict info
    obj.writ('conflictDescriptions');

    // kibi: add path sequence and multifields properties
    obj.comp('path', indexPattern.paths && indexPattern.paths[spec.name] || []);

    const multifields = filter(indexPattern.fields, (f) => {
      const nameMatched = f.name.indexOf(spec.name + '.') === 0;
      // if name starts with same prefix + dot
      // do another check to make sure that the field is a subfield
      // and NOT just another field with a "dot" in it
      return nameMatched && indexPattern.kibiPathsFetched && !Boolean(indexPattern.paths[f.name]);
    });
    obj.comp('multifields', multifields);
    // kibi: end

    return obj.create();
  }

  Object.defineProperties(Field.prototype, {
    indexed: {
      get() {
        throw new Error('field.indexed has been removed, see https://github.com/elastic/kibana/pull/11969');
      }
    },
    analyzed: {
      get() {
        throw new Error('field.analyzed has been removed, see https://github.com/elastic/kibana/pull/11969');
      }
    },
    doc_values: {
      get() {
        throw new Error('field.doc_values has been removed, see https://github.com/elastic/kibana/pull/11969');
      }
    },
  });

  Field.prototype.routes = {
    edit: '/management/siren/indices/{{indexPattern.id}}/field/{{name}}'
  };

  return Field;
}
