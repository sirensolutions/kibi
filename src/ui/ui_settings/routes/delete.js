async function handleRequest(request) {
  const { key } = request.params;
  const uiSettings = request.getUiSettingsService();

  await uiSettings.remove(request, key); // kibi: pass request
  return {
    settings: await uiSettings.getUserProvided(request) // kibi: pass request
  };
}

export const deleteRoute = {
  path: '/api/kibana/settings/{key}',
  method: 'DELETE',
  handler(request, reply) {
    reply(handleRequest(request));
  }
};
