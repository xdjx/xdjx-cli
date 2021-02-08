'use strict';

const fs = require('fs');
const path = require('path');

const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');
const kebabCase = require('kebab-case');
const glob = require('glob');
const { renderFile } = require('ejs');

const log = require('@xdjx/cli-log');
const Command = require('@xdjx/cli-command');
const Package = require('@xdjx/cli-package');
const { startSpinner, spawnAsync } = require('@xdjx/cli-tools');

const { requestTemplateList } = require('../api/template');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

const TEMPLATE_TYPE_NORMAL = 'normal';
const TEMPLATE_TYPE_CUSTOM = 'custom';

const WHITE_CMD = ['npm', 'cnpm', 'yarn'];

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0];
    this.force = !!this._cmd.force;
    this.typeName = '项目';
    log.verbose('init[projectName]:\t', this.projectName);
    log.verbose('init[force]:\t', this.force);
  }

  async exec() {
    try {
      // 1. 准备阶段
      await this.prepare();
      log.verbose('projectInfo', this.projectInfo);

      if (this.templateList && this.projectInfo) {
        // 3. 下载模板
        await this.downloadTemplate();
        // 4. 安装模板
        await this.installTemplate();
      }
    } catch (error) {
      log.error(error.message);
    }
  }

  /**
   * 准备阶段
   *
   * 1. 获取模板信息
   * 2. 获取用户输入信息
   */
  async prepare() {
    // 1. 查询模板列表
    this.templateList = await this.getTemplateList();
    log.verbose('templateList', this.templateList);
    if (!this.templateList || this.templateList.length <= 0) {
      throw new Error('模板信息获取失败！');
    }

    // 2. 判断当前目录是否为空
    const curDir = process.cwd();
    if (!this.isDirEmpty(curDir)) {
      let isContinue = false;
      if (!this.force) {
        isContinue = (
          await inquirer.prompt({
            type: 'confirm',
            name: 'isContinue',
            message: '当前目录不为空, 是否继续创建项目',
            default: false,
          })
        ).isContinue;
        if (!isContinue) {
          // 如果不继续创建项目则结束流程
          return;
        }
      }

      if (isContinue || this.force) {
        // 如果继续则提示是否清空当前目录
        const { canEmptyDir } = await inquirer.prompt({
          type: 'confirm',
          name: 'canEmptyDir',
          message: '是否确认清空当前目录',
          default: false,
        });
        if (canEmptyDir) {
          const spinner = startSpinner('正在清空当前目录...');
          // 清空当前目录，继续安装流程
          await fse.emptyDir(curDir);
          spinner.stop(true);
        } else if (!this.force) {
          // 如果没有强制安装则结束流程
          return;
        }
      }
    }
    this.projectInfo = await this.getProjectInfo();
  }

  /**
   * 获取项目初始化基本信息
   */
  async getProjectInfo() {
    const projectInfo = {};

    // 通过tag和项目类型匹配过滤无用模板
    const { type: proType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'type',
        message: '请选择项目类型',
        default: TYPE_PROJECT,
        choices: [
          {
            name: '普通项目',
            value: TYPE_PROJECT,
          },
          {
            name: '组件库项目',
            value: TYPE_COMPONENT,
          },
        ],
      },
    ]);
    if (proType === TYPE_COMPONENT) {
      this.typeName = '组件库';
    }
    this.templateList = this.templateList.filter(({ value }) =>
      value.tag.includes(proType)
    );

    // 收集项目基本信息
    const o = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: `请输入${this.typeName}名`,
        default: this.projectName,
        validate: function (value) {
          const reg = /^[a-zA-Z]+([_][a-zA-Z][a-zA-Z0-9]*|[-][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/;
          const done = this.async();
          setTimeout(() => {
            if (!reg.test(value)) {
              done(`请输入合法的${this.typeName}名称！`);
              return;
            }
            done(null, true);
          }, 0);
        },
      },
      {
        type: 'input',
        name: 'version',
        message: `请输入${this.typeName}版本号`,
        default: '0.0.1',
        validate: function (value) {
          const done = this.async();
          setTimeout(() => {
            if (!!!semver.valid(value)) {
              done('请输入合法的版本号！');
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: value => {
          const v = semver.valid(value);
          if (v) {
            return v;
          }
          return value;
        },
      },
      {
        type: 'input',
        name: 'description',
        message: `请输入${this.typeName}描述`,
        validate: function (value) {
          const done = this.async();
          setTimeout(() => {
            if (!value) {
              done(`${this.typeName}描述不能为空！`);
              return;
            }
            done(null, true);
          }, 0);
        },
      },
      {
        type: 'list',
        name: 'templateInfo',
        message: `请选择${this.typeName}模板`,
        choices: this.templateList,
      },
    ]);
    projectInfo.lowerCaseName = kebabCase(o.name).replace(/^-/, '');
    return { ...projectInfo, ...o };
  }

  /**
   * 读取远程模板列表信息
   */
  async getTemplateList() {
    const list = await requestTemplateList();
    const formatList = list.map(o => {
      const {
        pkg_name: pkgName,
        version,
        type = TEMPLATE_TYPE_NORMAL,
        install_command: installCommand,
        run_command: runCommand,
        tag,
        white_list: whiteList,
      } = o;
      return {
        name: `${o.name}(v${o.version})`,
        value: {
          pkgName,
          version,
          type,
          installCommand,
          runCommand,
          tag,
          whiteList,
        },
      };
    });
    return formatList;
  }

  /**
   * 下载用户选择的模板
   */
  async downloadTemplate() {
    const { pkgName, version } = this.projectInfo.templateInfo;
    const targetPath = path.resolve(process.env.CLI_HOME_PATH, 'template');
    const storePath = path.resolve(targetPath, 'node_modules');
    this.templatePkg = new Package({
      targetPath,
      storePath,
      pkgName,
      pkgVersion: version,
    });
    if (await this.templatePkg.exists()) {
      const spinner = startSpinner('模板已存在，正在更新，请稍后...');
      try {
        await this.templatePkg.update();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        if (this.projectInfo.templateInfo) {
          log.info('', '模板更新成功🎇');
        }
      }
    } else {
      const spinner = startSpinner('正在下载模板，请稍后...');
      try {
        await this.templatePkg.install();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        if (this.projectInfo.templateInfo) {
          log.info('', '模板下载成功🎇');
        }
      }
    }
  }

  /**
   * 安装模板
   */
  async installTemplate() {
    const { templateInfo } = this.projectInfo;
    if (!templateInfo) {
      throw new Error('当前模板信息丢失！');
    }
    if (
      templateInfo.type !== TEMPLATE_TYPE_CUSTOM &&
      templateInfo.type !== TEMPLATE_TYPE_NORMAL
    ) {
      throw new Error(`无法识别的模板类型！{type="${templateInfo.type}"}`);
    }

    if (templateInfo.type === TEMPLATE_TYPE_NORMAL) {
      await this.normalInstall();
    } else if (templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
      await this.customInstall();
    }
  }

  async normalInstall() {
    const spinner = startSpinner('正在安装模板，请稍后...');
    let err = null;
    try {
      // 拿到模板和目标目录
      const templatePath = path.resolve(
        this.templatePkg.cacheFilePath,
        'template'
      );
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.ensureDirSync(targetPath);

      // 复制模板
      fse.copySync(templatePath, targetPath);

      const { whiteList = [] } = this.projectInfo.templateInfo;
      // 渲染模板
      const ignore = ['**/node_modules/**', ...whiteList];
      await this.renderTemplate({ ignore });
    } catch (error) {
      err = error;
      throw error;
    } finally {
      spinner.stop(true);
      if (!err) {
        log.info('', '模板安装完成🎇');
      }
    }

    // 安装依赖并运行
    await this.installDependencyAndRun();
  }

  async customInstall() {
    const templateIndexPath = this.templatePkg.getRootFilePath();
    if (!fs.existsSync(templateIndexPath)) {
      throw new Error('找不到自定义模板入口文件！');
    }
    const options = {
      ...this.projectInfo,
      sourcePath: path.resolve(this.templatePkg.cacheFilePath, 'template'),
      targetPath: process.cwd(),
    };
    const code = `require('${templateIndexPath}')(${JSON.stringify(options)})`;
    log.notice('', '执行自定义模板安装逻辑...');
    await spawnAsync('node', ['-e', code]);
    log.info('', '自定义模板安装完毕🎇');

  }

  async renderTemplate(options) {
    const cwd = process.cwd();
    const ignore = ['**/*.png', ...options.ignore];
    const golbOption = {
      cwd,
      ignore,
      nodir: true,
    };
    return new Promise((resolve, reject) => {
      // 过滤文件
      glob('**', golbOption, async (err, matches) => {
        err && reject(err);
        await Promise.all(
          matches.map(matchePath => {
            return new Promise((rs, rj) => {
              // 渲染文件内容
              renderFile(matchePath, this.projectInfo, {}, (err, str) => {
                if (err) {
                  rj(err);
                }
                // 将新内容写入当前文件
                fse.writeFileSync(matchePath, str);
                rs();
              });
            });
          })
        );
        resolve();
      });
    });
  }

  async installDependencyAndRun() {
    const { installCommand, runCommand } = this.projectInfo.templateInfo;
    // 安装依赖
    await this.execCommand(installCommand, '安装依赖...', '依赖安装失败！');
    // 启动项目
    await this.execCommand(runCommand, '启动项目...');
  }

  // 运行命令
  async execCommand(cmdStr, msg, errMsg) {
    let runRes;
    if (cmdStr) {
      msg && log.info('', msg);
      const cmdList = cmdStr.split(' ');
      const cmd = this.checkCmd(cmdList[0]);
      if (!cmd) {
        throw new Error(`无效的命令，命令: ${cmdStr}`);
      }
      const args = cmdList.slice(1);
      runRes = await spawnAsync(cmd, args);
    }
    if (runRes !== 0) throw new Error(errMsg);
    return runRes;
  }

  checkCmd(cmd) {
    if (WHITE_CMD.includes(cmd)) {
      return cmd;
    }
    return null;
  }

  /**
   * 判断给出的目录下排除缓存和白名单文件后，此目录是否为空
   *
   * @param {string} dirPath 需要判断的目录
   */
  isDirEmpty(dirPath) {
    const whiteFileList = ['node_modules'];
    const fileList = fs
      .readdirSync(dirPath)
      .filter(
        fsName => !fsName.startsWith('.') && !whiteFileList.includes(fsName)
      );
    return !(fileList && fileList.length > 0);
  }
}

function init(...args) {
  return new InitCommand(...args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
