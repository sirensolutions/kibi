import Type from 'js-yaml/lib/js-yaml/type';
import { match, replace } from './placeholder';

/**
 * A type for unquoted placeholders.
 */
export default new Type('', {
  kind: 'scalar',
  resolve: match,
  construct: replace
});
