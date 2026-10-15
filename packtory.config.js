// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');
const licensePath = path.join(projectFolder, 'LICENSE');
const readmePath = path.join(projectFolder, 'README.md');

/**
 * @returns {Promise<import('@packtory/cli').PacktoryConfiguration>}
 */
export async function buildConfiguration() {
    const packageJsonContent = await fs.readFile('./package.json', { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);

    return {
        registrySettings: {
            authentication: {
                publish: { type: 'npm-open-identity-connect', provider: 'automatic' },
                metadata: 'automatic'
            }
        },
        checks: {
            typeScriptIntegrity: { enabled: true, declarations: 'all' },
            noDuplicatedFiles: { enabled: true },
            requiredFiles: { enabled: true, files: [ 'LICENSE', 'README.md' ] },
            maximumBundleSize: { enabled: true, bytes: 100_000 },
            noUnusedBundleDependencies: { enabled: true },
            noDevelopmentDependencyImports: { enabled: true },
            uniqueTargetPaths: { enabled: true },
            noUnexposedExecutables: { enabled: true },
            nodeEngineCompatibility: { enabled: true },
            noSideEffects: { enabled: true }
        },
        commonPackageSettings: {
            sourcesFolder,
            mainPackageManifest: packageJson,
            deadCodeElimination: { enabled: true, pureConstructors: [ 'Set' ] },
            includeSourceMapFiles: true,
            publishSettings: {
                access: 'public',
                provenance: { type: 'automatic' }
            },
            additionalFiles: [
                {
                    inputFilePath: licensePath,
                    targetFilePath: 'LICENSE'
                }
            ],
            additionalPackageManifestAttributes: {
                repository: packageJson.repository,
                license: packageJson.license,
                engines: packageJson.engines
            }
        },
        packages: [
            {
                name: '@enormora/objectory',
                exportPackageManifest: true,
                roots: {
                    main: {
                        javaScript: 'main.js',
                        declarationFile: 'main.d.ts'
                    }
                },
                additionalPackageManifestAttributes: {
                    description: 'A library for defining JavaScript objects for testing',
                    keywords: [ 'factory', 'factories', 'test', 'testing', 'test data' ]
                },
                additionalFiles: [
                    {
                        inputFilePath: readmePath,
                        targetFilePath: 'README.md'
                    }
                ]
            }
        ]
    };
}
