const regex = /[_gak]+=h@[a-f0-9]+/g;

export default function (url, _sessionStorage) {
  if (_sessionStorage.length === 0) {
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
        }
      }
      if (filteredParams.length > 0) {
        return base + '?' + filteredParams.join('&');
      }
      return base;
    }
  }
  return url;
};
