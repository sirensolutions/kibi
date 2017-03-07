import 'ui/state_management/app_state';
import 'ui/state_management/global_state';
import 'ui/kibi/state_management/kibi_state';

export default function getUnhashableStatesProvider(getAppState, globalState, kibiState) {
  return function getUnhashableStates() {
    // kibi: added kibiState
    return [getAppState(), globalState, kibiState].filter(Boolean);
  };
}
