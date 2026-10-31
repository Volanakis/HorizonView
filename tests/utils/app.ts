import type { RequestListener } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The production server from `vite build` (adapter-node), driven in-process by supertest,
// so tests exercise the real hooks, CSP, cookies and routing. Loaded by URL so the
// generated bundle isn't type-checked.
const entry = pathToFileURL(path.resolve('build/handler.js')).href;
const { handler } = (await import(/* @vite-ignore */ entry)) as { handler: RequestListener };

export default handler;
