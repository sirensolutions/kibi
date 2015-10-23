define(function (require) {
  var _ = require('lodash');

  return function RelationVisHelperFactory(Private, savedDashboards, savedSearches) {

    var kibiStateHelper  = Private(require('components/kibi/kibi_state_helper/kibi_state_helper'));
    var urlHelper        = Private(require('components/kibi/url_helper/url_helper'));
    var joinFilterHelper = Private(require('components/sindicetech/join_filter_helper/join_filter_helper'));

    function RelationVisHelper() {

    }

    RelationVisHelper.prototype.constructButtonsArray = function (buttonDefs, currentDashboardIndexId) {
      return _.chain(buttonDefs)
        .filter(function (buttonDef) {
          if (!currentDashboardIndexId) {
            return buttonDef.sourceIndexPatternId && buttonDef.label;
          }
          return buttonDef.sourceIndexPatternId === currentDashboardIndexId && buttonDef.label;
        })
        .map(function (buttonDef) {
          var button = _.clone(buttonDef);
          button.joinFilter = null;

          button.click = function () {
            if (!currentDashboardIndexId) {
              return;
            }
            kibiStateHelper.saveFiltersForDashboardId(urlHelper.getCurrentDashboardId(), urlHelper.getCurrentDashboardFilters());
            kibiStateHelper.saveQueryForDashboardId(urlHelper.getCurrentDashboardId(), urlHelper.getCurrentDashboardQuery());


            if (button.filterLabel) {
              this.joinFilter.meta.value = button.filterLabel
              .replace(/\$COUNT/g, this.sourceCount)
              .replace(/\$DASHBOARD/g, urlHelper.getCurrentDashboardId());
            } else {
              this.joinFilter.meta.value = '... related to (' + this.sourceCount + ') from ' + urlHelper.getCurrentDashboardId();
            }


            if (this.joinFilter) {
              // get filters from dashboard we would like to switch to
              var targetDashboardQuery   = kibiStateHelper.getQueryForDashboardId(this.redirectToDashboard);
              var targetDashboardFilters = kibiStateHelper.getFiltersForDashboardId(this.redirectToDashboard);
              var targetDashboardTimeFilter = kibiStateHelper.getTimeForDashboardId(this.redirectToDashboard);

              // add or Filter and switch
              if (!targetDashboardFilters) {
                targetDashboardFilters = [this.joinFilter];
              } else {
                joinFilterHelper.replaceOrAddJoinFilter(targetDashboardFilters, this.joinFilter);
              }

              // switch to target dashboard
              urlHelper.replaceFiltersAndQueryAndTime(
                targetDashboardFilters,
                targetDashboardQuery,
                targetDashboardTimeFilter);
              urlHelper.switchDashboard(this.redirectToDashboard);
            } else {
              // just redirect to the target dashboard
              urlHelper.switchDashboard(this.redirectToDashboard);
            }

          };
          return button;
        }).value();
    };


    return new RelationVisHelper();
  };

});
