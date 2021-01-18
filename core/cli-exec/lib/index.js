"use strict";

const Package = require("@xdjx/cli-package");
const log = require("@xdjx/cli-log");

const SETTINS = {
  init: "@xdjx/cli-init",
};

function cliExec(...args) {
  const cmdObj = args[args.length - 1];

  let targetPath = process.env.CLI_TARGET_PATH;
  const pkgName = SETTINS[cmdObj.name()];
  const pkgVersion = "latest";

  if (!targetPath) {
    targetPath = "";
  }

  const pkg = new Package({
    targetPath,
    pkgName,
    pkgVersion,
  });

  const rootPath = pkg.getRootFilePath();

  log.verbose("入口文件目录", rootPath);
}

module.exports = cliExec;
