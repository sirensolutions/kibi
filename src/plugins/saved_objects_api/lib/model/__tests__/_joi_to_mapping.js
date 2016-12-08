import expect from 'expect.js';
import Joi from 'joi';
import joiToMapping from '../_joi_to_mapping';

describe('saved_objects_api', function () {

  describe('model', function () {

    describe('JoiToMapping', function () {

      it('should convert a Joi schema to Elasticsearch mapping properties.', function () {
        const schema = Joi.object().keys({
          id: Joi.number().integer(),
          done: Joi.boolean(),
          title: Joi.string(),
          created: Joi.date(),
          json: Joi.object(),
          nested: Joi.object().keys({
            id: Joi.number().integer(),
            nested: Joi.object().keys({
              nested: Joi.string()
            })
          })
        });

        expect(joiToMapping(schema)).to.eql({
          id: {
            type: 'integer'
          },
          done: {
            type: 'boolean'
          },
          title: {
            type: 'string'
          },
          created: {
            type: 'date'
          },
          json: {
            type: 'string'
          },
          nested: {
            properties: {
              id: {
                type: 'integer'
              },
              nested: {
                properties: {
                  nested: {
                    type: 'string'
                  }
                }
              }
            }
          }
        });
      });

      it('should throw an error if a Joi type is not recognized.', function () {
        const schema = Joi.object().keys({
          id: Joi.number()
        });

        expect(() => {joiToMapping(schema);}).to.throwError();
      });

    });

  });

});
