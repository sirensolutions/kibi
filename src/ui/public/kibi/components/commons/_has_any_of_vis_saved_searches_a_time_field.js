define(function (require) {

  const _ = require('lodash');

  return function hasAnyOfVisSavedSearchesATimeFieldFactory(Private, Promise, savedSearches) {
    const TemplateVisType = Private(require('ui/template_vis_type/TemplateVisType'));
    const VislibVisType = Private(require('ui/vislib_vis_type/VislibVisType'));

    return function (vis, timeFieldName) {
      if (!(vis.type instanceof TemplateVisType || vis.type instanceof VislibVisType)) {
        return Promise.reject(new Error('vis.type should be an instance of TemplateVisType or VislibVisType'));
      }
      if (vis.type.requiresMultiSearch) {
        // here have to grab all indices from all searchSources and check if at least one has a time field
        if (vis.type.name === 'kibi_timeline') {
          const promises = _.map(vis.params.groups, (group) => savedSearches.get(group.savedSearchId));
          return Promise.all(promises).then((results) => {
            for (let i = 0; i < results.length; i++) {
              if (results[i].searchSource.get('index').hasTimeField()) {
                return true;
              }
            }
            return false;
          });
        }
      }

      // be quiet if unsupported visualisation is passed to play nicely with any third party vis
      return Promise.resolve(!!timeFieldName);
    };
  };
});
