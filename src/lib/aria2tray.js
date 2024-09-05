/**
 * Aria2Tray IPC utility class
 */

export class Aria2Tray {
  /** @type {string} */
  secret;

  /** @param {string} secret */
  constructor(secret) {
    this.secret = secret;
  }

  /** @param {number | string} id */
  ping(id) {
    return JSON.stringify({
      jsonrpc: '2.0',
      method: 'ping',
      id,
    });
  }

  /**
   * @param {number | string} id
   * @param {string} url
   */
  open(id, url) {
    return JSON.stringify({
      jsonrpc: '2.0',
      method: 'open',
      id,
      params: [`token:${this.secret}`, url],
    });
  }

  /**
   * @param {number | string} id
   * @param {string} path
   */
  delete(id, path) {
    return JSON.stringify({
      jsonrpc: '2.0',
      method: 'delete',
      id,
      params: [`token:${this.secret}`, path],
    });
  }

  /**
   * @param {number | string} id
   * @param {string} path
   */
  status(id, path) {
    return JSON.stringify({
      jsonrpc: '2.0',
      method: 'status',
      id,
      params: [`token:${this.secret}`, path],
    });
  }

  /**
   * @param {number | string} id
   * @param {"file" | "folder"} type
   * @param {string?} filter
   */
  filePicker(id, type, filter) {
    return JSON.stringify({
      jsonrpc: '2.0',
      method: 'filePicker',
      id,
      params: [`token:${this.secret}`, type, filter],
    });
  }

  /**
   * @param {number | string} id
   */
  version(id) {
    return JSON.stringify({
      jsonrpc: '2.0',
      method: 'version',
      id,
      params: [`token:${this.secret}`],
    });
  }
}
