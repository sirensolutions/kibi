async function handleRequest(request) {
  const uiSettings = request.getUiSettingsService();
  return {
    settings: await uiSettings.getUserProvided(request) // kibi: pass request
  };
}

export const getRoute = {
  path: '/api/kibana/settings',
  method: 'GET',
  handler: function (request, reply) {
    reply(handleRequest(request));
  }
};
