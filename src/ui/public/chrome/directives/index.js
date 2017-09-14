import './global_nav';
import './kibi_reload'; // kibi: directive added for reseting kibi when user clicks on the logo

import { kbnChromeProvider } from './kbn_chrome';
import { kbnAppendChromeNavControls } from './append_nav_controls';
import './loading_indicator/loading_indicator';

export function directivesProvider(chrome, internals) {
  kbnChromeProvider(chrome, internals);
  kbnAppendChromeNavControls(chrome, internals);
}
