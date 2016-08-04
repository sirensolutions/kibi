define(function (require) {
  return function (globalState) {

    return function (holder) {
      holder.entityURI = '';
      if (holder.visible) {
        if (globalState.se_temp && globalState.se_temp.length > 0) {
          holder.entityURI = globalState.se_temp[0];
        } else if (globalState.se && globalState.se.length > 0) {
          holder.entityURI = globalState.se[0];
        }
      }
    };

  };
});
