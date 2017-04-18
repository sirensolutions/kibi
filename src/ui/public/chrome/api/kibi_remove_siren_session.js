const regex = /clearSirenSession=true/g;

export default function (url, _sessionStorage) {
  if (url.match(regex)) {
    // get the part after ?
    const index = url.indexOf('?');
    const base = url.substring(0, index);
    const params = url.substring(index + 1);
    const paramArray = params.split('&');
    const filteredParams = [];
    let found = false;
    for (let i = 0; i < paramArray.length; i++) {
      if (!paramArray[i].match(regex)) {
        filteredParams.push(paramArray[i]);
      } else {
        found = true;
      }
    }
    if (found) {
      _sessionStorage.removeItem('sirenSession');
    }
    if (filteredParams.length > 0) {
      return base + '?' + filteredParams.join('&');
    }
    return base;
  }
  return url;
};
