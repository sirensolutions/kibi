import chrome from 'ui/chrome';
import url from 'url';

export default function createUrlShortener(createNotifier, $http, $location, kibiSession) {
  const notify = createNotifier({
    location: 'Url Shortener'
  });

  function shortenUrl(absoluteUrl) {
    const basePath = chrome.getBasePath();

    const parsedUrl = url.parse(absoluteUrl);
    const path = parsedUrl.path.replace(basePath, '');
    const hash = parsedUrl.hash ? parsedUrl.hash : '';
    const relativeUrl = path + hash;

    // kibi: added kibiSession data
    const formData = {
      url: relativeUrl,
      kibiSession: kibiSession.getData()
    };

    return $http.post(`${basePath}/shorten`, formData).then((result) => {
      return url.format({
        protocol: parsedUrl.protocol,
        host: parsedUrl.host,
        pathname: `${basePath}/goto/${result.data}`
      });
    }).catch((response) => {
      notify.error(response);
    });
  }

  return {
    shortenUrl
  };
};
