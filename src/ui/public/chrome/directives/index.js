import './global_nav';
import './kibi_reload'; // siren: directive added for reseting kibi when user clicks on the logo

import kbnChromeProv from './kbn_chrome';
import kbnChromeNavControlsProv from './append_nav_controls';
import './loading_indicator/loading_indicator';

export default function (chrome, internals) {
  kbnChromeProv(chrome, internals);
  kbnChromeNavControlsProv(chrome, internals);
}
