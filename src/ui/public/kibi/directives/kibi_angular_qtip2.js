define(function (require) {
  require('kibi-qtip2');
  var $ = require('jquery');

  var module = require('ui/modules').get('kibana');
  module.directive('qtip', function () {
    return {
      restrict: 'A',
      scope : {
        qtipHtml: '='
      },
      link: function (scope, element, attrs) {
        var my = attrs.qtipMy || 'bottom center';
        var at = attrs.qtipAt || 'top center';
        var qtipClasses = attrs.qtipClasses || 'qtip';

        var init = false;
        scope.$watch('qtipHtml', function (newValue) {
          var content;
          if (newValue) {
            if (attrs.qtipText) {
              if (attrs.qtipTitle) {
                content = {'title': attrs.qtipTitle, 'text': attrs.qtipText};
              } else {
                content = {'text': attrs.qtipText};
              }
            }
            if (scope.qtipHtml) {
              if (attrs.qtipTitle) {
                content = {'title': attrs.qtipTitle, 'text': $('<div>' + scope.qtipHtml + '</div>')};
              } else {
                content = {'text': $('<div>' + scope.qtipHtml + '</div>')};
              }
            }

            var options = {
              content: content,
              position: {
                my: my,
                at: at,
                target: element
              },
              hide: {
                fixed : true,
                delay: 100
              },
              style: {
                classes: qtipClasses
              }
            };

            $(element).qtip(options);
          }
        });
      }
    };
  });
});
