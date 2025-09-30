import { baseConfig } from '@enormora/eslint-config-base';
import { typescriptConfig } from '@enormora/eslint-config-typescript';
import { nodeConfig, nodeConfigFileConfig } from '@enormora/eslint-config-node';

export default [
    {
        ignores: ['target/**/*']
    },
    {
        ...baseConfig,
        files: ['**/*.{js,jsx,cjs,mjs,ts,mts,cts,tsx}'],
        rules: {
            ...baseConfig.rules,

            '@cspell/spellchecker': [
                'error',
                {
                    autoFix: false,
                    numSuggestions: 3,
                    generateSuggestions: true,
                    ignoreImports: true,
                    ignoreImportProperties: true,
                    checkIdentifiers: true,
                    checkStrings: true,
                    checkStringTemplates: true,
                    checkJSXText: true,
                    checkComments: true,
                    cspell: {
                        words: ['objectory', 'enormora'],
                        ignoreWords: [],
                        flagWords: [],
                        ignoreRegExpList: [],
                        includeRegExpList: [],
                        allowCompoundWords: true,
                        import: [],
                        dictionaries: []
                    },
                    customWordListFile: undefined,
                    debugMode: false
                }
            ]
        }
    },
    nodeConfig,
    {
        ...typescriptConfig,
        files: ['**/*.ts']
    },
    {
        files: ['**/*.ts'],
        rules: {
            'functional/prefer-immutable-types': 'off'
        }
    },
    {
        files: ['**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-floating-promises': [
                'error',
                {
                    allowForKnownSafeCalls: [
                        {
                            from: 'package',
                            name: 'test',
                            package: 'node:test'
                        }
                    ]
                }
            ]
        }
    },
    {
        ...nodeConfigFileConfig,
        files: ['eslint.config.js', 'prettier.config.js', 'packtory.config.js'],
        rules: {
            ...nodeConfigFileConfig.rules,

            'node/no-process-env': 'off'
        }
    }
];
