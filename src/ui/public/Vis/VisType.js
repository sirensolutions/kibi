define(function (require) {
  return function VisTypeFactory(Private) {
    var VisTypeSchemas = Private(require('ui/Vis/Schemas'));

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
    }

    return VisType;
  };
});
