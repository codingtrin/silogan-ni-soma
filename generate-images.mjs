// Generates AI food photos for each silog dish via Kie.AI (nano-banana-2),
// then downloads them into ./images/. Reads KIE_API_KEY from .env.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const IMG_DIR = path.join(ROOT, 'images');
fs.mkdirSync(IMG_DIR, { recursive: true });

// --- load API key from .env ---
const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
const KEY = (env.match(/KIE_API_KEY\s*=\s*(.+)/) || [])[1]?.trim();
if (!KEY) { console.error('No KIE_API_KEY in .env'); process.exit(1); }

const BASE = 'https://api.kie.ai/api/v1/jobs';
const HEADERS = { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const STYLE =
  'Professional overhead food photography, appetizing, vibrant, natural soft daylight, ' +
  'shallow depth of field, served in a ceramic Japanese donburi bowl on a warm cream linen ' +
  'surface, garnished cleanly, restaurant menu quality, ultra detailed, no text, no watermark.';

const dishes = [
  { id: 'tapsilog',  name: 'Tapsilog Donburi',   prompt: 'Filipino-Japanese tapsilog donburi: garlic-cured beef tapa slices over white garlic rice with a glossy soy-glazed runny egg on top, scallions.' },
  { id: 'longsilog', name: 'Longsilog Ramen',    prompt: 'Longsilog ramen: sweet Filipino longganisa sausage in a deep rich pork-dashi ramen broth with a soft halved ramen egg, scallions, in a ramen bowl.' },
  { id: 'tocilog',   name: 'Tocilog Rice Bowl',  prompt: 'Tocilog rice bowl: sweet-cured red tocino pork over warm white rice sprinkled with furikake and a bright sunny-side-up egg.' },
  { id: 'adobosilog',name: 'Adobosilog Don',     prompt: 'Adobosilog donburi: glossy slow-braised soy adobo pork belly over rice with a halved jammy ramen egg and scallions.' },
  { id: 'bangsilog', name: 'Bangsilog Don',      prompt: 'Bangsilog donburi: crispy golden bangus milkfish fillet over garlic rice with a pickled ginger slaw and a soft egg.' },
  { id: 'chicksilog',name: 'Chicksilog Katsu',   prompt: 'Chicksilog katsu: panko-fried crispy chicken katsu cutlet sliced, drizzled with dark tonkatsu glaze, over garlic rice with a fried egg.' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function createTask(d) {
  const body = {
    model: 'nano-banana-2',
    input: {
      prompt: `${d.prompt} ${STYLE}`,
      aspect_ratio: '1:1',
      resolution: '1K',
      output_format: 'jpg',
    },
  };
  const res = await fetch(`${BASE}/createTask`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  const json = await res.json();
  if (json.code !== 200) throw new Error(`createTask ${d.id}: ${json.msg || JSON.stringify(json)}`);
  return json.data.taskId;
}

async function poll(taskId) {
  for (let i = 0; i < 90; i++) {
    const res = await fetch(`${BASE}/recordInfo?taskId=${taskId}`, { headers: HEADERS });
    const json = await res.json();
    const data = json.data || {};
    if (data.state === 'success') {
      const parsed = JSON.parse(data.resultJson || '{}');
      const url = (parsed.resultUrls || parsed.result_urls || [])[0];
      if (!url) throw new Error(`no resultUrl for ${taskId}: ${data.resultJson}`);
      return url;
    }
    if (data.state === 'fail') throw new Error(`task failed: ${data.failMsg || 'unknown'}`);
    await sleep(3000);
  }
  throw new Error(`timeout polling ${taskId}`);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function run() {
  // kick off all tasks first (async generation runs in parallel)
  const tasks = [];
  for (const d of dishes) {
    const taskId = await createTask(d);
    console.log(`▶ ${d.name}: task ${taskId}`);
    tasks.push({ d, taskId });
  }
  // poll + download each
  for (const { d, taskId } of tasks) {
    const url = await poll(taskId);
    const dest = path.join(IMG_DIR, `${d.id}.jpg`);
    const bytes = await download(url, dest);
    console.log(`✔ ${d.name} → images/${d.id}.jpg (${(bytes / 1024).toFixed(0)} KB)`);
  }
  console.log('\nDone — all images generated.');
}

run().catch((e) => { console.error('ERROR:', e.message); process.exit(1); });
