import _ from 'lodash';


function toItem(query, text) {
  let index = text.indexOf(query);
  let html;

  if(index >= 0) {
    html = `
<span>${text.substr(0, index)}</span>
<b>${text.substr(index, query.length)}</b>
<span>${text.substr(index + query.length)}</span>`;
  } else {
    index = Infinity;
    html = text;
  }

  return {
    text,
    index,
    html: `<td class="typeahead-item-text">${html}</td>`
  };
}

function withFieldDecoration(field, item) {
  item.html = `
<td class="typeahead-item-field-type">
  <span>${field.type}</span>
</td>` + item.html;

  return item;
}

function filteredItems($sce, toItem, sources) {
  return _(sources)
    .map(toItem)
    .map(item => {
      item.html = $sce.trustAsHtml(item.html);
      return item;
    })
    .sortBy('index')
    .value();
}


export function tabsFactory(typeahead, { $rootScope, $sce }) {
  // NOTE - typeahead is empty at this point
  return [{
    name: 'history',
    text: 'Previous Searches',
    iconClass: 'fa-clock-o',

    init() { return true; },

    items: null,

    filterItemsByQuery(query) {
      this.items = filteredItems($sce, text => toItem(query, text),
        typeahead.history.get());         // NOTE: History already caches items
    },

    selectItem(item, e) {
      typeahead.applyQueryFilter(item, e);
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
          fields: filteredItems($sce,
            field => withFieldDecoration(field, toItem(query, field.name)),
            idxPattern.fields
              .filter(field => field.filterable))
        }));

      this.items = this.indexPatterns
        .reduce((fields, idxPattern) => [...fields, ...idxPattern.fields], []);
    },

    selectItem(item, e) {
      e.preventDefault();

      const field = _(this.rawIndexPatterns)
        .reduce((fields, idxPattern) => [...fields, ...idxPattern.fields], [])
        .find(fld => fld.name === item);

      if(!field) { return; }

      typeahead.applyText(item);
      $rootScope.$broadcast('NewFilterEditor', { field });
    }
  }];
}

