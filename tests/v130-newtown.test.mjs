import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');
let failed = 0;
const ok = (c, m) => { if (!c) { console.error('FAIL', m); failed++; } else console.log('ok', m); };

const html = read('world.html');
ok(html.includes('?v=130'), 'world.html cache-bust is v=130');
ok(!html.includes('?v=129'), 'world.html has no leftover ?v=129');

const fx = read('assets/js/world-fx.js');
ok(fx.includes("import('./world-v130.js?v=130')"), 'world-fx imports v130');
ok(fx.includes('fx.v130.update'), 'world-fx calls v130.update');
ok(!fx.includes('?v=129'), 'world-fx has no leftover ?v=129');

ok(existsSync(join(root, 'assets/js/world-v130.js')), 'world-v130.js exists');
ok(existsSync(join(root, 'assets/js/bedroom-23-sturdee.js')), 'bedroom-23-sturdee.js exists');
ok(existsSync(join(root, 'assets/data/newtown-v130-fill.json')), 'fill json exists');

const fill = JSON.parse(read('assets/data/newtown-v130-fill.json'));
ok(fill.buildings.length > 50, 'fill has a useful number of plots: ' + fill.buildings.length);
ok(fill.buildings.some(b => b.special === 'bedroom-23'), 'special unlabelled Sturdee house is in the fill data');
ok(!JSON.stringify(fill).includes('23 Sturdee'), 'fill JSON never writes the house number as a visible/world string key');
ok(fill.counts.by_road['Barnard Avenue'] > 10, 'Barnard Avenue has gap-fill plots');
ok(fill.counts.by_road['Barnard Crescent'] > 5, 'Barnard Crescent has gap-fill plots');
ok(!fill.counts.by_road['Sturdee Avenue'], 'does not re-fill streets already handled by world-streets');
ok(!fill.counts.by_road['Beatty Close'], 'does not overwrite Beatty Close flats');

const bed = read('assets/js/bedroom-23-sturdee.js');
ok(bed.includes('JOE') && bed.includes('gold') || bed.includes('#e6c24a'), 'gold JOE tag');
ok(bed.includes('cross inside the O') || bed.includes('cross inside'), 'cross in the O is documented');
ok(bed.includes('FLASH') && bed.includes('1.5'), 'strobe is 1.5 Hz');
ok(bed.includes('prefers-reduced-motion'), 'reduced-motion fallback');
ok(!/label\(.*23|23 Sturdee Avenue|No\.?\s*23/.test(bed), 'bedroom module does not paint an address label');

const v128 = read('assets/js/world-v128.js');
ok(v128.includes('isTwoStorey'), 'v128 has two-storey interiors');
ok(v128.includes('interiorFor'), 'v128 hands off to fx.interiorFor');

const v130 = read('assets/js/world-v130.js');
ok(v130.includes('__groundParts'), 'Beatty stairs hook ground height');
ok(v130.includes('white') && v130.includes('#111111'), 'UK white/black street plates');

for (const f of [
  'assets/js/world-v130.js',
  'assets/js/bedroom-23-sturdee.js',
  'assets/js/world-v128.js',
  'assets/js/world-fx.js'
]) {
  execFileSync('node', ['--check', join(root, f)], { stdio: 'pipe' });
  console.log('ok syntax', f);
}

if (failed) { console.error(failed, 'failures'); process.exit(1); }
console.log('all tests passed');
