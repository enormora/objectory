// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

const npmToken = process.env.NPM_TOKEN;

/** @returns {Promise<import('@packtory/cli').PacktoryConfig>} */
export async function buildConfig() {
    const packageJsonContent = await fs.readFile('./package.json', { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);

    if (npmToken === undefined) {
        throw new Error('Missing NPM_TOKEN environment variable');
    }

    return {
        registrySettings: { token: npmToken },
        commonPackageSettings: {
            sourcesFolder,
            mainPackageJson: packageJson,
            includeSourceMapFiles: true,
            additionalFiles: [
                {
                    sourceFilePath: path.join(projectFolder, 'LICENSE'),
                    targetFilePath: 'LICENSE'
                }
            ],
            additionalPackageJsonAttributes: {
                repository: packageJson.repository,
                license: packageJson.license,
                author: packageJson.author,
                engines: packageJson.engines
            }
        },
        packages: [
            {
                name: '@enormora/objectory',
                entryPoints: [
                    {
                        js: 'main.js',
                        declarationFile: 'main.d.ts'
                    }
                ],
                additionalPackageJsonAttributes: {
                    description: 'A library for defining JavaScript objects for testing',
                    keywords: ['factory', 'factories', 'test', 'testing', 'test data']
                },
                additionalFiles: [
                    {
                        sourceFilePath: path.join(projectFolder, 'README.md'),
                        targetFilePath: 'README.md'
                    }
                ]
            }
        ]
    };
}
