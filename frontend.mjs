// @ts-check
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import checkFile from 'eslint-plugin-check-file';
import reactPlugin from 'eslint-plugin-react';

/** @import { Linter } from 'eslint' */

const prettierOptions = {
    useTabs: false,
    tabWidth: 4,
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
};

// ── Restricted-syntax selectors ──
// ESLint flat config REPLACES (does not merge) a rule across config blocks: for
// any file, only the last matching block's `no-restricted-syntax` applies. So all
// AST restrictions live in ONE rule. The base block lists every selector; each
// per-area override re-lists the full set MINUS the one selector that area is
// allowed to use (commands may setState, hooks may useState + store.subscribe, etc).
const noUseState = {
    selector: "CallExpression[callee.name='useState']",
    message: 'useState belongs in pages/, components/, or hooks/. Shared state goes in a store.',
};
const noUseEffect = {
    selector: "CallExpression[callee.name='useEffect']",
    message:
        'A useEffect belongs in a hook file (src/hooks/ or src/pages/{name}/hooks/), never inline in a page or component. The only exception is the bootstrap() mount in src/App.tsx.',
};
const noSetState = {
    selector: "CallExpression[callee.property.name='setState']",
    message: 'setState may only be called from a commands/ file or the store file itself.',
};
const noStoreSubscribe = {
    selector: "CallExpression[callee.property.name='subscribe'][callee.object.name=/Store$/]",
    message:
        'A store .subscribe() belongs in a subscriptions/ file (global reaction) or a named hook (component-scoped reaction) — never inline in a page, component, command, or lib.',
};
const noDefaultExport = {
    selector: 'ExportDefaultDeclaration',
    message:
        'Use named exports everywhere — including React components, pages, and App. Default exports are not allowed.',
};
// Commands-only: a command is a mutation, never a lifecycle owner.
const noTimerInCommand = {
    selector: 'CallExpression[callee.name=/^(setInterval|setTimeout)$/]',
    message:
        'Commands never own timers. Move the interval/timeout to a hook (per-screen) or subscription (global), which then calls the command.',
};
const noListenerInCommand = {
    selector: "CallExpression[callee.property.name='addEventListener']",
    message:
        'Commands never own listeners. Move addEventListener to a hook or subscription, which then calls the command.',
};

// Depth-agnostic path globs: every per-area `files:` glob below matches its primitive
// folder at ANY nesting depth (`src/**/pages/**`, not `src/pages/**`), so the ruleset
// still governs code a project quarantines into a subfolder rather than placing it
// directly under `src/`. The motivating case is a prototype quarantined into its own
// subfolder (e.g. `src/some-prototype/`) whose pages/hooks/stores/lib live a level
// deeper. `**` matches zero path segments, so the flat `src/pages/**` layout keeps
// matching too.

/**
 * The per-area restricted-syntax blocks. The only runtime-specific block is the
 * app entry (Expo `src/index.ts` vs Vite `src/main.tsx`) and the Metro `.d.ts`
 * asset-typing allowance, which only the Expo client needs.
 * @param {'expo' | 'vite'} runtime
 * @returns {Linter.Config[]}
 */
const restrictedSyntax = (runtime) => {
    const entryFile = runtime === 'expo' ? 'src/index.ts' : 'src/main.tsx';
    /** @type {Linter.Config[]} */
    const blocks = [
        {
            // Base — every restriction applies everywhere unless a later override relaxes one.
            files: ['src/**/*.{ts,tsx}'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    noUseState,
                    noUseEffect,
                    noSetState,
                    noStoreSubscribe,
                    noDefaultExport,
                ],
            },
        },
        {
            // UI — pages and components may hold local React state, but NOT a useEffect:
            // lifecycle logic lives in a named hook, never inline in a page or component.
            files: ['src/**/pages/**/*.{ts,tsx}', 'src/**/components/**/*.{ts,tsx}'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    noUseEffect,
                    noSetState,
                    noStoreSubscribe,
                    noDefaultExport,
                ],
            },
        },
        {
            // Hooks — local state, useEffect, AND an imperative store.subscribe (component-scoped reaction).
            // `src/**/hooks/**` covers both shared (`src/hooks/`) and page-local hooks at any depth.
            files: ['src/**/hooks/**/*.{ts,tsx}'],
            rules: { 'no-restricted-syntax': ['error', noSetState, noDefaultExport] },
        },
        {
            // App root — the single allowed inline useEffect in the app: the one-time bootstrap() mount.
            files: ['src/App.tsx'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    noUseState,
                    noSetState,
                    noStoreSubscribe,
                    noDefaultExport,
                ],
            },
        },
        {
            // Commands — the only place (besides the store file) that may call setState,
            // but never own timers or listeners (those are lifecycle work for hooks/subscriptions).
            files: ['src/**/commands/**/*.ts'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    noUseState,
                    noUseEffect,
                    noStoreSubscribe,
                    noDefaultExport,
                    noTimerInCommand,
                    noListenerInCommand,
                ],
            },
        },
        {
            // Store file itself — its inline actions may call setState.
            // `src/**/stores/*/*.ts` covers root, page-local, and quarantined store files at any depth.
            files: ['src/**/stores/*/*.ts'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    noUseState,
                    noUseEffect,
                    noStoreSubscribe,
                    noDefaultExport,
                ],
            },
        },
        {
            // Subscriptions — the home for store.subscribe.
            files: ['src/**/subscriptions/**/*.ts'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    noUseState,
                    noUseEffect,
                    noSetState,
                    noDefaultExport,
                ],
            },
        },
        {
            // App entry — the framework bootstrap (registerRootComponent / createRoot) lives
            // here and is the one place a default export is tolerated.
            files: [entryFile],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    noUseState,
                    noUseEffect,
                    noSetState,
                    noStoreSubscribe,
                ],
            },
        },
    ];
    if (runtime === 'expo') {
        blocks.push({
            // Ambient declaration files (e.g. `declare module '*.png'`) — the standard
            // way to type Metro asset imports uses `export default`, which is ambient,
            // not a runtime default export. Allow it; keep every other restriction.
            files: ['src/**/*.d.ts'],
            rules: {
                'no-restricted-syntax': [
                    'error',
                    noUseState,
                    noUseEffect,
                    noSetState,
                    noStoreSubscribe,
                ],
            },
        });
    }
    return blocks;
};

const reactImportBan = {
    group: ['react', 'react/*'],
    message:
        'React imports are not allowed in stores/commands/subscriptions/api/lib. Move to a hook or component.',
};

/**
 * The renderer import ban — Expo logic must not pull in `react-native`, Vite logic
 * must not pull in `react-dom`.
 * @param {'expo' | 'vite'} runtime
 */
const rendererImportBan = (runtime) =>
    runtime === 'expo'
        ? {
              group: ['react-native', 'react-native/*'],
              message:
                  'react-native imports are not allowed in stores/commands/subscriptions/api/lib. Move to a hook or component.',
          }
        : {
              group: ['react-dom', 'react-dom/*'],
              message:
                  'react-dom imports are not allowed in stores/commands/subscriptions/api/lib. Move to a hook or component.',
          };

/**
 * React/renderer imports are banned in non-UI logic. Selectors ARE React hooks
 * (they call useStore and may need zustand/react/shallow), so they're excluded.
 * lib/ is handled by `pureLib` below (it needs the api restriction too), so it's
 * excluded here to avoid the same flat-config rule-replacement trap.
 * @param {'expo' | 'vite'} runtime
 * @returns {Linter.Config}
 */
const noReactInLogic = (runtime) => ({
    files: [
        'src/**/stores/**/*.ts',
        'src/**/commands/**/*.ts',
        'src/**/subscriptions/**/*.ts',
        'src/**/api/**/*.ts',
    ],
    ignores: ['src/**/selectors/**/*.ts'],
    rules: {
        'no-restricted-imports': ['error', { patterns: [reactImportBan, rendererImportBan(runtime)] }],
    },
});

/**
 * lib/ is pure: no React, no renderer, and no api/. One block so the restrictions
 * don't replace each other (flat config replaces same-named rules).
 * @param {'expo' | 'vite'} runtime
 * @returns {Linter.Config}
 */
const pureLib = (runtime) => ({
    // NOTE: intentionally NOT depth-agnostic. Generalizing to `src/**/lib/**` would
    // retroactively govern page-local / component-local `lib/` folders, which projects
    // legitimately use for imperative non-UI platform-call helpers (Share/Linking) that
    // the convention allows in lib/ — breaking flat packages whose local react-native
    // carve-out only covers top-level `src/lib/`. Keep it top-level only.
    files: ['src/lib/**/*.ts'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    reactImportBan,
                    rendererImportBan(runtime),
                    {
                        group: ['**/api/**'],
                        message:
                            'api/ is not callable from lib/. lib/ is pure logic — move network code to an async command, subscription, or hook.',
                    },
                ],
            },
        ],
    },
});

/** @type {Linter.Config} */
const storeFilesEndInStore = {
    files: ['src/**/stores/*/*.ts'],
    plugins: { 'check-file': checkFile },
    rules: {
        'check-file/filename-naming-convention': [
            'error',
            {
                'src/**/stores/*/*.ts': '*Store',
            },
            { ignoreMiddleExtensions: true },
        ],
    },
};

/** @type {Linter.Config} */
const oneComponentPerFile = {
    // One React component per .tsx file. A second component (a card file that also
    // defines its avatar sub-component) must be split into its own file — see the
    // component-folder rule in rn-game-writer.md. Detected by JSX return, not naming.
    files: ['src/**/*.tsx'],
    plugins: { react: reactPlugin },
    settings: { react: { version: '19.1.0' } },
    rules: {
        'react/no-multi-comp': ['error', { ignoreStateless: false }],
    },
};

/**
 * Build the ESLint flat-config for an Anorak frontend package. The store/command/
 * selector/subscription/hook convention is identical across the two; only the
 * runtime primitives differ — Expo (React Native, `src/index.ts` entry, Metro
 * assets) vs Vite (React DOM, `src/main.tsx` entry).
 * @param {{ runtime: 'expo' | 'vite' }} options
 * @returns {Linter.Config[]}
 */
export default function createFrontendConfig({ runtime } = /** @type {any} */ ({})) {
    if (runtime !== 'expo' && runtime !== 'vite') {
        throw new Error(
            `createFrontendConfig: runtime must be 'expo' or 'vite', received ${String(runtime)}`,
        );
    }
    const ignores =
        runtime === 'expo'
            ? ['node_modules', '.expo', 'dist', 'android', 'ios', 'metro.config.js']
            : ['node_modules', 'dist'];
    return tseslint.config(
        { ignores },
        ...tseslint.configs.recommended,
        ...restrictedSyntax(runtime),
        noReactInLogic(runtime),
        pureLib(runtime),
        storeFilesEndInStore,
        oneComponentPerFile,
        {
            rules: {
                '@typescript-eslint/no-explicit-any': 'error',
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
                ],
            },
        },
        /** @type {Linter.Config} */ (prettierConfig),
        {
            plugins: { prettier: prettierPlugin },
            rules: {
                'prettier/prettier': ['error', prettierOptions],
            },
        },
    );
}
