import _ from 'lodash';
import moment from 'moment';
import 'ui/state_management/global_state';
import 'ui/config';
import { EventsProvider } from 'ui/events';
import { TimefilterLibDiffTimeProvider } from 'ui/timefilter/lib/diff_time';
import { TimefilterLibDiffIntervalProvider } from 'ui/timefilter/lib/diff_interval';
import uiRoutes from 'ui/routes';
import { uiModules } from 'ui/modules';

// kibi: imports
import { parseWithPrecision } from 'ui/kibi/utils/date_math_precision';
import dateMath from '@elastic/datemath';

uiRoutes
.addSetupWork(function (timefilter) {
  return timefilter.init();
});

uiModules
.get('kibana')
.service('timefilter', function (Private, globalState, $rootScope, config, createNotifier) {
  const Events = Private(EventsProvider);
  const notify = createNotifier();

  function convertISO8601(stringTime) {
    const obj = moment(stringTime, 'YYYY-MM-DDTHH:mm:ss.SSSZ', true);
    return obj.isValid() ? obj : stringTime;
  }

  _.class(Timefilter).inherits(Events);
  function Timefilter() {
    Timefilter.Super.call(this);

    const self = this;
    const diffTime = Private(TimefilterLibDiffTimeProvider)(self);
    const diffInterval = Private(TimefilterLibDiffIntervalProvider)(self);

    self.enabled = false;

    self.init = _.once(function () {
      const timeDefaults = config.get('timepicker:timeDefaults');
      const refreshIntervalDefaults = config.get('timepicker:refreshIntervalDefaults');

      // These can be date math strings or moments.
      self.time = _.defaults(globalState.time || {}, timeDefaults);
      self.refreshInterval = _.defaults(globalState.refreshInterval || {}, refreshIntervalDefaults);

      globalState.on('fetch_with_changes', function () {
        // clone and default to {} in one
        const newTime = _.defaults({}, globalState.time, timeDefaults);
        const newRefreshInterval = _.defaults({}, globalState.refreshInterval, refreshIntervalDefaults);

        if (newTime) {
          if (newTime.to) newTime.to = convertISO8601(newTime.to);
          if (newTime.from) newTime.from = convertISO8601(newTime.from);
        }

        self.time = newTime;
        self.refreshInterval = newRefreshInterval;
      });
    });

    $rootScope.$$timefilter = self;

    const p = config.get('siren:timePrecision');
    if (p && dateMath.units.indexOf(p) === -1) {
      notify.error('siren:timePrecision valid values are: ' + dateMath.units);
    } else {
      $rootScope.sirenTimePrecision = p;
    }

    $rootScope.$watchMulti([
      '$$timefilter.time',
      '$$timefilter.time.from',
      '$$timefilter.time.to',
      '$$timefilter.time.mode'
    ], diffTime);

    $rootScope.$watchMulti([
      '$$timefilter.refreshInterval',
      '$$timefilter.refreshInterval.pause',
      '$$timefilter.refreshInterval.value'
    ], diffInterval);
  }

  Timefilter.prototype.get = function (indexPattern) {
    let filter;
    const timefield = indexPattern.timeFieldName && _.find(indexPattern.fields, { name: indexPattern.timeFieldName });

    if (timefield) {
      const bounds = this.getBounds();
      filter = { range : {} };
      filter.range[timefield.name] = {
        gte: bounds.min.valueOf(),
        lte: bounds.max.valueOf(),
        format: 'epoch_millis'
      };
    }

    return filter;
  };

  Timefilter.prototype.getBounds = function () {
    return {
      min: parseWithPrecision(this.time.from, false, $rootScope.sirenTimePrecision),
      max: parseWithPrecision(this.time.to, true, $rootScope.sirenTimePrecision)
    };
  };

  Timefilter.prototype.getActiveBounds = function () {
    if (this.enabled) return this.getBounds();
  };

  return new Timefilter();
});
