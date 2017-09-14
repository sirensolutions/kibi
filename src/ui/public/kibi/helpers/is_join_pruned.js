module.exports = function (response) {
  return response.planner && response.planner.is_pruned === true;
};
