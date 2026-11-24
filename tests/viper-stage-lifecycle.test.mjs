import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../assets/js/world-v87.js', import.meta.url), 'utf8');
const start = source.indexOf('  const stage = {');
const end = source.indexOf('\n  // Warm CSS3D import', start);
assert.ok(start >= 0 && end > start, 'Viper stage source must be present');
const stageCode = source.slice(start, end).replaceAll("import('three/addons/renderers/CSS3DRenderer.js')", 'loadCss()');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function harness() {
  const timers = new Map(), created = [], commands = [], objects = [];
  let timerId = 0, loadCss = () => Promise.resolve({ CSS3DObject });
  class Element {
    constructor(tag) { this.tag = tag; this.style = {}; this.events = {}; this.contentWindow = { postMessage: payload => commands.push({ element: this, command: JSON.parse(payload) }) }; }
    appendChild(child) { this.child = child; }
    addEventListener(event, fn) { this.events[event] = fn; }
  }
  class CSS3DObject {
    constructor(element) { this.element = element; this.position = { set() {} }; this.scale = { set() {} }; }
  }
  const document = { createElement(tag) { const e = new Element(tag); created.push(e); return e; }, body: { classList: { add() {}, remove() {} } } };
  const J = { current: { id: 'visitor-song' }, playing: true, toggle() { this.playing = !this.playing; } };
  const api = new Function('document', 'window', 'location', 'T', 'box', 'mat', 'info', 'music', 'FY', 'STAGE_YT', 'loadCss', 'setTimeout', 'clearTimeout',
    stageCode + '\nlet cur=null; return {stage,setRoom:r=>cur=r};')(
    document, { JX: J }, { origin: 'https://preview.example' }, {}, () => {}, () => {}, {}, {}, -200, 'JUjbods6cWw',
    () => loadCss(), fn => { const id = ++timerId; timers.set(id, fn); return id; }, id => timers.delete(id)
  );
  api.stage.css = { domElement: { style: {} } };
  api.stage.scene = { add(obj) { objects.push(obj); }, remove(obj) { const i = objects.indexOf(obj); if (i >= 0) objects.splice(i, 1); } };
  api.stage.ensure = async () => true;
  const room = { key: 'viper', ox: -1420, oz: -4600, stageBuilt: true, stagePos: { sx: 0, sy: 3.2, sz: -8.65, SW: 8, SH: 4.5 } };
  api.setRoom(room);
  return { ...api, room, timers, created, commands, objects, J, setImport: fn => { loadCss = fn; } };
}

test('normal active-room entry opens the requested 16:9 stage once', async () => {
  const h = harness(); await h.stage.show(h.room);
  assert.equal(h.stage.on, true); assert.equal(h.created.filter(e => e.tag === 'iframe').length, 1);
  assert.match(h.stage.iframe.src, /embed\/JUjbods6cWw\?/); assert.match(h.stage.iframe.style.cssText, /width:100%;height:100%/);
  assert.equal(h.J.playing, false); h.stage.hide();
});
test('exit while the renderer is loading prevents a late iframe and audio pause', async () => {
  const h = harness(), wait = deferred(); h.stage.ensure = () => wait.promise;
  const pending = h.stage.show(h.room); h.stage.hide(); h.setRoom(null); wait.resolve(true); await pending;
  assert.equal(h.stage.on, false); assert.equal(h.created.filter(e => e.tag === 'iframe').length, 0); assert.equal(h.J.playing, true);
});
test('exit while CSS3DObject is loading prevents a late stage', async () => {
  const h = harness(), wait = deferred(); h.setImport(() => wait.promise);
  const pending = h.stage.show(h.room); await Promise.resolve(); h.stage.hide(); h.setRoom(null);
  wait.resolve({ CSS3DObject: class { constructor() { this.position={set(){}};this.scale={set(){}}; } } }); await pending;
  assert.equal(h.stage.on, false); assert.equal(h.objects.length, 0); assert.equal(h.J.playing, true);
});
test('exit clears every outstanding autoplay retry', async () => {
  const h = harness(); await h.stage.show(h.room); h.stage.iframe.events.load();
  assert.ok(h.timers.size >= 2); h.stage.hide(); assert.equal(h.timers.size, 0);
});
test('a queued callback from an old visit cannot play or unmute the new visit', async () => {
  const h = harness(); await h.stage.show(h.room); const staleCallbacks = [...h.timers.values()];
  h.stage.hide(); await h.stage.show(h.room); h.commands.length = 0;
  for (const fn of staleCallbacks) fn();
  assert.equal(h.commands.length, 0); h.stage.hide();
});
test('a late iframe load after exit cannot schedule more retries', async () => {
  const h = harness(); await h.stage.show(h.room); const lateLoad = h.stage.iframe.events.load;
  h.stage.hide(); lateLoad(); assert.equal(h.timers.size, 0); assert.equal(h.stage.iframe, null);
});
