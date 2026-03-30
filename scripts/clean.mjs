import {rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

for (const relativePath of ['dist']) {
  rmSync(path.join(projectRoot, relativePath), {recursive: true, force: true});
}

console.log('Cleaned build artifacts.');
