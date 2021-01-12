"use strict";

const path = require("path");

const semver = require("semver");
const colors = require("colors/safe");
const userHome = require("user-home");
const rootCheck = require("root-check");
const pathExists = require("path-exists").sync;
const dotenv = require("dotenv");
const dedent = require("dedent");

const log = require("@xdjx/cli-log");
const { getLastestVersion, getPkgVersions } = require("@xdjx/cli-get-npm-info");
const pkg = require("../package.json");
const constant = require("../lib/const");
const minimist = require("minimist");

module.exports = cli;

async function cli(argv) {
  try {
    checkPkgVersion();
    checkNodeVersion();

    checkInputArgs();

    checkRoot();
    checkUserHome();
    checkEnv();
    await checkGolbalUpdate();
  } catch (e) {
    log.error(e.message);
  }
}

/**
 * 检查cli版本
 */
function checkPkgVersion() {
  log.notice("cli-当前版本", `${pkg.version}`);
}

/**
 * 检查node版本
 */
function checkNodeVersion() {
  const localVersion = process.version;
  const lowestVersion = constant.LOWEST_NODE_VERSION;
  if (semver.gt(lowestVersion, localVersion)) {
    throw new Error(
      colors.red(
        `本地node版本过低，请升级node版本后使用，最低支持版本为 v${lowestVersion}`
      )
    );
  }
}

/**
 * 降低文件权限
 */
function checkRoot() {
  rootCheck();
  log.verbose("当前系统权限\t", process.geteuid && process.geteuid());
}

/**
 * 检查用户主目录
 */
function checkUserHome() {
  if (userHome && pathExists(userHome)) {
    return;
  }
  throw new Error(colors.red("当前系统用户登陆异常，无法找到当前用户主目录！"));
}

/**
 * 检查入参
 *
 * 这边的目的主要是检查是否开启了debug模式
 */
function checkInputArgs() {
  const args = minimist(process.argv.slice(2));
  checkArgs(args);
}
function checkArgs(args) {
  if (args.debug) {
    process.env.LOG_LEVEL = "verbose";
  } else {
    process.env.LOG_LEVEL = "info";
  }

  log.level = process.env.LOG_LEVEL;
}

/**
 * 检查环境变量
 */
function checkEnv() {
  const envPath = path.resolve(userHome, ".xdjxenv");
  if (pathExists(envPath)) {
    const config = dotenv.config({ path: envPath });
    log.verbose("本地自定环境变量\t", config.parsed);
  }
  createDefaultConfig();
  log.verbose("读取到cliHome\t", process.env.CLI_HOME_PATH);
}
function createDefaultConfig() {
  let cliHome = "";
  if (process.env.CLI_HOME) {
    cliHome = path.join(userHome, process.env.CLI_HOME);
  } else {
    cliHome = path.join(userHome, constant.DEFAULT_CLI_HOME);
  }

  process.env.CLI_HOME_PATH = cliHome;
}

async function checkGolbalUpdate() {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const pkgName = pkg.name;
  // 2. 调用 npm api 获取所有版本号
  // 3. 提取所有版本号，比对那些版本号是大于当前版本号的
  const newVersion = await getLastestVersion(pkgName, currentVersion);
  log.verbose("最新版本号\t", newVersion);
  // 4. 给出最新的版本号，提示用户更新到最新版本
  if (newVersion) {
    if (semver.gt(newVersion, currentVersion)) {
      log.warn(
        "需要更新😘\t",
        dedent`当前版本 ${currentVersion} 已过时, 请更新到最新版本 ${newVersion}
        更新命令：npm install ${pkgName} -G`
      );
    }
  } else {
    const versions = await getPkgVersions(pkgName);
    log.warn(
      "版本号错误😘\t",
      dedent`当前版本 ${currentVersion} 有问题, 请重新安装本脚手架
      当前镜像源最新版本${versions[0]}, 原因可能是镜像源更新不及时
      请稍后重新安装更新最新脚手架版本
      安装命令：npm install ${pkgName} -G`
    );
  }
}
