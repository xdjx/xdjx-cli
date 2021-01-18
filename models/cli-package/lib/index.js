"use strict";

const path = require("path");

const pkgDir = require("pkg-dir").sync;
const npmInstall = require("npminstall");

const { isObject } = require("@xdjx/cli-tools");
const formatPath = require("@xdjx/cli-format-path");
const log = require("@xdjx/cli-log");
const { getRegistry } = require("@xdjx/cli-get-npm-info");

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类options参数不能为空！");
    }
    if (!isObject(options)) {
      throw new Error("Package类options参数必须为对象！");
    }

    const { targetPath, storePath, pkgName, pkgVersion } = options;
    // pkg路径
    this.targetPath = targetPath;
    // pkg的node_modules缓存路径
    this.storePath = storePath;
    // pkg名
    this.pkgName = pkgName;
    // pkg版本
    this.pkgVersion = pkgVersion;
  }

  /**
   * 判断当前Package是否存在
   */
  exists() {}

  /**
   * 安装Package
   */
  install() {
    return npmInstall({
      root: this.targetPath,
      storeDir: this.storePath,
      registry: getRegistry(),
      pkgs: [{ name: this.pkgName, version: this.pkgVersion }],
    });
  }

  /**
   * 更新Package
   */
  update() {
    log.verbose("更新...");
  }

  /**
   * 获取入口文件的路径
   */
  getRootFilePath() {
    // 1. 获取package.json根目录
    const pkgRootPath = pkgDir(this.targetPath);
    if (pkgRootPath) {
      // 2. 拿到package.json地址
      const pkgPath = path.resolve(pkgRootPath, "package.json");
      // 3. 读取package.json
      const pkg = require(pkgPath);

      if (pkg && pkg.main) {
        return formatPath(path.resolve(pkgRootPath, pkg.main));
      }
    }

    return null;
  }
}

module.exports = Package;
