export default [
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                document: 'readonly',
                window: 'readonly',
                navigator: 'readonly',
                localStorage: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                requestAnimationFrame: 'readonly',
                NodeFilter: 'readonly',
                URL: 'readonly',
                FileReader: 'readonly',
                confirm: 'readonly',
                Diff: 'readonly',
            },
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            eqeqeq: ['error', 'smart'],
            'no-var': 'error',
            'prefer-const': 'warn',
        },
    },
    {
        files: ['src/**/__tests__/**/*.js', 'src/**/*.test.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                vi: 'readonly',
            },
        },
    },
];
