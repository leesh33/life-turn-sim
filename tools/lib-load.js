// 이벤트 파일 로더 — 테스트/검사 스크립트가 함께 쓴다.
// engine.js → events/_def.js → 나머지 이벤트 모듈(가나다/알파벳 순) 순서로 평가한다.
const fs = require('fs');
const path = require('path');

function installStorage() {
  const store = {};
  global.window = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    }
  };
  global.localStorage = global.window.localStorage;
  return store;
}

function load(base) {
  installStorage();
  const enginePath = path.join(base, 'engine.js');
  (0, eval)(fs.readFileSync(enginePath, 'utf8'));
  const dir = path.join(base, 'events');
  const files = ['_def.js'].concat(
    fs.readdirSync(dir).filter((f) => f.endsWith('.js') && f !== '_def.js').sort()
  );
  for (const f of files) {
    (0, eval)(fs.readFileSync(path.join(dir, f), 'utf8'));
  }
  return { Life: global.window.Life, EVENTS: global.window.LIFE_EVENTS };
}

module.exports = { load, installStorage };
