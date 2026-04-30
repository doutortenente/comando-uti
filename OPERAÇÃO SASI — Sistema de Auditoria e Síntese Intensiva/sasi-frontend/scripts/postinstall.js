// Generates a proper ESM shim for @supabase/phoenix@0.4.0
// which ships without the phoenix.mjs referenced in its package.json exports.
import { existsSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const mjs = resolve('node_modules/@supabase/phoenix/priv/static/phoenix.mjs');

if (!existsSync(mjs)) {
  const shim = [
    "export { Channel, LongPoll, Presence, Push, Serializer, Socket, Timer } from './phoenix.cjs.js';",
    "export { default } from './phoenix.cjs.js';",
    '',
  ].join('\n');
  writeFileSync(mjs, shim, 'utf8');
  console.log('[postinstall] created phoenix.mjs ESM shim');
}
