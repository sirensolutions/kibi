module.exports = function (hit) {
  if (hit.coordinate_search) {
    const actions = hit.coordinate_search.actions;
    for (let j = 0; j < actions.length; j++) {
      if (actions[j].is_pruned) {
        return true;
      }
    }
  }
  return false;
};
