define(function (require) {
  var _ = require('lodash');
  /*
   *  Finds an existing joinSetFilter in array of filters and replace it
   *  In case array does not contain any joinSetFilter the suplied one is added to it.
   *
   *  This method modifies "filterArray"
   */
  return function replaceOrAddJoinSetFilter(filterArray, joinSetFilter, stripMeta) {
    if (filterArray instanceof Array) {
      var replaced = false;
      if (stripMeta === true) {
        delete joinSetFilter.meta;
      }

      _.each(filterArray, function (f, index) {
        if (f.join_set) {
          filterArray[index] = joinSetFilter;
          replaced = true;
          return false;
        }
      });
      if (!replaced) {
        filterArray.push(joinSetFilter);
      }
    }
  };
});
