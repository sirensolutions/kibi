import { formatMsg } from 'ui/notify/lib/_format_msg';
import expect from 'expect.js';
describe('formatMsg', function () {

  describe('Kibi tests', function () {

    describe('Kibi Navbar helper', function () {
      it('should correctly format security_exception', function () {
        const actual = formatMsg({
          data: {
            error: {
              type: 'security_exception'
            },
            status: 403
          }
        }, 'Kibi Navbar helper');

        const msg = 'Kibi Navbar helper: One or more saved searches refer to unauthorized data.';
        expect(actual).to.equal(msg);
      });
    });

    describe('Kibi Relational filter', function () {

      it('should correctly format error with unauthorized in the message', function () {
        const actual = formatMsg({
          message: 'bla bla unauthorized bla bla'
        }, 'Kibi Relational filter');

        expect(actual).to.equal('Kibi Relational filter: one or more relations refer to unauthorized data.');
      });

      describe('Shield', function () {
        it('should correctly format security_exception', function () {
          const actual = formatMsg({
            data: {
              error: {
                type: 'security_exception'
              },
              status: 403
            }
          }, 'Kibi Relational filter');

          const msg = 'Kibi Relational filter: one or more relations refer to unauthorized data.';
          expect(actual).to.equal(msg);
        });

        it('should correctly format exception', function () {
          const actual = formatMsg({
            data: {
              error: {
                type: 'exception'
              },
              status: 500
            }
          }, 'Kibi Relational filter');

          const msg = 'Kibi Relational filter: could not load a Relational filter visualization.';
          expect(actual).to.equal(msg);
        });

      });

      describe('Search Guard', function () {
        it('should correctly format security_exceptions', function () {
          let actual = formatMsg({
            body: {
              error: {
                type: 'security_exception'
              },
              status: 403
            }
          }, 'Kibi Relational filter');

          let msg = 'Kibi Relational filter: one or more relations refer to unauthorized data.';
          expect(actual).to.equal(msg);

          actual = formatMsg({
            body: {
              error: {
                type: 'security_exception'
              },
              status: 403
            }
          }, 'Visualize');

          msg = 'One or more visualizations refer to unauthorized data.';
          expect(actual).to.equal(msg);

          actual = formatMsg({
            body: {
              error: {
                type: 'security_exception'
              },
              status: 403
            }
          }, 'Enhanced search results');

          msg = 'An Enhanced search results visualization refers to unauthorized data.';
          expect(actual).to.equal(msg);
        });

        it('should correctly format exception', function () {
          const actual = formatMsg({
            body: {
              error: {
                type: 'exception'
              },
              status: 500
            }
          }, 'Kibi Relational filter');

          const msg = 'Kibi Relational filter: could not load a Relational filter visualization.';
          expect(actual).to.equal(msg);
        });
      });

    });

    describe('Timeliion failing sheet', function () {
      it('should correctly format mesaage with security_exception', function () {
        const actual = formatMsg({
          cell: 0,
          statusCode: 403,
          message: '[security_exception] no permissions for indices:data/read/search - Path: /_all/_search'
        }, 'Timelion');

        expect(actual).to.equal('Timelion: [security_exception] no permissions for indices:data/read/search - Path: /_all/_search');
      });
    });

    describe('Enhanced search results', function () {
      it('should correctly format error with unauthorized in the message', function () {
        const actual = formatMsg({
          message: 'bla bla unauthorized bla bla'
        }, 'Enhanced search results');

        expect(actual).to.equal('An Enhanced search results visualization refers to unauthorized data.');
      });
    });

    describe('Visualize', function () {
      it('should correctly format error with unauthorized in the message', function () {
        const actual = formatMsg({
          message: 'bla bla unauthorized bla bla'
        }, 'Visualize');

        expect(actual).to.equal('One or more visualizations refer to unauthorized data.');
      });
    });

    describe('Saved Search', function () {
      it('should correctly format error with unauthorized and [indices:data/read/coordinate-msearch] in the message', function () {
        const actual = formatMsg({
          message: 'bla unauthorized bla [indices:data/read/coordinate-msearch] bla bla'
        }, 'Saved Search');

        expect(actual).to.equal('One or more saved searches refer to unauthorized data.');
      });
    });

    describe('New Unknown Error', function () {
      it('should correctly format error with unauthorized', function () {
        const actual = formatMsg({
          message: 'bla bla unauthorized bla bla'
        }, 'Courier Fetch Error');

        expect(actual).to.equal(actual);
      });
    });

    describe('XHR errors', function () {
      it('should describe an unknown XHR error with statusCode 0', function () {
        const error = new Error('unknown error');
        error.statusCode = 0;
        const actual = formatMsg(error);
        expect(actual).to.be('network error; please check your connection and try again');
      });

      it('should describe an unknown XHR error with statusCode -1', function () {
        const error = new Error('unknown error');
        error.statusCode = -1;
        const actual = formatMsg(error);
        expect(actual).to.be('network error; please check your connection and try again');
      });

      it('should describe a generic unknown error', function () {
        const error = new Error('unknown error');
        const actual = formatMsg(error);
        expect(actual).to.be('unknown error');
      });

      it('should describe a generic error', function () {
        const error = new Error('Unknown error');
        const actual = formatMsg(error);
        expect(actual).to.be('Unknown error');
      });
    });

  });

  describe('Kibana tests', function () {
    it('should prepend the second argument to result', function () {
      const actual = formatMsg('error message', 'unit_test');

      expect(actual).to.equal('unit_test: error message');
    });

    it('should handle a simple string', function () {
      const actual = formatMsg('error message');

      expect(actual).to.equal('error message');
    });

    it('should handle a simple Error object', function () {
      const err = new Error('error message');
      const actual = formatMsg(err);

      expect(actual).to.equal('error message');
    });

    it('should handle a simple Angular $http error object', function () {
      const err = {
        data: {
          statusCode: 403,
          error: 'Forbidden',
          message: '[security_exception] action [indices:data/read/mget] is unauthorized for user [user]'
        },
        status: 403,
        config: {},
        statusText: 'Forbidden'
      };
      const actual = formatMsg(err);

      expect(actual).to.equal('Error 403 Forbidden: [security_exception] action [indices:data/read/mget] is unauthorized for user [user]');
    });

    it('should handle an extended elasticsearch error', function () {
      const err = {
        resp : {
          error : {
            root_cause : [
              {
                reason : 'I am the detailed message'
              }
            ]
          }
        }
      };

      const actual = formatMsg(err);

      expect(actual).to.equal('I am the detailed message');
    });
  });

});
