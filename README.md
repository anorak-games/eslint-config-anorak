# @anorak-games/eslint-config

Shared ESLint flat-config for Anorak projects.

## Install

```sh
npm install --save-dev @anorak-games/eslint-config eslint typescript
```

## Usage

Backend (`eslint.config.mjs`):

```js
import createBackendConfig from '@anorak-games/eslint-config/backend';

export default createBackendConfig();
```

Frontend (`runtime` is `'expo'` for a client, `'vite'` for an admin):

```js
import createFrontendConfig from '@anorak-games/eslint-config/frontend';

export default createFrontendConfig({ runtime: 'expo' });
```

## Releasing

CI publishes to npm when a GitHub Release is published; the `vX.Y.Z` tag sets the version and is synced back to `main`:

```sh
gh release create v0.2.0 --generate-notes
```

Manual publish (fallback only — CI normally does this): `npm ci && npm test && npm version X.Y.Z && npm publish --access public`, then push with `--follow-tags` and create the matching GitHub Release.
