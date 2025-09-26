import { baseConfig } from '@enormora/eslint-config-base';
import { typescriptConfig } from '@enormora/eslint-config-typescript';
import { nodeConfig, nodeConfigFileConfig } from '@enormora/eslint-config-node';

export default [
    {
        ignores: ['target/**/*']
    },
    baseConfig,
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
