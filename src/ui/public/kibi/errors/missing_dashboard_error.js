export function MissingDashboardError(message) {
  this.name = 'MissingDashboardError';
  this.message = message || 'One of the dashboards is missing';
  this.stack = (new Error()).stack;
}
MissingDashboardError.prototype = Object.create(Error.prototype);
MissingDashboardError.prototype.constructor = MissingDashboardError;
