import PlaceholderType from './placeholder_type';
import Schema from 'js-yaml/lib/js-yaml/schema';
import DEFAULT_SAFE from 'js-yaml/lib/js-yaml/schema/default_safe';

/**
 * A schema that includes the default schema for safeLoad from js-yaml and adds a type for unquoted placeholders.
 */
export default new Schema({
  include: [
    DEFAULT_SAFE
  ],
  implicit: [
    PlaceholderType
  ]
});
