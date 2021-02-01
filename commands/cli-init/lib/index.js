'use strict';

const fs = require('fs');
const path = require('path');

const inquirer = require('inquirer');
const fse = require('fs-extra');
const semver = require('semver');

const log = require('@xdjx/cli-log');
const Command = require('@xdjx/cli-command');
const Package = require('@xdjx/cli-package');
const { startSpinner } = require('@xdjx/cli-tools');

const { requestTemplateList } = require('../api/template');

const TYPE_PROJECT = 'project';
const TYPE_COMPONENT = 'component';

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0];
    this.force = !!this._cmd.force;
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
    log.verbose(
      'templateList',
      this.templateList.map(o => o.value.pkgName)
    );
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
          // 清空当前目录，继续安装流程
          fse.emptyDirSync(curDir);
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
    const o = await inquirer.prompt([
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
            name: '组件项目',
            value: TYPE_COMPONENT,
          },
        ],
      },
      {
        type: 'input',
        name: 'name',
        message: '请输入项目名',
        default: this.projectName,
        validate: function (value) {
          const reg = /^[a-zA-Z]+([_][a-zA-Z][a-zA-Z0-9]*|[-][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/;
          const done = this.async();
          setTimeout(() => {
            if (!reg.test(value)) {
              done('请输入合法的项目名称！');
              return;
            }
            done(null, true);
          }, 0);
        },
      },
      {
        type: 'input',
        name: 'version',
        message: '请输入项目版本号',
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
        type: 'list',
        name: 'templateInfo',
        message: '请选择项目模板',
        choices: this.templateList,
      },
    ]);

    return { ...projectInfo, ...o };
  }

  /**
   * 读取远程模板列表信息
   */
  async getTemplateList() {
    const list = await requestTemplateList();
    const formatList = list.map(o => {
      return {
        name: `${o.name}(v${o.version})`,
        value: {
          pkgName: o.pkg_name,
          version: o.version,
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
    const templatePkg = new Package({
      targetPath,
      storePath,
      pkgName,
      pkgVersion: version,
    });
    if (await templatePkg.exists()) {
      const spinner = startSpinner('模板已存在，正在更新，请稍后...');
      try {
        await templatePkg.update();
        log.info('', '模板更新成功🎇');
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
      }
    } else {
      const spinner = startSpinner('正在下载模板，请稍后...');
      try {
        await templatePkg.install();
        log.info('', '模板下载成功🎇');
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
      }
    }
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
