"use strict";

const semver = require("semver");
const colors = require("colors/safe");
const dedent = require("dedent");

const log = require("@xdjx/cli-log");
const { isObject } = require("@xdjx/cli-tools");

const LOWEST_NODE_VERSION = "12.0.0";

class Command {
  constructor(cmd) {
    // 检查参数
    if (!cmd) {
      throw new Error("Command 构造函数参数不能为空！");
    }
    if (!isObject(cmd)) {
      throw new Error("Command 构造函数参数必须为对象！");
    }

    this._cmd = cmd;

    // 执行初始化逻辑
    let runner = new Promise(() => {
      const chain = Promise.resolve();
      chain
        .then(() => this.checkNodeVersion()) // 检查node版本
        .then(() => this.initArgs()) // 初始化参数
        .then(() => this.init()) // 用户初始化逻辑
        .then(() => this.exec()) // 用户执行逻辑
        .catch((e) => {
          log.error(colors.red(e.message));
          if (process.env.LOG_LEVEL === "verbose") {
            console.log(e);
          }
        });
    });
  }

  init() {
    throw new Error("子类必须实现init");
  }

  exec() {
    throw new Error("子类必须实现exec");
  }

  /**
   * 检查node版本
   */
  checkNodeVersion() {
    const localVersion = process.version;
    const lowestVersion = LOWEST_NODE_VERSION;
    if (semver.gt(lowestVersion, localVersion)) {
      throw new Error(
        `本地node版本过低，请升级node版本后使用，最低支持版本为 v${lowestVersion}`
      );
    }
  }

  /**
   * 初始化传入参数
   */
  initArgs() {
    this._argv = this._cmd.args;
  }
}

module.exports = Command;
