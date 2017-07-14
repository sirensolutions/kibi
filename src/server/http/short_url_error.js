import Boom from 'boom';

export function handleShortUrlError(err) {
  if (err.isBoom) return err;
  // kibi: report message in auth errors if defined
  if (err.status === 401) return Boom.unauthorized(err.message);
  if (err.status === 403) return Boom.forbidden(err.message);
  // kibi: end
  if (err.status === 404) return Boom.notFound();
  return Boom.badImplementation();
}
