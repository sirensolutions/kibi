const placeholderRegex = /\$\{(.+?)}/g;

/**
 * Replaces placeholders (`${NAME}`) in the given @value with environment
 * variables having the same name.
 *
 * If the environment variable is not found, the corresponding placeholder will
 * be replaced by an empty string.
 *
 * @return {String} The value with replaced placeholders.
 */
export function replace(value) {
  if (value && value.replace) {
    return value.replace(placeholderRegex, (match, group) => {
      const envValue = process.env[group];
      if (envValue) {
        return envValue;
      }
      return '';
    });
  }
  return value;
}

/**
 * @return {boolean} True if the given value contains one or more placeholders.
 */
export function match(value) {
  if (value && value.match) {
    return value.match(placeholderRegex);
  }
  return false;
}
