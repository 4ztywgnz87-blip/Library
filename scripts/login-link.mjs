// Creates a one-time login link without email: node scripts/login-link.mjs someone@example.com [--local]
import { createHash, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const email = process.argv[2]?.trim().toLowerCase();
const local = process.argv.includes('--local');
if (!email) {
  console.error('Usage: node scripts/login-link.mjs <email> [--local]');
  process.exit(1);
}
const token = randomBytes(32).toString('base64url');
const hash = createHash('sha256').update(token).digest('hex');
const expires = Date.now() + 7 * 86_400_000;
execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', 'snug', local ? '--local' : '--remote', '--command',
    `INSERT INTO login_tokens (token_hash, email, expires_at) VALUES ('${hash}', '${email.replace(/'/g, "''")}', ${expires})`],
  { stdio: 'ignore' },
);
const origin = local ? 'http://localhost:8787' : 'https://snug.snugshelf.workers.dev';
console.log(`${origin}/api/auth/verify?token=${token}`);
