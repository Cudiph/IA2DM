/** merge base manifest and browser specific manifest */
const fs = require('fs');

const root = `${__dirname}/../src`;
const base_manifest = require(`${root}/manifest.json`);
let ff_manifest = require(`${root}/manifest-firefox.json`);
let chrome_manifest = require(`${root}/manifest-chromium.json`);

const paths = [`${__dirname}/../dist`];

chrome_manifest = { ...base_manifest, ...chrome_manifest };
ff_manifest = { ...base_manifest, ...ff_manifest };
for (const i of paths) {
  write_json(`${i}/chromium/manifest.json`, chrome_manifest);
  write_json(`${i}/firefox/manifest.json`, ff_manifest);
}

function write_json(path, obj) {
  const dir = path.split('/').slice(0, -1).join('/');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path, JSON.stringify(obj), 'utf-8');
}
