export default {
  replacementMap: {
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
    'investigate_access_control.admin_role':                  { oldVal: 'kibiadmin' },
    'elasticsearch.username':                                 { oldVal: 'kibiserver' },
    'kibana.index':                                           { oldVal: '.kibi' },
    'investigate_access_control.acl.index':                   { oldVal: '.kibiaccess' }
  },

  // These settings are removed if their values match the `oldVal` value on the right.
  // if the stanza that contains them is empty after their removal (because all of the properties in it are removed)
  // the stanza itself is also removed
  settingsForRemovalIfNotCustomMap: {
    'investigate_core.gremlin_server.path':                   { oldVal: 'gremlin_server/gremlin-es2-server.jar' }
  }
};