// Pulls the Letterboxd diary RSS and writes letterboxd.json for the "Recent Watches" card.
// Runs server-side (GitHub Actions, or `node scripts/letterboxd.mjs` locally), so the page
// no longer depends on a CORS proxy.
import { writeFileSync } from 'node:fs';

const USER = 'kyyllannn';
const MAX = 8;

const res = await fetch(`https://letterboxd.com/${USER}/rss/`, { headers: { 'User-Agent': 'Mozilla/5.0 (dossier feed)' } });
if (!res.ok) throw new Error(`letterboxd HTTP ${res.status}`);
const xml = await res.text();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${name}>`));
  return m ? decode(m[1].trim()) : '';
};
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'");

const stars = (n) => {
  const v = parseFloat(n);
  if (Number.isNaN(v) || v < 0) return '';
  return '★'.repeat(Math.floor(v)) + (v % 1 >= 0.5 ? '½' : '');
};

const entries = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
  .map(([, b]) => ({
    title:   tag(b, 'letterboxd:filmTitle'),
    year:    tag(b, 'letterboxd:filmYear'),
    rating:  stars(tag(b, 'letterboxd:memberRating')),
    watched: tag(b, 'letterboxd:watchedDate'),
    rewatch: tag(b, 'letterboxd:rewatch') === 'Yes',
    url:     tag(b, 'link'),
  }))
  .filter((e) => e.title && e.watched)   // diary entries only (skips lists)
  .slice(0, MAX);

if (!entries.length) throw new Error('no diary entries in feed');
writeFileSync(new URL('../letterboxd.json', import.meta.url), JSON.stringify({ user: USER, fetched: new Date().toISOString(), entries }, null, 2) + '\n');
console.log(`wrote ${entries.length} entries`);
