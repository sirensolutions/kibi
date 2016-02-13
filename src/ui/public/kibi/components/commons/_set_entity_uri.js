define(function (require) {
  return function (globalState) {

    return function (holder) {
      if (globalState.se && globalState.se.length > 0) {
        holder.entityURI = globalState.se[0];
      } else {
        holder.entityURI = '';
      }
    };

  };
});
