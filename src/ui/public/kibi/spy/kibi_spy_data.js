define(function (require) {
  return function KibiSpyDataFactory() {
    function KibiSpyData() {
      this.data = [];
    }

    /**
     * Removes any previous added data
     *
     * @returns {undefined}
     */
    KibiSpyData.prototype.clear = function () {
      this.data.length = 0;
    };

    /**
     * Adds some stat about a request of a msearch
     *
     * @param index the index name
     * @param duration the time spent by the request
     * @param query the request
     * @param response the response to the query
     * @param pruned true if the filterjoin query got pruned
     */
    KibiSpyData.prototype.add = function ({ index, request: { duration, query }, response, pruned }) {
      this.data.push({ index, request: { duration, query }, response, pruned });
    };

    /**
     * GetData returns the stats about a msearch
     */
    KibiSpyData.prototype.getData = function () {
      return this.data;
    };

    return KibiSpyData;
  };
});
