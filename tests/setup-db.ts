import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// The built server and the test helpers each open their own SQLite connection, so an
// in-memory database would be two separate databases. Each test file gets its own file.
process.env.DATABASE_URL = `sqlite://${path.join(os.tmpdir(), `horizonview-test-${randomUUID()}.db`)}`;
