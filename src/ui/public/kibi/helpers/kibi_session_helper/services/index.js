import 'ui/kibi/helpers/kibi_session_helper/services/_saved_session';
import 'ui/kibi/helpers/kibi_session_helper/services/saved_sessions';
import savedObjectRegistry from 'ui/saved_objects/saved_object_registry';
import savedSessionsRegister from 'ui/kibi/helpers/kibi_session_helper/services/saved_session_register';

savedObjectRegistry.register(savedSessionsRegister);
