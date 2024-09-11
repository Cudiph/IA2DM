export function parseHashURL() {
  const hash = window.location.hash;
  const urlParamIndex = hash.indexOf('?');
  const pageStruct = {
    path: '/',
    urlParams: null,
  };

  if (urlParamIndex !== -1) {
    pageStruct.path = hash.slice(1, urlParamIndex);
    pageStruct.urlParams = new URLSearchParams(hash.slice(urlParamIndex));
  } else {
    pageStruct.path = hash.slice(1);
    pageStruct.urlParams = new URLSearchParams('');
  }

  if (pageStruct.path.endsWith('/')) {
    pageStruct.path = pageStruct.path.slice(0, -1);
  }

  return pageStruct;
}

export function goto(path) {
  window.location.hash = path;
}
