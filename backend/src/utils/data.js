import { readFile } from 'node:fs/promises';

const base = new URL('../../data/', import.meta.url);
export const readJson = async (name) => JSON.parse(await readFile(new URL(name, base), 'utf8'));
