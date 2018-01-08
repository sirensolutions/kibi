export default {
  replacementMap: {
    'kibi_access_control.sentinl': 'sirenalert',
    kibi_access_control: 'investigate_access_control',
    kibi_core: 'investigate_core'
  },
  // This map holds potential value replacements.
  // If the user has diverted from the old defaults for e.g. the admin_role
  // the user's settings should be retained in the yml.
  // On the other hand, if the old defaults haven't been changed, we need to
  // set the old defaults explicitly into the config to ensure back compatibility
  // with pre-Siren 10 setups
  valueReplacementMap: {
    'investigate_access_control.admin_role':           { oldVal: 'kibiadmin' },
    'elasticsearch.username':                          { oldVal: 'kibiserver' },
    'investigate_access_control.sirenalert.username' : { oldVal: 'sentinl' }
  }
};