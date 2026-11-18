import { spawnSync } from 'node:child_process';
const env = { ...process.env, NODE_ENV: 'test', DB_NAME: 'marketplace_test', UNIT_ONLY: 'false' };
const result = spawnSync(process.execPath, ['--experimental-vm-modules', './node_modules/jest/bin/jest.js', '--runInBand', ...process.argv.slice(2)], { stdio: 'inherit', env });
process.exit(result.status ?? 1);

