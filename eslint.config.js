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
                        words: ['objectory'],
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
        ...nodeConfigFileConfig,
        files: ['eslint.config.js', 'prettier.config.js']
    }
];
