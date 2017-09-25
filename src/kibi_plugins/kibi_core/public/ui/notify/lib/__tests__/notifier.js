import ngMock from 'ng_mock';
import _ from 'lodash';
import { Notifier } from '../../notifier';
import expect from 'expect.js';
import sinon from 'sinon';

describe('Notifier', function () {
  let $interval;
  let message = 'Oh, the humanity!';
  let notifier;
  let params;
  const version = window.__KBN__.version;
  const buildNum = window.__KBN__.buildNum;

  beforeEach(function () {
    ngMock.module('kibana', function ($provide) {
      $provide.constant('elasticsearchPlugins', ['siren-join']);
    });

    ngMock.inject(function (_$interval_) {
      $interval = _$interval_;
    });
  });

  beforeEach(function () {
    params = { location: 'foo' };
    while (Notifier.prototype._notifs.pop()); // clear global notifications
    notifier = new Notifier(params);
    Notifier.applyConfig({
      setInterval: $interval,
      clearInterval: $interval.cancel
    });
  });

  describe('#constructor()', function () {
    it('sets #from from given location', function () {
      expect(notifier.from).to.equal(params.location);
    });
  });

  describe('#error', function () {
    testVersionInfo('error');

    it('prepends location to message for content', function () {
      expect(notify('error').content).to.equal(params.location + ': ' + message);
    });

    it('sets type to "danger"', function () {
      expect(notify('error').type).to.equal('danger');
    });

    it('sets icon to "warning"', function () {
      expect(notify('error').icon).to.equal('warning');
    });

    it('sets title to "Error"', function () {
      expect(notify('error').title).to.equal('Error');
    });

    it('sets lifetime to 5 minutes', function () {
      expect(notify('error').lifetime).to.equal(300000);
    });

    it('sets timeRemaining and decrements', function () {
      const notif = notify('error');

      expect(notif.timeRemaining).to.equal(300);
      $interval.flush(1000);
      expect(notif.timeRemaining).to.equal(299);
    });

    it('closes notification on lifetime expiry', function () {
      const expectation = sinon.mock();
      const notif = notifier.error(message, expectation);

      expectation.once();
      expectation.withExactArgs('ignore');

      $interval.flush(300000);

      expect(notif.timerId).to.be(undefined);
    });

    it('allows canceling of timer', function () {
      const notif = notify('error');

      expect(notif.timerId).to.not.be(undefined);
      notif.cancelTimer();

      expect(notif.timerId).to.be(undefined);
    });

    it('resets timer on addition to stack', function () {
      const notif = notify('error');

      $interval.flush(100000);
      expect(notif.timeRemaining).to.equal(200);

      notify('error');
      expect(notif.timeRemaining).to.equal(300);
    });

    it('allows reporting', function () {
      const includesReport = _.includes(notify('error').actions, 'report');
      expect(includesReport).to.true;
    });

    it('allows accepting', function () {
      const includesAccept = _.includes(notify('error').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('includes stack', function () {
      expect(notify('error').stack).to.be.defined;
    });
  });

  describe('#warning', function () {
    testVersionInfo('warning');

    it('prepends location to message for content', function () {
      expect(notify('warning').content).to.equal(params.location + ': ' + message);
    });

    it('sets type to "warning"', function () {
      expect(notify('warning').type).to.equal('warning');
    });

    it('sets icon to "warning"', function () {
      expect(notify('warning').icon).to.equal('warning');
    });

    it('sets title to "Warning"', function () {
      expect(notify('warning').title).to.equal('Warning');
    });

    it('sets lifetime to 10000', function () {
      expect(notify('warning').lifetime).to.equal(10000);
    });

    it('does not allow reporting', function () {
      const includesReport = _.includes(notify('warning').actions, 'report');
      expect(includesReport).to.false;
    });

    it('allows accepting', function () {
      const includesAccept = _.includes(notify('warning').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('does not include stack', function () {
      expect(notify('warning').stack).not.to.be.defined;
    });
  });

  describe('#info', function () {
    testVersionInfo('info');

    it('prepends location to message for content', function () {
      expect(notify('info').content).to.equal(params.location + ': ' + message);
    });

    it('sets type to "info"', function () {
      expect(notify('info').type).to.equal('info');
    });

    it('sets icon to "info-circle"', function () {
      expect(notify('info').icon).to.equal('info-circle');
    });

    it('sets title to "Debug"', function () {
      expect(notify('info').title).to.equal('Debug');
    });

    it('sets lifetime to 5000', function () {
      expect(notify('info').lifetime).to.equal(5000);
    });

    it('does not allow reporting', function () {
      const includesReport = _.includes(notify('info').actions, 'report');
      expect(includesReport).to.false;
    });

    it('allows accepting', function () {
      const includesAccept = _.includes(notify('info').actions, 'accept');
      expect(includesAccept).to.true;
    });

    it('does not include stack', function () {
      expect(notify('info').stack).not.to.be.defined;
    });
  });

  describe('kibi - shield warnings', function () {
    function checkShieldAuthorizationWarning(shieldAuthorizationWarning) {
      Notifier.applyConfig({ shieldAuthorizationWarning });
      if (shieldAuthorizationWarning) {
        expect(notify('error').content).to.equal(params.location + ': ' + message);
        expect(notify('error').type).to.equal('warning');
      } else {
        expect(notify('error')).to.not.be.ok();
      }
    }

    [ true, false ]
    .forEach(shieldAuthorizationWarning => {
      const prefix = shieldAuthorizationWarning ? '' : 'not ';
      describe(`shieldAuthorizationWarning is ${shieldAuthorizationWarning}`, function () {
        it(`should ${prefix} change type from error to warning with unauthorized in the message`, function () {
          message = 'bla bla unauthorized bla bla';
          checkShieldAuthorizationWarning(shieldAuthorizationWarning);
        });

        it(`should ${prefix} change type from error to warning with ElasticsearchSecurityException in the message`, function () {
          message = 'bla bla bla ElasticsearchSecurityException bla bla bla';
          checkShieldAuthorizationWarning(shieldAuthorizationWarning);
        });

        it(`should ${prefix} change type from error to warning with security_exception in the message`, function () {
          message = 'bla bla bla security_exception bla bla bla';
          checkShieldAuthorizationWarning(shieldAuthorizationWarning);
        });
      });
    });

    describe('other error message (no authorization warning)', function () {
      it('should return danger type with exception in the message', function () {
        message = 'bla bla bla exception bla bla bla';
        expect(notify('error').content).to.equal(params.location + ': ' + message);
        expect(notify('error').type).to.equal('danger');
      });
    });
  });

  function notify(fnName) {
    notifier[fnName](message);
    return latestNotification();
  }

  function latestNotification() {
    return _.last(notifier._notifs);
  }

  function testVersionInfo(fnName) {
    /*eslint no-restricted-globals: ["error", "event"]*/
    context('when version is configured', function () {
      it('adds version to notification', function () {
        const notification = notify(fnName);
        expect(notification.info.version).to.equal(version);
      });
    });
    context('when build number is configured', function () {
      it('adds buildNum to notification', function () {
        const notification = notify(fnName);
        expect(notification.info.buildNum).to.equal(buildNum);
      });
    });
  }
});
