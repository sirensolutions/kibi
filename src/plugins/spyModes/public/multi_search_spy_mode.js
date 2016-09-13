define(function (require) {
  require('plugins/spyModes/multi_search_spy_mode.less');
  function VisSpyMulti(Notifier, $filter, $rootScope, config, Private) {
    return {
      name: 'multiSearch',
      display: 'Multi Search',
      order: 5,
      allowSpyMode: function (visType) {
        return visType.requiresMultiSearch;
      },
      template: require('plugins/spyModes/multi_search_spy_mode.html')
    };
  }

  require('ui/registry/spy_modes').register(VisSpyMulti);
});
