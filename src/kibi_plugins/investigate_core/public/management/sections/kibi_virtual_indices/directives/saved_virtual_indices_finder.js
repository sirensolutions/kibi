import _ from 'lodash';
import angular from 'angular';
import { keyMap } from 'ui/utils/key_map';
import { uiModules } from 'ui/modules';
import savedVirtualIndicesFinderTemplate from './saved_virtual_indices_finder.html';
import { onDashboardPage } from 'ui/kibi/utils/on_page';

const module = uiModules.get('kibana');

module.directive('savedVirtualIndicesFinder', function ($location, $injector, kbnUrl, Private, config, jdbcDatasources) {

  return {
    restrict: 'E',
    scope: {
      type: '@',
      // allow to override the number of objects per page
      perPage: '=?perPage',
    },
    template: savedVirtualIndicesFinderTemplate,
    controllerAs: 'finder',
    controller: function ($scope, $element) {
      const self = this;

      // the text input element
      const $input = $element.find('input[ng-model=filter]');

      // allow to override the number of objects per page
      if (!$scope.perPage) {
        // The number of items to show in the list
        $scope.perPage = config.get('savedObjects:perPage');
      }
      this.perPage = $scope.perPage;

      // the list that will hold the suggestions
      const $list = $element.find('ul');

      // the most recently entered search/filter
      let prevSearch;

      // the list of hits, used to render display
      self.hits = [];

      filterResults();

      /**
       * Boolean that keeps track of whether hits are sorted ascending (true)
       * or descending (false) by title
       * @type {Boolean}
       */
      self.isAscending = true;

      /**
       * Sorts saved object finder hits either ascending or descending
       * @param  {Array} hits Array of saved finder object hits
       * @return {Array} Array sorted either ascending or descending
       */
      self.sortHits = function (hits) {
        self.isAscending = !self.isAscending;
        self.hits = self.isAscending ? _.sortBy(hits, '_id') : _.sortBy(hits, '_id').reverse();
      };


      self.preventClick = function ($event) {
        $event.preventDefault();
      };

      self.makeUrl = function (hit) {
        return `#/management/siren/virtualindices/${hit._id}`;
      };

      /**
       * Called when a hit object is clicked, can override the
       * url behavior if necessary.
       */
      self.onChoose = function (hit, $event) {
        if ($scope.userOnChoose) {
          $scope.userOnChoose(hit, $event);
        }

        const url = self.makeUrl(hit);
        if (!url || url === '#' || url.charAt(0) !== '#') return;

        $event.preventDefault();

        // we want the '/path', not '#/path'
        kbnUrl.change(url.substr(1));
      };

      $scope.$watch('filter', function (newFilter) {
        filterResults();
      });

      $scope.pageFirstItem = 0;
      $scope.pageLastItem = 0;
      $scope.onPageChanged = (page) => {
        $scope.pageFirstItem = page.firstItem;
        $scope.pageLastItem = page.lastItem;
      };

      //manages the state of the keyboard selector
      self.selector = {
        enabled: false,
        index: -1
      };

      //key handler for the filter text box
      self.filterKeyDown = function ($event) {
        switch (keyMap[$event.keyCode]) {
          case 'tab':
            if (self.hitCount === 0) return;

            self.selector.index = 0;
            self.selector.enabled = true;

            selectTopHit();

            $event.preventDefault();
            break;
          case 'enter':
            if (self.hitCount !== 1) return;

            const hit = self.hits[0];
            if (!hit) return;

            self.onChoose(hit, $event);
            $event.preventDefault();
            break;
        }
      };

      //key handler for the list items
      self.hitKeyDown = function ($event, page, paginate) {
        switch (keyMap[$event.keyCode]) {
          case 'tab':
            if (!self.selector.enabled) break;

            self.selector.index = -1;
            self.selector.enabled = false;

            //if the user types shift-tab return to the textbox
            //if the user types tab, set the focus to the currently selected hit.
            if ($event.shiftKey) {
              $input.focus();
            } else {
              $list.find('li.active a').focus();
            }

            $event.preventDefault();
            break;
          case 'down':
            if (!self.selector.enabled) break;

            if (self.selector.index + 1 < page.length) {
              self.selector.index += 1;
            }
            $event.preventDefault();
            break;
          case 'up':
            if (!self.selector.enabled) break;

            if (self.selector.index > 0) {
              self.selector.index -= 1;
            }
            $event.preventDefault();
            break;
          case 'right':
            if (!self.selector.enabled) break;

            if (page.number < page.count) {
              paginate.goToPage(page.number + 1);
              self.selector.index = 0;
              selectTopHit();
            }
            $event.preventDefault();
            break;
          case 'left':
            if (!self.selector.enabled) break;

            if (page.number > 1) {
              paginate.goToPage(page.number - 1);
              self.selector.index = 0;
              selectTopHit();
            }
            $event.preventDefault();
            break;
          case 'escape':
            if (!self.selector.enabled) break;

            $input.focus();
            $event.preventDefault();
            break;
          case 'enter':
            if (!self.selector.enabled) break;

            const hitIndex = ((page.number - 1) * paginate.perPage) + self.selector.index;
            const hit = self.hits[hitIndex];
            if (!hit) break;

            self.onChoose(hit, $event);
            $event.preventDefault();
            break;
          case 'shift':
            break;
          default:
            $input.focus();
            break;
        }
      };

      self.hitBlur = function () {
        self.selector.index = -1;
        self.selector.enabled = false;
      };

      self.hitCountNoun = function () {
        return ((self.hitCount === 1) ? self.properties.noun : self.properties.nouns).toLowerCase();
      };

      function selectTopHit() {
        setTimeout(function () {
          //triggering a focus event kicks off a new angular digest cycle.
          $list.find('a:first').focus();
        }, 0);
      }

      function filterResults() {
        jdbcDatasources.listVirtualIndices()
        .then(function (hits) {
          if ($scope.filter) {
            self.hits = _.filter(self.hits, function (hit) {
              return (hit._id).includes(angular.lowercase($scope.filter));
            });
          } else {
            self.hits = hits.reverse();
          }
        });
      }
    }
  };
});
