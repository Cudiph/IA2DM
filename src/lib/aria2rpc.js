const oop_handler = {
  /**
   * @param {Object} target
   * @param {string} target.secret
   * @param {string} [target.url]
   * @param {boolean} [target.json]
   * @param {Object} [target.overrideProp]
   * @param {string} name
   */
  get(target, name) {
    const wrapper = (...params) => {
      let payload = {
        jsonrpc: '2.0',
        id: 'ignoremewhenusefetch',
        method: `aria2.${name}`,
        params: [target.secret, ...params],
      };

      if (target.overrideProp) {
        payload = Object.assign(payload, target.overrideProp);
      }

      if (target.json) return JSON.stringify(payload);
      return fetch(target.url, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    };

    return wrapper;
  },
};

/**
 * @param {RPCConfig} cfg
 */
export function getAria2OOP(cfg) {
  const secret = `token:${cfg.secret}`;
  const url = getAria2HTTPURI(cfg);
  const proxy = new Proxy({ url, secret }, oop_handler);
  return proxy;
}

/**
 * @param {RPCConfig} cfg
 */
export function getAria2JSON(cfg, overrideProp = {}) {
  const secret = `token:${cfg.secret}`;
  const proxy = new Proxy({ secret, json: true, overrideProp: overrideProp }, oop_handler);
  return proxy;
}

/**
 * @param {RPCConfig} cfg
 */
export function getAria2HTTPURI(cfg) {
  const url = `http${cfg.secure ? 's' : ''}://${cfg.host}:${cfg.port}/jsonrpc`;
  return url;
}

/** json rpc batch request
 * @param {RPCConfig} cfg
 */
export function getAria2Batch(cfg) {
  // params is from aria2json output
  const uri = getAria2HTTPURI(cfg);
  const wrapper = (...params) => {
    const payload = `[${params.join(',')}]`;

    return fetch(uri, {
      method: 'POST',
      body: payload,
    });
  };

  return wrapper;
}
