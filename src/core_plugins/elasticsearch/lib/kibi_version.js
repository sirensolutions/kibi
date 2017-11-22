import {
  kibi_version as kibiVersion,
} from '../../../../package.json';

export default {
  // Make the version stubbable to improve testability.
  get() {
    return kibiVersion;
  },
};
