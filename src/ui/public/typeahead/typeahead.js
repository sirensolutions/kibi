import _ from 'lodash';
import 'ui/typeahead/typeahead.less';
import 'ui/typeahead/_input';
import 'ui/typeahead/_items';
import 'ui/typeahead/_items_list';
import tabsFactory from 'ui/typeahead/_tabs';
import { uiModules } from 'ui/modules';

const typeahead = uiModules.get('kibana/typeahead');


typeahead.directive('kbnTypeahead', function () {
  const keyMap = {
    TAB: 9,
    ENTER: 13,
    ESC: 27,
    PAGEUP: 33,
    PAGEDOWN: 34,
    UP: 38,
    DOWN: 40
  };

  return {
    restrict: 'A',
    scope: {
      historyKey: '@kbnTypeahead',
      indexPatterns: '=',
      onSelect: '&'
    },
    controllerAs: 'typeahead',

    controller: function ($scope, $element, $rootScope, PersistedLog, config) {
      const self = this;
      const tabs = tabsFactory(self);

      self.scope = $scope;
      self.services = { $rootScope };

      self.tabs = null;
      self.tabName = '';
      self.tab = null;

      self.query = '';
      self.lastVisible = false;
      self.explicit = false;
      self.hidden = true;
      self.focused = false;
      self.mousedOver = false;

      // instantiate history and add items to the scope
      self.history = new PersistedLog('typeahead:' + $scope.historyKey, {
        maxLength: config.get('history:limit'),
        filterDuplicates: true
      });


      self.tabIndex = function () {
        return _.findIndex(self.tabs, tab => tab.name === self.tabName);
      }

      self.initTabs = function () {
        self.tabs = tabs.filter(tab => tab.init());

        if(!self.setTabName(self.tabName)) {
          // Tabs can be unavailable - in case, switch back to history
          self.setTabName('history');
        }
      }

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

      self.setInputModel = function (model) {
        $scope.inputModel = model;

        // watch for changes to the query parameter, delegate to typeaheadCtrl
        $scope.$watch('inputModel.$viewValue', self.filterItemsByQuery);
      };

      self.setHidden = function (hidden) {
        self.hidden = !!(hidden);
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
        self.active = item;
      };

      self.getActiveIndex = function () {
        if (!self.active) {
          return;
        }

        return self.tab.items.indexOf(self.active);
      };

      self.activateNext = function () {
        let index = self.getActiveIndex();
        if (index == null) {
          index = 0;
        } else if (index < self.tab.items.length - 1) {
          ++index;
        }

        self.activateItem(self.tab.items[index]);
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

        self.activateItem(self.tab.items[index]);
        self.scrollActiveIntoView();
      };

      self.isActive = function (item) {
        return item === self.active;
      };

      // selection methods
      self.selectItem = function (filter, ev) {
        self.tab.selectItem(filter, ev);
      };

      self.selectFilter = function (filter, ev) {
        self.setHidden(true);
        self.active = false;
        $scope.inputModel.$setViewValue(filter);
        $scope.inputModel.$render();
        self.persistEntry();

        if (ev && ev.type === 'click') {
          $scope.onSelect();
        }
      };

      self.persistEntry = function () {
        if ($scope.inputModel.$viewValue.length) {
          // push selection into the history
          self.history.add($scope.inputModel.$viewValue);
        }
      };

      self.selectActive = function (ev) {
        if (self.active) { self.tab.selectItem(self.active, ev); }
      };

      self.keypressHandler = function (ev) {
        const keyCode = ev.which || ev.keyCode;

        if (self.focused) {
          self.setHidden(false);
        }

        // hide on escape
        if (_.contains([keyMap.ESC], keyCode)) {
          self.setHidden(true);
          self.active = false;
        }

        // change tab on arrow left/right
        if (_.contains([keyMap.PAGEUP], keyCode)) {
          ev.preventDefault();
          self.changeTab(-1);
        }
        if (_.contains([keyMap.PAGEDOWN], keyCode)) {
          ev.preventDefault();
          self.changeTab(+1);
        }

        // change selection with arrow up/down
        // on down key, attempt to load all items if none are loaded
        if (_.contains([keyMap.DOWN], keyCode) && !self.isVisible()) {
          self.explicit = true;
          $scope.$digest();
        } else if (_.contains([keyMap.UP, keyMap.DOWN], keyCode)) {
          if (self.isVisible() && self.tab.items.length) {
            ev.preventDefault();

            if (keyCode === keyMap.DOWN) {
              self.activateNext();
            } else {
              self.activatePrev();
            }
          }
        }

        // select on enter or tab
        if (_.contains([keyMap.ENTER, keyMap.TAB], keyCode)) {
          self.selectActive(ev);
        }
      };

      self.filterItemsByQuery = function (query = self.query) {
        self.query = query;
        self.tabs.forEach(tab => tab.filterItemsByQuery(query));

        if(self.active && !self.tab.items.indexOf(self.active)) {
          self.active = false;
        }
      };

      self.isVisible = function () {
        return !self.hidden &&
          (self.explicit || self.query) &&
          (self.focused || self.mousedOver);
      };

      self.trackVisibility = function () {
        const visible = self.isVisible();

        if(visible && !self.lastVisible) {
          self.initTabs();
        }

        self.lastVisible = visible;
        return visible;
      }

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
