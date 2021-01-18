"use strict";

const path = require("path");

const semver = require("semver");
const colors = require("colors/safe");
const userHome = require("user-home");
const rootCheck = require("root-check");
const pathExists = require("path-exists").sync;
const dotenv = require("dotenv");
const dedent = require("dedent");
const commander = require("commander");

const init = require("@xdjx/cli-init");
const log = require("@xdjx/cli-log");
const exec = require("@xdjx/cli-exec");
const { getLastestVersion, getPkgVersions } = require("@xdjx/cli-get-npm-info");
const pkg = require("../package.json");
const constant = require("../lib/const");

module.exports = cli;

const program = new commander.Command();

async function cli(argv) {
  try {
    await prepare();
    registerCommands();
  } catch (e) {
    log.error(colors.red(e.message));
    if (program.debug) {
      console.log(e);
    }
  }
}

async function prepare() {
  checkPkgVersion();
  checkNodeVersion();
  checkRoot();
  checkUserHome();
  checkEnv();
  await checkGolbalUpdate();
}

function registerCommands() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启debug模式", false)
    .option("-tp, --targetPath <targetPath>", "是否指定本地调试文件路径", "");

  program
    .command("init [projectName]")
    .description("初始化项目")
    .option("-f --force", "是否覆盖原有目录文件，强制初始化项目")
    .action(exec);

  program.on("option:debug", () => {
    process.env.LOG_LEVEL = "verbose";
    log.level = process.env.LOG_LEVEL;
  });

  program.on("option:targetPath", () => {
    process.env.CLI_TARGET_PATH = program.targetPath;
  });

  program.on("command:*", (commands) => {
    const availableCommands = program.commands.map((command) => command.name());
    log.error(colors.red(`未知的命令: ${commands[0]}`));
    if (availableCommands.length > 0) {
      log.info("可用命令", availableCommands.join(","));
    }
  });

  program.parse(process.argv);

  if (process.argv.length < 3) {
    program.outputHelp();
    console.log();
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
