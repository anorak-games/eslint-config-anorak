// @ts-check
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

/** @import { Linter } from 'eslint' */

const prettierOptions = {
    useTabs: false,
    tabWidth: 4,
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
};

// === Direction rules — keep the dependency graph acyclic ===

const sharedCannotImportServices = {
    files: ['shared/src/**/*.ts', 'shared/tests/**/*.ts'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['**/api/**', '**/admin/**', '@api/*', '@admin/*'],
                        message:
                            'shared/ must not import from api/ or admin/. Services depend on shared, never the reverse.',
                    },
                ],
            },
        ],
    },
};

const apiCannotImportAdmin = {
    files: ['api/src/**/*.ts', 'api/tests/**/*.ts'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['**/admin/**', '@admin/*'],
                        message:
                            'api/ must not import from admin/. The two services do not know about each other — move shared code to shared/.',
                    },
                ],
            },
        ],
    },
};

const adminCannotImportApi = {
    files: ['admin/src/**/*.ts', 'admin/tests/**/*.ts'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['**/api/**', '@api/*'],
                        message:
                            'admin/ must not import from api/. The two services do not know about each other — move shared code to shared/.',
                    },
                ],
            },
        ],
    },
};

// === Layer rules — applied via globs across all three folders ===

const noExpressInBusinessLogic = {
    files: [
        'shared/src/modules/**/*.ts',
        'shared/src/lib/**/*.ts',
        'shared/src/runMigrations.ts',
        'api/src/modules/**/*.ts',
        'api/src/lib/**/*.ts',
        'admin/src/modules/**/*.ts',
        'admin/src/lib/**/*.ts',
    ],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                paths: [
                    {
                        name: 'express',
                        message:
                            'express imports are not allowed in modules/ or lib/. HTTP belongs in routes/middleware.',
                    },
                ],
            },
        ],
    },
};

const noPgOutsideRepositoriesOrBootstrap = {
    files: ['shared/src/**/*.ts', 'api/src/**/*.ts', 'admin/src/**/*.ts'],
    ignores: [
        '**/repository/**',
        'shared/src/runMigrations.ts',
        'api/src/bootstrap.ts',
        'api/src/bootstrap/**',
        'admin/src/bootstrap.ts',
        'admin/src/bootstrap/**',
    ],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                paths: [
                    {
                        name: 'pg',
                        message:
                            'pg imports are only allowed in repository classes, runMigrations.ts, and each service bootstrap.ts.',
                    },
                ],
            },
        ],
    },
};

const noProcessEnvOutsideBootstrapOrServer = {
    files: ['shared/src/**/*.ts', 'api/src/**/*.ts', 'admin/src/**/*.ts'],
    ignores: [
        'api/src/bootstrap.ts',
        'api/src/server.ts',
        'api/src/demoBootstrap.ts',
        'admin/src/bootstrap.ts',
        'admin/src/server.ts',
    ],
    rules: {
        'no-restricted-syntax': [
            'error',
            {
                selector:
                    "MemberExpression[object.object.name='process'][object.property.name='env']",
                message:
                    'process.env reads must happen in a service bootstrap.ts or server.ts. shared/ never reads process.env.',
            },
            {
                selector: "MemberExpression[object.name='process'][property.name='env']",
                message:
                    'process.env reads must happen in a service bootstrap.ts or server.ts. shared/ never reads process.env.',
            },
        ],
    },
};

const noQueryOutsideRepositoriesOrMigrations = {
    files: ['shared/src/**/*.ts', 'api/src/**/*.ts', 'admin/src/**/*.ts'],
    ignores: [
        '**/repository/**',
        'shared/src/runMigrations.ts',
        'api/src/bootstrap.ts',
        'admin/src/bootstrap.ts',
    ],
    rules: {
        'no-restricted-syntax': [
            'error',
            {
                selector: "CallExpression[callee.property.name='query']",
                message:
                    'pool.query may only be called in repositories, runMigrations.ts, and each service bootstrap.ts (the SELECT 1 connectivity check).',
            },
        ],
    },
};

const noRouteCrossImport = {
    files: ['api/src/routes/**/*.ts', 'admin/src/routes/**/*.ts'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['**/routes/**'],
                        message:
                            'Routes do not import other routes. Extract shared logic to a command (preferably in shared/).',
                    },
                ],
            },
        ],
    },
};

const libIsTheFloor = {
    files: ['shared/src/lib/**/*.ts', 'api/src/lib/**/*.ts', 'admin/src/lib/**/*.ts'],
    rules: {
        'no-restricted-imports': [
            'error',
            {
                patterns: [
                    {
                        group: ['**/modules/**', '**/routes/**', '**/middleware/**'],
                        message:
                            'lib/ is the floor — it depends on nothing in modules/, routes/, or middleware/.',
                    },
                ],
            },
        ],
    },
};

const noDefaultExport = {
    files: [
        'shared/src/**/*.ts',
        'shared/tests/**/*.ts',
        'api/src/**/*.ts',
        'api/tests/**/*.ts',
        'admin/src/**/*.ts',
        'admin/tests/**/*.ts',
    ],
    rules: {
        'no-restricted-syntax': [
            'error',
            {
                selector: 'ExportDefaultDeclaration',
                message: 'Use named exports. Default exports are not allowed in this backend.',
            },
        ],
    },
};

/**
 * Build the ESLint flat-config for an Anorak backend package. Takes no options
 * yet — the parameter-less call keeps the API symmetric with the frontend
 * factory and leaves room to add options without a breaking change.
 * @returns {Linter.Config[]}
 */
export default function createBackendConfig() {
    return tseslint.config(
        { ignores: ['node_modules', 'dist', 'coverage'] },
        ...tseslint.configs.recommended,
        sharedCannotImportServices,
        apiCannotImportAdmin,
        adminCannotImportApi,
        noExpressInBusinessLogic,
        noPgOutsideRepositoriesOrBootstrap,
        noProcessEnvOutsideBootstrapOrServer,
        noQueryOutsideRepositoriesOrMigrations,
        noRouteCrossImport,
        libIsTheFloor,
        noDefaultExport,
        {
            rules: {
                '@typescript-eslint/no-explicit-any': 'error',
                '@typescript-eslint/no-unused-vars': [
                    'error',
                    { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
                ],
                curly: ['error', 'all'],
            },
        },
        prettierConfig,
        {
            plugins: { prettier: prettierPlugin },
            rules: {
                'prettier/prettier': ['error', prettierOptions],
            },
        },
    );
}
