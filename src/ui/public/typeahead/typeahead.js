import _ from 'lodash';
import 'ui/typeahead/typeahead.less';
import 'ui/typeahead/_input';
import 'ui/typeahead/_items';
import 'ui/typeahead/_items_list';
import { tabsFactory } from 'ui/typeahead/_tabs';
import { uiModules } from 'ui/modules';
const typeahead = uiModules.get('kibana/typeahead');


typeahead.directive('kbnTypeahead', function () {
  const keyMap = {
    ESC: 27,
    UP: 38,
    DOWN: 40,
    TAB: 9,
    ENTER: 13
  };

  return {
    restrict: 'A',
    scope: {
      historyKey: '@kbnTypeahead',
      onSelect: '&',

      // kibi: Index patterns passed in for field filters typeahead
      indexPatterns: '=',
    },
    controllerAs: 'typeahead',

    controller: function ($scope, PersistedLog, config, $element, $rootScope, $sce) {
      const self = this;
      self.query = '';
      self.hidden = true;
      self.focused = false;
      self.mousedOver = false;

      // kibi: More state vars
      const tabs = tabsFactory(self, { $rootScope, $sce });

      self.scope = $scope;

      self.tabs = null;
      self.tabName = '';
      self.tab = null;

      self.lastVisible = false;
      self.explicit = false;
      // kibi: end

      // instantiate history and add items to the scope
      self.history = new PersistedLog('typeahead:' + $scope.historyKey, {
        maxLength: config.get('history:limit'),
        filterDuplicates: true
      });

      // kibi: Removed cached history (already cached) and made filtered items
      //       tab-specific

      self.setInputModel = function (model) {
        $scope.inputModel = model;

        // watch for changes to the query parameter, delegate to typeaheadCtrl
        $scope.$watch('inputModel.$viewValue', self.filterItemsByQuery);
      };

      self.setHidden = function (hidden) {
        self.hidden = !!(hidden);

        // kibi: Disable explicit mode on hide
        self.explicit = !self.hidden && self.explicit;
      };

      self.setFocused = function (focused) {
        self.focused = !!(focused);
      };

      self.setMouseover = function (mousedOver) {
        self.mousedOver = !!(mousedOver);
      };

      // activation methods
      self.activateItem = function (item) {
        // kibi: Items are objects that include html + text now
        self.active = item.text;
      };

      self.getActiveIndex = function () {
        if (!self.active) {
          return;
        }

        // kibi: Items are object with text compoment
        return self.tab.items.findIndex(item => item.text === self.active);
      };

      self.getItems = function () {
        // kibi: Items are tab-specific
        return self.tab.items;
      };

      self.activateNext = function () {
        // kibi: filtered items located in each tab
        let index = self.getActiveIndex();
        if (index == null) {
          index = 0;
        } else if (index < self.tab.items.length - 1) {
          ++index;
        }

        self.activateItem(self.tab.items[index]);
        // kibi: end

        // kibi: Included scrollbar for long item lists, so scroll to item if required
        self.scrollActiveIntoView();
      };

      self.activatePrev = function () {
        let index = self.getActiveIndex();

        if (index > 0 && index != null) {
          --index;
        } else if (index === 0) {
          self.active = false;
          return;
        }

        // kibi: filtered items located in each tab + scroll to item if necessary
        self.activateItem(self.tab.items[index]);
        self.scrollActiveIntoView();
      };

      self.isActive = function (item) {
        return item === self.active;
      };

      // selection methods

      // kibi: Delegated the effect of item selection to tabs, added callbacks
      //       for tabs to invoke as they see fit
      self.applyText = function (text) {
        $scope.inputModel.$setViewValue(text);
        $scope.inputModel.$render();

        self.active = false;
        self.setHidden(true);
      };

      self.applyQueryFilter = function (text, ev) {
        self.applyText(text);
        self.persistEntry();

        if (ev && ev.type === 'click') {
          $scope.onSelect();
        }
      };
      // kibi: end

      self.persistEntry = function () {
        if ($scope.inputModel.$viewValue.length) {
          // push selection into the history
          // kibi: removed duplicated history cache
          self.history.add($scope.inputModel.$viewValue);
        }
      };

      // kibi: Removed selectActive(), not needed

      self.keypressHandler = function (ev) {
        const keyCode = ev.which || ev.keyCode;

        // kibi: Using setHidden() to change self.hidden
        if (self.focused) {
          self.setHidden(false);
        }

        // hide on escape
        if (_.contains([keyMap.ESC], keyCode)) {
          self.setHidden(true);
        }
        // kibi: end

        // kibi: Using TAB/Shift+TAB to change tab
        if (_.contains([keyMap.TAB] && ev.shiftKey, keyCode)) {
          ev.preventDefault();
          self.changeTab(-1);
        }
        if (_.contains([keyMap.TAB], keyCode)) {
          ev.preventDefault();
          self.changeTab(+1);
        }
        // kibi: end

        // change selection with arrow up/down
        // on down key, attempt to load all items if none are loaded
        if (_.contains([keyMap.DOWN], keyCode) && !self.isVisible()) {
          // kibi: Made this 'explicit' mode
          self.explicit = true;
          $scope.$digest();
        } else if (_.contains([keyMap.UP, keyMap.DOWN], keyCode)) {
          // kibi: Filtered items moved to tabs
          if (self.isVisible() && self.tab.items.length) {
            ev.preventDefault();

            if (keyCode === keyMap.DOWN) {
              self.activateNext();
            } else {
              self.activatePrev();
            }
          }
        }

        // kibi: Selection and eventual persistence is delegated to tabs

        // select on enter
        if (_.contains([keyMap.ENTER], keyCode)) {
          self.tab.selectItem(self.active || self.query, ev);
        }
        // kibi: end
      };

      // kibi: Items filtering is delegated to tabs
      self.filterItemsByQuery = function (query = self.query) {
        self.query = query;
        self.tabs.forEach(tab => tab.filterItemsByQuery(query));
        self.active = false;
      };
      // kibi: end

      // kibi: Updated visibility requirements wrt 'explicit' mode and tabs
      self.isVisible = function () {
        return !self.hidden &&
          (self.explicit ||
            (!!self.query && self.tab.items.length > 0)) &&
          (self.focused || self.mousedOver);
      };
      // kibi: end

      // kibi: Additional functions

      self.tabIndex = function () {
        return _.findIndex(self.tabs, tab => tab.name === self.tabName);
      };

      self.initTabs = function () {
        self.tabs = tabs.filter(tab => tab.init());

        if(!self.setTabName(self.tabName)) {
          // Tabs can be unavailable - in case, switch back to history
          self.setTabName('history');
        }
      };

      self.setTabName = function (tabName) {
        const tab = self.tabs.find(tab => tab.name === tabName);
        if(!tab) { return false; }

        self.tabName = tabName;
        self.tab = tab;

        self.filterItemsByQuery();
        return true;
      };

      self.changeTab = function (dx) {
        const newTabIndex = (self.tabIndex() + self.tabs.length + dx) % self.tabs.length;
        self.setTabName(self.tabs[newTabIndex].name);
      };


      self.trackVisibility = function () {
        const visible = self.isVisible();

        if(visible && !self.lastVisible) {
          self.initTabs();
        }

        self.lastVisible = visible;
        return visible;
      };

      self.scrollActiveIntoView = function () {
        if(!self.active) { return; }

        const tabContent = $element.find('.typeahead-tab-content');
        const items = tabContent.find('.typeahead-item');

        const tabContentEl = tabContent.get()[0];
        const activeEl = items.get()[self.getActiveIndex()];

        if(!activeEl) { return; }

        const tabContentRect = tabContentEl.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();

        // Using scrollTop rather than scrollIntoView because the latter does not
        // affect just the parent scrollbar - page is scrolled too

        if(activeRect.top < tabContentRect.top) {
          tabContentEl.scrollTop -= tabContentRect.top - activeRect.top;
        } else if(tabContentRect.bottom < activeRect.bottom) {
          tabContentEl.scrollTop += activeRect.bottom - tabContentRect.bottom;
        }
      };
      // kibi: end

      // kibi: Explicit tabs startup
      self.initTabs();
    },

    link: function ($scope, $el, attrs) {
      if (!_.has(attrs, 'onSelect')) {
        throw new Error('on-select must be defined');
      }
      // should be defined via setInput() method
      if (!$scope.inputModel) {
        throw new Error('kbn-typeahead-input must be defined');
      }

      $scope.$watch('typeahead.isVisible()', function (vis) {
        $el.toggleClass('visible', vis);
      });
    }
  };
});
