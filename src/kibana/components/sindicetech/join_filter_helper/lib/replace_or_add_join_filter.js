define(function (require) {
  var _ = require('lodash');
  /*
   *  Finds an existing joinFilter in array of filters and replace it
   *  In case array does not contain any joinFilter the suplied one is added to it.
   *
   *  This method modifies "filterArray"
   */
  return function replaceOrAddJoinFilter(filterArray, joinFilter, stripMeta) {
    if (filterArray instanceof Array) {
      var replaced = false;
      if (stripMeta === true) {
        delete joinFilter.meta;
      }

      _.each(filterArray, function (f, index) {
        if (f.join_set) {
          filterArray[index] = joinFilter;
          replaced = true;
          return false;
        }
      });
      if (!replaced) {
        filterArray.push(joinFilter);
      }
    }
  };
});
