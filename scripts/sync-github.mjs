// Pulls recent activity from the owner's PUBLIC GitHub repositories into data/github.json,
// which the site reads (same origin; visitors' browsers never call GitHub).
// data/github.json is rewritten only when repository data changes; data/checked.json records every run.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const USER = process.env.GH_USER || 'darup67';
const SITE_REPO = process.env.SITE_REPO || 'dhruvpatel-site';
const TOKEN = process.env.GITHUB_TOKEN || '';
const MAX_AGE_DAYS = 365;
const EXCLUDE = new Set([SITE_REPO, `${USER}.github.io`]);
// Automated data commits say nothing to a visitor; show the latest human change instead.
const NOISE = /^(data:|futures:|candle archive|event-desk: headlines|.*\bbackup\b|ledger backup|weekly recalibration|paper-lab: bars|merge (branch|pull)|chore\(data\)|auto[- ]?commit)/i;

async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': `${USER}-site-sync`,
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });
  if (res.status === 409) return []; // empty repository
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
}

const now = Date.now();
const all = await gh(`/users/${USER}/repos?type=owner&sort=pushed&per_page=100`);
const repos = [];
for (const r of all) {
  if (r.private || r.fork || r.archived || EXCLUDE.has(r.name)) continue;
  if (now - Date.parse(r.pushed_at) > MAX_AGE_DAYS * 86400e3) continue;
  let last = null;
  try {
    const commits = await gh(`/repos/${USER}/${r.name}/commits?per_page=30`);
    const c = commits.find((x) => !NOISE.test(x.commit.message.trim())) || null;
    if (c) {
      last = {
        message: c.commit.message.split('\n')[0].trim().slice(0, 160),
        date: c.commit.committer?.date || c.commit.author?.date,
        url: c.html_url,
      };
    }
  } catch (e) {
    console.warn(`commits for ${r.name}: ${e.message}`);
  }
  repos.push({
    name: r.name,
    description: r.description || '',
    url: r.html_url,
    language: r.language || '',
    stars: r.stargazers_count,
    pushed_at: r.pushed_at,
    last_commit: last,
  });
}
const when = (r) => Date.parse(r.last_commit?.date || r.pushed_at);
repos.sort((a, b) => when(b) - when(a));

await mkdir('data', { recursive: true });
let previous = null;
try { previous = JSON.parse(await readFile('data/github.json', 'utf8')); } catch {}
const changed = !previous || JSON.stringify(previous.repos) !== JSON.stringify(repos);
const stamp = new Date().toISOString();
if (changed) {
  await writeFile('data/github.json', JSON.stringify({ user: USER, generated_at: stamp, repos }, null, 2) + '\n');
}
await writeFile('data/checked.json', JSON.stringify({ checked_at: stamp }) + '\n');
console.log(`${repos.length} public repos; ${changed ? 'data changed' : 'no change'}`);
