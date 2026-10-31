import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Removes the per-file test databases created by setup-db.ts. */
export default function setup() {
  return () => {
    for (const name of fs.readdirSync(os.tmpdir())) {
      if (name.startsWith('horizonview-test-')) fs.rmSync(path.join(os.tmpdir(), name), { force: true });
    }
  };
}
