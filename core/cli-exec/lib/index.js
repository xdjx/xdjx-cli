"use strict";

const path = require("path");
const cp = require("child_process");

const colors = require("colors/safe");

const Package = require("@xdjx/cli-package");
const log = require("@xdjx/cli-log");

const SETTINS = {
  init: "@xdjx/cli-utils",
};
const DEPEND_PATH = "dependencies";

async function cliExec(...args) {
  if (args.length < 1) {
    throw new Error("参数不能为空！");
  }
  const cmdObj = args[args.length - 1];

  let targetPath = process.env.CLI_TARGET_PATH;
  const homePath = process.env.CLI_HOME_PATH;
  let storePath = "";
  let pkg = "";
  const pkgName = SETTINS[cmdObj.name()];
  const pkgVersion = "latest";

  // 如果指定了目标路径，直接执行目标路径下的入口文件
  if (targetPath) {
    pkg = new Package({
      targetPath,
      pkgName,
      pkgVersion,
    });
  } else {
    // 如果没有指定目标路径，那么读取缓存路径，更新或安装对应模块使用
    targetPath = path.resolve(homePath, DEPEND_PATH);
    storePath = path.resolve(targetPath, "node_modules");
    pkg = new Package({
      targetPath,
      storePath,
      pkgName,
      pkgVersion,
    });

    // 判断是否存在，如果存在则执行更新逻辑，不存在则执行安装逻辑
    if (await pkg.exists()) {
      log.verbose("cliExec", "当前执行的命令依赖包已存在，执行更新流程...");
      await pkg.update();
    } else {
      log.verbose("cliExec", "当前执行的命令依赖包不存在，执行安装流程...");
      log.verbose("cliExec", `包缓存缓存路径：${storePath}`);
      await pkg.install();
    }
  }

  // 获取入口文件路径
  const indexPath = pkg.getRootFilePath();
  log.verbose("入口文件路径：", indexPath);
  // 如果存在入口文件则直接传入参数并执行
  if (indexPath) {
    try {
      // 过滤有效参数
      const cmd = Object.create(null);
      Object.keys(cmdObj).forEach((key) => {
        if (
          !key.startsWith("_") &&
          key !== "parent" &&
          cmdObj.hasOwnProperty(key)
        ) {
          cmd[key] = cmdObj[key];
        }
      });

      // 拼装执行代码
      const code = `require('${indexPath}')(${JSON.stringify(cmd)})`;
      // 开启新进程执行代码
      const child = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      child.on("error", (err) => {
        log.error(colors.red(err.message));
        process.exit(1);
      });
      child.on("exit", (code) => {
        log.verbose("命令执行成功：", code);
        process.exit(0);
      });
    } catch (e) {
      log.error(colors.red(e.message));
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(e);
      }
    }
  } else {
    throw new Error("入口文件路径貌似不对，该路径下没有需要的入口文件。");
  }
}

function spawn(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;

  return cp.spawn(cmd, cmdArgs, options || {});
}

module.exports = cliExec;
