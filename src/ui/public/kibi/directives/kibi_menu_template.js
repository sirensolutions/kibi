import 'ui/kibi/directives/kibi_menu_template.less';
import $ from 'jquery';
import uiModules from 'ui/modules';

uiModules
.get('app/dashboard')
.directive('kibiMenuTemplate', function ($rootScope, $timeout, $window, $compile, $document) {
  const link = function ($scope, $el) {
    $scope.data = {
      showMenu: false,
      delay: $scope.kibiMenuTemplateHideDelay || 250
    };

    const isKibiRelationsSearchBar = function (obj) {
      for (const key in obj) {
        if (!obj.hasOwnProperty(key)) continue;
        if (obj[key].nodeName === 'kibi-relations-search-bar') {
          return true;
        }
      }
      return false;
    };

    const getRandomInt = function (min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const container = $('<div class="kibi-menu-template" id="kibi-menu-template-' + getRandomInt(0, Number.MAX_SAFE_INTEGER) + '"/>');
    $('body').append(container);
    const compiled = $compile($scope.kibiMenuTemplate)($scope);
    container.append(compiled);

    const updatePosition = function () {
      const offset = $el.offset();
      const dropdownPadding = 30;
      const windowHeight = $($window).height();
      const scrollTop = $($window).scrollTop();
      const dropdownHeight = container.outerHeight();

      let left = offset.left;
      let maxHeight = (windowHeight - dropdownPadding * 2);

      if ($scope.kibiMenuTemplateLeftOffset) {
        left += +$scope.kibiMenuTemplateLeftOffset;
      }
      let top = offset.top + $el.outerHeight();
      if (top + dropdownHeight - scrollTop > windowHeight) {
        top = offset.top - dropdownHeight;
      }

      if (top - scrollTop < 0) {
        if (dropdownHeight <= maxHeight) {
          top = (windowHeight - dropdownHeight) / 2;
        } else {
          top = dropdownPadding;
        }
        top += scrollTop;
      }

      left = `${Math.ceil(left)}px`;
      top = `${Math.ceil(top)}px`;
      maxHeight = `${Math.ceil(maxHeight)}px`;
      container.css({left, top, 'max-height': maxHeight});
    };

    const show = function () {
      $rootScope.$broadcast('kibiMenuTemplate:show', $el);

      if ($scope.kibiMenuTemplateOnShowFn) {
        $scope.kibiMenuTemplateOnShowFn();
      }
      updatePosition();
      container.addClass('visible');
    };

    const hide = function () {
      if ($scope.kibiMenuTemplateOnHideFn) {
        $scope.kibiMenuTemplateOnHideFn();
      }
      container.removeClass('visible');
    };

    $scope.$watch('data.showMenu', function (newValue, oldValue) {
      if (newValue !== oldValue) {
        if ($scope.data.showMenu) {
          show();
        } else {
          hide();
        }
      }
    });

    // watch the position of the element and update position of the menu if needed
    $scope.$watch(function () {
      return $el.offset().left + '-' +  $el.offset().top;
    }, function () {
      updatePosition();
    });

    $el.on('click', function (event) {
      event.stopPropagation();
      if ($scope.kibiMenuTemplateOnFocusFn) {
        $scope.kibiMenuTemplateOnFocusFn();
      }
      $scope.$apply(function () {
        $scope.data.showMenu = !$scope.data.showMenu;
      });
    });

    // hide when clicking elsewhere in the document
    const clickOutsideHandler = function (event) {
      const isChild = $el[0].contains(event.target);
      const isSelf = $el[0] === event.target;
      const isMenu = container[0].contains(event.target);
      const isInsideElement = isChild || isSelf;

      if (isKibiRelationsSearchBar(event.target.attributes)) {
        return;
      }

      if (!isInsideElement && !isMenu && $scope.kibiMenuTemplateOnBlurFn) {
        $scope.kibiMenuTemplateOnBlurFn();
      }

      if (!isInsideElement) {
        $scope.$apply(function () {
          $scope.data.showMenu = false;
        });
      }
    };

    $document.bind('click', clickOutsideHandler);

    let timerPromise;
    if ($scope.kibiMenuTemplateShowOnHover) {
      $el.on('mouseover', function (event) {
        $timeout.cancel(timerPromise);
        $scope.$apply(function () {
          $scope.data.showMenu = true;
        });
      });
      $el.on('mouseout', function (event) {
        timerPromise = $timeout(function () {
          $scope.data.showMenu = false;
        }, $scope.data.delay);
      });
      container.on('mouseover', function (event) {
        $timeout.cancel(timerPromise);
        $scope.$apply(function () {
          $scope.data.showMenu = true;
        });
      });
      container.on('mouseout', function (event) {
        timerPromise = $timeout (function () {
          $scope.data.showMenu = false;
        }, $scope.data.delay);
      });
    }

    // hide when clicking on another kibi dropdown
    const cancelOnShow = $rootScope.$on('kibiMenuTemplate:show', (event, element) => {
      if (element !== $el) {
        $scope.data.showMenu = false;
      }
    });

    $scope.$on('$destroy', function () {
      cancelOnShow();
      $document.unbind('click', clickOutsideHandler);
      if (timerPromise) {
        $timeout.cancel(timerPromise);
      }
      container.remove();
    });

  };

  return {
    restrict: 'A',
    link: link,
    scope: {
      kibiMenuTemplate: '=',            // string - html template to be used to create the menu
      kibiMenuTemplateData: '=',        // array - data used in template when creating menu items
      kibiMenuTemplateContext: '=',     // object - additional data required by the template
      kibiMenuTemplateOnShowFn: '&',    // function - executed when menu is shown
      kibiMenuTemplateOnHideFn: '&',    // function - executed when menu is closed
      kibiMenuTemplateOnFocusFn: '&',   // function - executed when element is clicked
      kibiMenuTemplateOnBlurFn: '&',    // function - executed when there is a click outside element and menu
      kibiMenuTemplateLeftOffset: '@',  // integer, default 0 - left offset in px, useful to move the displayed menu a bit left right
      kibiMenuTemplateHideDelay: '@',   // integer, default 250 - delay for the hide action in ms
      kibiMenuTemplateShowOnHover: '@'  // boolean, default false - when true menu is shown also on hover
    }
  };
});
