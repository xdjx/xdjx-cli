"use strict";

const fs = require("fs");

const inquirer = require("inquirer");
const fse = require("fs-extra");
const semver = require("semver");

const log = require("@xdjx/cli-log");
const Command = require("@xdjx/cli-command");

const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0];
    this.force = !!this._cmd.force;
    log.verbose("init[projectName]:\t", this.projectName);
    log.verbose("init[force]:\t", this.force);
  }

  async exec() {
    // 1. 准备阶段
    const projectInfo = await this.prepare();
    if (projectInfo) {
      console.log(projectInfo);
      // 3. 下载模板
      // 4. 安装模板
    }
  }

  async prepare() {
    // 1. 判断当前目录是否为空
    const curDir = process.cwd();
    if (!this.isDirEmpty(curDir)) {
      let isContinue = false;
      if (!this.force) {
        isContinue = (
          await inquirer.prompt({
            type: "confirm",
            name: "isContinue",
            message: "当前目录不为空, 是否继续创建项目",
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
          type: "confirm",
          name: "canEmptyDir",
          message: "是否确认清空当前目录",
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
    return await this.getProjectInfo();
  }

  async getProjectInfo() {
    const projectInfo = {};
    const o = await inquirer.prompt([
      {
        type: "list",
        name: "type",
        message: "请选择项目类型",
        default: TYPE_PROJECT,
        choices: [
          {
            name: "普通项目",
            value: TYPE_PROJECT,
          },
          {
            name: "组件项目",
            value: TYPE_COMPONENT,
          },
        ],
      },
      {
        type: "input",
        name: "name",
        message: "请输入项目名",
        default: this.projectName,
        validate: function (value) {
          const reg = /^[a-zA-Z]+([_][a-zA-Z][a-zA-Z0-9]*|[-][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/;
          const done = this.async();
          setTimeout(() => {
            if (!reg.test(value)) {
              done("请输入合法的项目名称！");
              return;
            }
            done(null, true);
          }, 0);
        },
      },
      {
        type: "input",
        name: "version",
        message: "请输入项目版本号",
        default: "0.0.1",
        validate: function (value) {
          const done = this.async();
          setTimeout(() => {
            if (!!!semver.valid(value)) {
              done("请输入合法的版本号！");
              return;
            }
            done(null, true);
          }, 0);
        },
        filter: (value) => {
          const v = semver.valid(value);
          if (v) {
            return v;
          }
          return value;
        },
      },
    ]);

    return { ...projectInfo, ...o };
  }

  /**
   * 判断给出的目录下排除缓存和白名单文件后，此目录是否为空
   *
   * @param {string} dirPath 需要判断的目录
   */
  isDirEmpty(dirPath) {
    const whiteFileList = ["node_modules"];
    const fileList = fs
      .readdirSync(dirPath)
      .filter(
        (fsName) => !fsName.startsWith(".") && !whiteFileList.includes(fsName)
      );
    return !(fileList && fileList.length > 0);
  }
}

function init(...args) {
  return new InitCommand(...args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
