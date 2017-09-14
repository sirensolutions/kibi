module.exports = function (response) {
  return response.planner !== undefined && response.planner.is_pruned === true;
};
