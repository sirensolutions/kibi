import expect from 'expect.js';
import sinon from 'sinon';
import MigrationRunner from '../migration_runner';
import requirefrom from 'requirefrom';

const wrapAsync = requirefrom('src/test_utils')('wrap_async');

describe('migrations', function () {

  describe('MigrationRunner', function () {

    /**
     * Fake migration class factory.
     *
     * @param description The description of the migration.
     * @param count The number of objects processed by the migration.
     * @param invalid If true, the constructor will throw an error.
     * @return a fake migration class.
     */
    function fakeMigrationClass(description, count, invalid) {
      return class {

        constructor() {
          if (invalid) throw new Error('invalid');
        }

        get description() {
          return description;
        }

        async count() {
          return count;
        }

        async upgrade() {
          return count;
        }
      };
    }

    //Create a fake server having three plugins with fake migrations.
    const plugin1 = {
      getMigrations: () => [
        fakeMigrationClass('plugin1_1', 2),
        fakeMigrationClass('plugin1_2', 5)
      ]
    };

    const plugin2 = {
      getMigrations: () => []
    };

    const plugin3 = {
      getMigrations: () => [
        fakeMigrationClass('plugin3_1', 3),
      ]
    };

    const server = {
      config: () => ({
        get: () => 'index'
      }),
      plugins: {
        elasticsearch: {
          getCluster() {
            return {
              getClient() {
                return {};
              }
            };
          }
        },
        plugin1: plugin1,
        plugin2: plugin2,
        plugin3: plugin3
      }
    };

    const logger = {
      info: () => {}
    };

    describe('upgrade', function () {
      const runner = new MigrationRunner(server, logger);

      before(function () {
        sinon.spy(runner, 'getMigrations');
      });

      it('should execute migrations in the correct order', wrapAsync(async () => {
        const result = await runner.upgrade();

        expect(result).to.be(10);

        const migrations = await runner.getMigrations.returnValues[0];
        expect(migrations.length).to.be(3);
        const descriptions = migrations.map((migration) => migration.description);
        expect(descriptions).to.contain('plugin1_1');
        expect(descriptions).to.contain('plugin1_2');
        expect(descriptions).to.contain('plugin3_1');
        expect(descriptions.indexOf('plugin1_2')).to.be.greaterThan(descriptions.indexOf('plugin1_1'));
      }));

      after(function () {
        runner.getMigrations.restore();
      });

    });

    describe('count', function () {
      const runner = new MigrationRunner(server, logger);

      before(function () {
        sinon.spy(runner, 'getMigrations');
      });

      it('should execute migrations in the correct order', wrapAsync(async () => {
        const result = await runner.count();

        expect(result).to.be(10);

        const migrations = await runner.getMigrations.returnValues[0];
        expect(migrations.length).to.be(3);
        const descriptions = migrations.map((migration) => migration.description);
        expect(descriptions).to.contain('plugin1_1');
        expect(descriptions).to.contain('plugin1_2');
        expect(descriptions).to.contain('plugin3_1');
        expect(descriptions.indexOf('plugin1_2')).to.be.greaterThan(descriptions.indexOf('plugin1_1'));
      }));

      after(function () {
        runner.getMigrations.restore();
      });

    });


    describe('getMigrations', function () {

      describe('should', function () {

        before(function () {
          sinon.spy(plugin1, 'getMigrations');
          sinon.spy(plugin2, 'getMigrations');
          sinon.spy(plugin3, 'getMigrations');
        });

        it('cache migrations', wrapAsync(async () => {
          const runner = new MigrationRunner(server);
          runner.getMigrations();
          runner.getMigrations();

          expect(plugin1.getMigrations.calledOnce).to.be(true);
          expect(plugin2.getMigrations.calledOnce).to.be(true);
          expect(plugin3.getMigrations.calledOnce).to.be(true);
        }));

        after(function () {
          plugin1.getMigrations.restore();
          plugin2.getMigrations.restore();
          plugin3.getMigrations.restore();
        });

      });

      describe('should not', function () {

        before(function () {
          sinon.stub(plugin2, 'getMigrations', () => [
            fakeMigrationClass('err', 0, true)
          ]);
        });

        it('swallow exceptions thrown by migration constructors', function () {
          const runner = new MigrationRunner(server);
          expect(() => runner.getMigrations()).to.throwError();
        });

        after(function () {
          plugin2.getMigrations.restore();
        });

      });

    });


  });

});

