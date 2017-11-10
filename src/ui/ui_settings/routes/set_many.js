import Joi from 'joi';

async function handleRequest(request) {
  const { changes } = request.payload;
  const uiSettings = request.getUiSettingsService();

  await uiSettings.setMany(request, changes); // kibi: pass request
  return {
    settings: await uiSettings.getUserProvided(request) // kibi: pass request
  };
}

export const setManyRoute = {
  path: '/api/kibana/settings',
  method: 'POST',
  config: {
    validate: {
      payload: Joi.object().keys({
        changes: Joi.object().unknown(true).required()
      }).required()
    },
    handler(request, reply) {
      reply(handleRequest(request));
    }
  }
};
