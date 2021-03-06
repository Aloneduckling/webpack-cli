import fs from 'fs';
import path from 'path';
import Generator from 'yeoman-generator';
import { generatorCopy, generatorCopyTpl } from './utils/copy-utils';

import { utils } from 'webpack-cli';

const { logger, getPackageManager } = utils;

/**
 * Creates a Yeoman Generator that generates a project conforming
 * to webpack-defaults.
 *
 * @param {Generator.Questions} prompts An array of Yeoman prompt objects
 *
 * @param {string} templateDir Absolute path to template directory
 *
 * @param {string[]} copyFiles An array of file paths (relative to `./templates`)
 * of files to be copied to the generated project. File paths should be of the
 * form `path/to/file.js.tpl`.
 *
 * @param {string[]} copyTemplateFiles An array of file paths (relative to
 * `./templates`) of files to be copied to the generated project. Template
 * file paths should be of the form `path/to/_file.js.tpl`.
 *
 * @param {Function} templateFn A function that is passed a generator instance and
 * returns an object containing data to be supplied to the template files.
 *
 * @returns {Generator} A class extending Generator
 */
const addonGenerator = (
    prompts: Generator.Questions,
    templateDir: string,
    copyFiles: string[],
    copyTemplateFiles: string[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    templateFn: (instance: any) => Record<string, unknown>,
): Generator.GeneratorConstructor => {
    return class extends Generator {
        public props: Generator.Question;
        public copy: (value: string, index: number, array: string[]) => void;
        public copyTpl: (value: string, index: number, array: string[]) => void;

        public prompting(): Promise<void> {
            return this.prompt(prompts).then((props: Generator.Question): void => {
                this.props = props;
            });
        }

        public default(): void {
            const currentDirName = path.basename(this.destinationPath());
            if (currentDirName !== this.props.name) {
                this.log(`
				Your project must be inside a folder named ${this.props.name}
				I will create this folder for you.
                `);
                const pathToProjectDir: string = this.destinationPath(this.props.name);
                try {
                    fs.mkdirSync(pathToProjectDir, { recursive: true });
                } catch (error) {
                    logger.error('Failed to create directory');
                    logger.error(error);
                }
                this.destinationRoot(pathToProjectDir);
            }
        }

        public writing(): void {
            const packageJsonTemplatePath = '../addon-template/package.json.js';
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            this.fs.extendJSON(this.destinationPath('package.json'), require(packageJsonTemplatePath)(this.props.name));

            this.copy = generatorCopy(this, templateDir);
            this.copyTpl = generatorCopyTpl(this, templateDir, templateFn(this));

            copyFiles.forEach(this.copy);
            copyTemplateFiles.forEach(this.copyTpl);
        }

        public install(): void {
            const packager = getPackageManager();
            const opts: {
                dev?: boolean;
                'save-dev'?: boolean;
            } = packager === 'yarn' ? { dev: true } : { 'save-dev': true };

            this.scheduleInstallTask(packager, ['webpack-defaults', 'bluebird'], opts);
        }
    };
};

export default addonGenerator;
