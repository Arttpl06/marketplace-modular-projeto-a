import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['--experimental-vm-modules', './node_modules/jest/bin/jest.js', '--runInBand', '--testPathPatterns=tests/unit', ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'test', DB_NAME: 'marketplace_test', UNIT_ONLY: 'true' } });
process.exit(result.status ?? 1);
