const regex = /[_gak]+=h@[a-f0-9]+/g;
/*
 * remove hashed params if keys NOT present in session storage
 */
export default function (url, _sessionStorage) {
  if (url.match(regex)) {
    // get the part after ?
    const index = url.indexOf('?');
    const base = url.substring(0, index);
    const params = url.substring(index + 1);
    const paramArray = params.split('&');
    const filteredParams = [];
    for (let i = 0; i < paramArray.length; i++) {
      if (paramArray[i].match(regex)) {
        // match regex check if value exists in session storage
        const keyValuePair = paramArray[i].split('=');
        if (keyValuePair.length === 2 && _sessionStorage.getItem(keyValuePair[1])) {
          // value for hashed param exists in session storage
          filteredParams.push(paramArray[i]);
        }
      } else {
        // do not match
        filteredParams.push(paramArray[i]);
      }
    }
    if (filteredParams.length > 0) {
      return base + '?' + filteredParams.join('&');
    }
    return base;
  }
  return url;
};
