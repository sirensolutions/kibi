//TODO MERGE 5.5.2 add kibi comment as needed

import { Notifier } from 'ui/notify/notifier';
import expect from 'expect.js';
import ngMock from 'ng_mock';

describe('config component', function () {
  let config;
  let $scope;
  let $timeout;
  let $httpBackend;

  beforeEach(ngMock.module('kibana'));
  beforeEach(ngMock.inject(function (_$httpBackend_, _$timeout_, $injector, Private) {
    $timeout = _$timeout_;
    $httpBackend = _$httpBackend_;
    config = $injector.get('config');
    $scope = $injector.get('$rootScope');
  }));

  describe('#get', function () {
    it('gives access to config values', function () {
      expect(config.get('dateFormat')).to.be.a('string');
    });

    it('supports the default value overload', function () {
      // default values are consumed and returned atomically
      expect(config.get('obscureProperty', 'default')).to.be('default');
      // default values are consumed only if setting was previously unset
      expect(config.get('obscureProperty', 'another')).to.be('default');
      // default values are persisted
      expect(config.get('obscureProperty')).to.be('default');
    });

    it('throws on unknown properties that don\'t have a value yet.', function () {
      const msg = 'Unexpected `config.get("throwableProperty")` call on unrecognized configuration setting';
      expect(config.get).withArgs('throwableProperty').to.throwException(msg);
    });
  });

  describe('#set', function () {
    it('stores a value in the config val set', function () {
      const original = config.get('dateFormat');
      config.set('dateFormat', 'notaformat');
      expect(config.get('dateFormat')).to.be('notaformat');
      config.set('dateFormat', original);
    });

    it('stores a value in a previously unknown config key', function () {
      expect(config.set).withArgs('unrecognizedProperty', 'somevalue').to.not.throwException();
      expect(config.get('unrecognizedProperty')).to.be('somevalue');
    });

    describe('kibi - validators', function () {
      beforeEach(function () {
        $httpBackend.whenPOST('/api/kibana/settings/siren:panel_vertical_size').respond(200);
        $httpBackend.whenDELETE('/api/kibana/settings/siren:panel_vertical_size').respond(200);
      });

      afterEach(function () {
        config.set('siren:panel_vertical_size', null);
        $timeout.flush();
      });

      it('should fail on negative number', function () {
        return config.set('siren:panel_vertical_size', -1)
        .then(() => expect().fail('should fail'))
        .catch(err => {
          expect(err.message).to.contain('Should be a positive integer');
          expect(Notifier.prototype._notifs).to.have.length(1);
          expect(Notifier.prototype._notifs[0].type).to.be('danger');
          expect(Notifier.prototype._notifs[0].content)
            .to.contain('Should be a positive integer');
          Notifier.prototype._notifs.length = 0;
        });
      });

      it('should fail when given anything but a number', function () {
        return config.set('siren:panel_vertical_size', 'not a number')
        .then(() => expect().fail('should fail'))
        .catch(err => {
          expect(err.message).to.contain('Should be a positive integer');
          expect(Notifier.prototype._notifs).to.have.length(1);
          expect(Notifier.prototype._notifs[0].type).to.be('danger');
          expect(Notifier.prototype._notifs[0].content)
            .to.contain('Should be a positive integer');
          Notifier.prototype._notifs.length = 0;
        });
      });

      it('should accept a positive integer', function () {
        config.set('siren:panel_vertical_size', 20);
        expect(config.get('siren:panel_vertical_size')).to.be(20);
      });

      it('should accept zero', function () {
        config.set('siren:panel_vertical_size', 0);
        expect(config.get('siren:panel_vertical_size')).to.be(0);
      });
    });
  });

  describe('#$bind', function () {

    it('binds a config key to a $scope property', function () {
      const dateFormat = config.get('dateFormat');
      config.bindToScope($scope, 'dateFormat');
      expect($scope).to.have.property('dateFormat', dateFormat);
    });

    it('alows overriding the property name', function () {
      const dateFormat = config.get('dateFormat');
      config.bindToScope($scope, 'dateFormat', 'defaultDateFormat');
      expect($scope).to.not.have.property('dateFormat');
      expect($scope).to.have.property('defaultDateFormat', dateFormat);
    });

    it('keeps the property up to date', function () {
      const original = config.get('dateFormat');
      const newDateFormat = original + ' NEW NEW NEW!';
      config.bindToScope($scope, 'dateFormat');

      expect($scope).to.have.property('dateFormat', original);
      config.set('dateFormat', newDateFormat);
      expect($scope).to.have.property('dateFormat', newDateFormat);
      config.set('dateFormat', original);

    });

  });

});
