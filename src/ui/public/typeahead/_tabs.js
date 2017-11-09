import _ from 'lodash';


function filteredItems(items, query) {
  const beginningMatches = items.filter(item => item.indexOf(query) === 0);
  const otherMatches = items.filter(item => item.indexOf(query) > 0);

  return beginningMatches.concat(otherMatches);
}


export default function tabsFactory(typeahead) {
  // NOTE - typeahead is empty at this point
  return [{
    name: 'history',
    text: 'Previous Searches',
    iconClass: 'fa-clock-o',

    init() { return true },

    items: null,

    filterItemsByQuery(query) {
      // History already caches items
      return this.items = filteredItems(typeahead.history.get(), query);
    },

    selectItem(item, e) {
      typeahead.selectFilter(item, e);
    }
  }, {
    name: 'filter',
    text: 'Create Field Filter',

    rawIndexPatterns: null,
    indexPatterns: null,
    items: null,

    init() {
      this.rawIndexPatterns = (typeahead.scope.indexPatterns || []);
      return this.rawIndexPatterns.length > 0;
    },

    filterItemsByQuery(query) {
      this.indexPatterns = this.rawIndexPatterns
        .map(idxPattern => ({
          title: idxPattern.title,
          fields: filteredItems(
            idxPattern.fields
              .filter(field => field.filterable)
              .map(field => field.name),
            query)
        }));

      return this.items = this.indexPatterns
        .reduce((fields, idxPattern) => [...fields, ...idxPattern.fields], []);
    },

    selectItem(item, e) {
      e.preventDefault();

      const field = _(this.rawIndexPatterns)
        .reduce((fields, idxPattern) => [...fields, ...idxPattern.fields], [])
        .find(fld => fld.name === item);

      if(!field) { return; }

      typeahead.services.$rootScope.$broadcast('NewFilterEditor', { field });
      typeahead.setHidden(true);
    }
  }];
}

