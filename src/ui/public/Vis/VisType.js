define(function (require) {
  return function VisTypeFactory(Private) {
    let VisTypeSchemas = Private(require('ui/Vis/Schemas'));

    function VisType(opts) {
      opts = opts || {};

      this.name = opts.name;
      this.title = opts.title;
      this.responseConverter = opts.responseConverter;
      this.hierarchicalData = opts.hierarchicalData || false;
      this.icon = opts.icon;
      this.description = opts.description;
      this.schemas = opts.schemas || new VisTypeSchemas();
      this.params = opts.params || {};
      if (opts.version) {
        this.version = opts.version;
      }
      this.requiresSearch = opts.requiresSearch == null ? true : opts.requiresSearch; // Default to true unless otherwise specified
      // kibi: Default to false unless otherwise specified
      // this is used for the spy panel of visualizations that query more than one index
      this.requiresMultiSearch = opts.requiresMultiSearch == null ? false : opts.requiresMultiSearch;
      // kibi: allow a visualization to retrieve results by itself
      this.delegateSearch = opts.delegateSearch == null ? false : opts.delegateSearch;
      // kibi: initialize a visualization based on the linked saved search
      this.init = opts.init;
    }

    return VisType;
  };
});
