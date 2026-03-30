import {spawn} from 'node:child_process';
import path from 'node:path';
import {projectRoot, resolvePythonRuntime} from './python-runtime.mjs';

const runtime = resolvePythonRuntime();
const targets = [
  path.join(projectRoot, 'server.py'),
  path.join(projectRoot, 'backend', 'app.py'),
];

const child = spawn(runtime.command, [...runtime.args, '-m', 'py_compile', ...targets], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', code => {
  process.exit(code ?? 0);
});

child.on('error', error => {
  console.error(`Backend validation failed to start: ${error.message}`);
  process.exit(1);
});
