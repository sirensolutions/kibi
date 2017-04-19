const regex = /clearSirenSession=true/g;

export default function (url, _sessionStorage) {
  const ret = {
    url,
    found: false
  };
  if (url.match(regex)) {
    // get the part after ?
    const index = url.indexOf('?');
    const base = url.substring(0, index);
    const params = url.substring(index + 1);
    const paramArray = params.split('&');
    const filteredParams = [];
    for (let i = 0; i < paramArray.length; i++) {
      if (!paramArray[i].match(regex)) {
        filteredParams.push(paramArray[i]);
      } else {
        ret.found = true;
      }
    }
    if (ret.found) {
      _sessionStorage.removeItem('sirenSession');
    }
    ret.url = base;
    if (filteredParams.length > 0) {
      ret.url = base + '?' + filteredParams.join('&');
    }
  }
  return ret;
};
