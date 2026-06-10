import { baseConfig, withCspellWords } from '@enormora/eslint-config-base';
import { typescriptConfig } from '@enormora/eslint-config-typescript';
import { nodeConfig, nodeConfigFileConfig } from '@enormora/eslint-config-node';

export default [
    {
        ignores: [ 'target/**/*' ]
    },
    ...baseConfig,
    {
        ...withCspellWords([ 'objectory', 'enormora' ]),
        files: [ '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx,vue}' ]
    },
    {
        ...nodeConfig,
        files: [ '**/*.{js,cjs,mjs,jsx,ts,cts,mts,tsx}' ]
    },
    {
        ...typescriptConfig,
        files: [ '**/*.ts' ]
    },
    {
        files: [ '**/*.test.ts' ],
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
        files: [ 'eslint.config.js', 'packtory.config.js' ],
        rules: {
            ...nodeConfigFileConfig.rules,

            'node/no-process-env': 'off'
        }
    }
];
