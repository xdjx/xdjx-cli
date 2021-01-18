"use strict";

const path = require("path");

const Package = require("@xdjx/cli-package");
const log = require("@xdjx/cli-log");

const SETTINS = {
  init: "@xdjx/cli-utils",
};
const DEPEND_PATH = "dependencies";

async function cliExec(...args) {
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
    const indexPath = pkg.getRootFilePath();

    // 如果存在入口文件则直接传入参数并执行
    if (indexPath) {
      require(indexPath)(...args);
    } else {
      throw new Error("指定的路径貌似不对，该路径下没有需要的入口文件。");
    }
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
    if (pkg.exists()) {
      log.verbose("cliExec", "当前执行的命令依赖包已存在，执行更新流程...");
      pkg.update();
    } else {
      log.verbose("cliExec", "当前执行的命令依赖包不存在，执行安装流程...");
      log.verbose("cliExec", `包缓存缓存路径：${storePath}`);
      await pkg.install();
    }
  }
}

module.exports = cliExec;
