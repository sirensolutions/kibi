import _ from 'lodash';
// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version
export default function () {
  const self = this;
  const scriptFields = {};
  let docvalueFields = [];


  // kibi: added extra if self.fields.byType exists before using it
  let notScriptedFields = [];
  if (self.fields.byType) {
    notScriptedFields = _.reject(self.fields.byType.date, 'scripted');
  }
  // kibi: end
  docvalueFields = _.map(notScriptedFields, 'name');

  _.each(self.getScriptedFields(), function (field) {
    scriptFields[field.name] = {
      script: {
        inline: field.script,
        lang: field.lang
      }
    };
  });

  return {
    storedFields: ['*'],
    scriptFields: scriptFields,
    docvalueFields: docvalueFields
  };

}
