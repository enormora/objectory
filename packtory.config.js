// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');
const licensePath = path.join(projectFolder, 'LICENSE');
const readmePath = path.join(projectFolder, 'README.md');

/** @returns {Promise<import('@packtory/cli').PacktoryConfig>} */
export async function buildConfig() {
    const packageJsonContent = await fs.readFile('./package.json', { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);

    return {
        registrySettings: {
            auth: {
                publish: { type: 'npm-oidc', provider: 'auto' },
                metadata: 'auto'
            }
        },
        checks: {
            areTheTypesWrong: { enabled: true },
            noDuplicatedFiles: { enabled: true },
            requiredFiles: { enabled: true, files: [ 'LICENSE', 'README.md' ] },
            maxBundleSize: { enabled: true, bytes: 100_000 },
            noUnusedBundleDependencies: { enabled: true },
            noDevDependencyImports: { enabled: true },
            uniqueTargetPaths: { enabled: true }
        },
        commonPackageSettings: {
            sourcesFolder,
            mainPackageJson: packageJson,
            includeSourceMapFiles: true,
            publishSettings: {
                access: 'public',
                provenance: { type: 'auto' }
            },
            additionalFiles: [
                {
                    sourceFilePath: licensePath,
                    targetFilePath: 'LICENSE'
                }
            ],
            additionalPackageJsonAttributes: {
                repository: packageJson.repository,
                license: packageJson.license,
                engines: packageJson.engines
            }
        },
        packages: [
            {
                name: '@enormora/objectory',
                exportPackageJson: true,
                roots: {
                    main: {
                        js: 'main.js',
                        declarationFile: 'main.d.ts'
                    }
                },
                additionalPackageJsonAttributes: {
                    description: 'A library for defining JavaScript objects for testing',
                    keywords: [ 'factory', 'factories', 'test', 'testing', 'test data' ]
                },
                additionalFiles: [
                    {
                        sourceFilePath: readmePath,
                        targetFilePath: 'README.md'
                    }
                ]
            }
        ]
    };
}
