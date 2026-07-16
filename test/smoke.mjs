import assert from 'node:assert/strict';

import createBackendConfig from '../backend.mjs';
import createFrontendConfig from '../frontend.mjs';

const backend = createBackendConfig();
assert.ok(Array.isArray(backend), 'createBackendConfig() must return an array');
assert.ok(backend.length > 0, 'backend config must not be empty');

for (const runtime of ['expo', 'vite']) {
    const config = createFrontendConfig({ runtime });
    assert.ok(Array.isArray(config), `createFrontendConfig({ runtime: '${runtime}' }) must return an array`);
    assert.ok(config.length > 0, `frontend config for '${runtime}' must not be empty`);
}

assert.throws(() => createFrontendConfig({ runtime: 'webpack' }), /runtime must be 'expo' or 'vite'/);
assert.throws(() => createFrontendConfig(), /runtime must be 'expo' or 'vite'/);

console.log('smoke test passed');
