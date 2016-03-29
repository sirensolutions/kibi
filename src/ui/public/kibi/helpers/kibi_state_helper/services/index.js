import x from 'ui/kibi/helpers/kibi_state_helper/services/_saved_session';
import y from 'ui/kibi/helpers/kibi_state_helper/services/saved_sessions';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedSessionsRegister from 'ui/kibi/helpers/kibi_state_helper/services/saved_session_register';
savedObjectRegistry.register(savedSessionsRegister);
