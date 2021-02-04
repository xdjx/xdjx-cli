'use strict';

const path = require('path');

const pkgDir = require('pkg-dir').sync;
const pathExists = require('path-exists').sync;
const npmInstall = require('npminstall');
const fsExtra = require('fs-extra');

const { isObject } = require('@xdjx/cli-tools');
const formatPath = require('@xdjx/cli-format-path');
const log = require('@xdjx/cli-log');
const { getRegistry, getNewVersion } = require('@xdjx/cli-get-npm-info');

class Package {
  constructor(options) {
    if (!options) {
      throw new Error('Package类options参数不能为空！');
    }
    if (!isObject(options)) {
      throw new Error('Package类options参数必须为对象！');
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
    // 缓存包文件夹前缀
    this.cacheFilePrefix = `_${this.pkgName.replace('/', '_')}@`;
    // 缓存包文件夹后缀
    this.cacheFileSuffix = `@${this.pkgName.split('/')[0]}`;
  }

  get cacheFilePath() {
    const targetPath = this.getCustomVerCachePath(this.pkgVersion);

    const nameList = this.pkgName.split('/');
    if (nameList.length > 1) {
      return path.resolve(targetPath, nameList[1]);
    }

    return targetPath;
  }

  getCustomVerCachePath(version) {
    const fileName = `${this.cacheFilePrefix}${version}${this.cacheFileSuffix}`;
    return path.resolve(this.storePath, fileName);
  }

  async prepareVersion() {
    // 1. 生成缓存目录
    if (this.storePath && !pathExists(this.storePath)) {
      fsExtra.mkdirpSync(this.storePath);
    }
    // 2.检查 pkgVersion
    if (this.pkgVersion === 'latest') {
      this.pkgVersion = await getNewVersion(this.pkgName);
    }
  }

  /**
   * 判断当前Package是否存在
   */
  async exists() {
    await this.prepareVersion();
    if (this.storePath) {
      log.verbose('检查缓存包路径: ', this.cacheFilePath);
      return pathExists(this.cacheFilePath);
    } else if (this.targetPath) {
      return pathExists(this.targetPath);
    }
    return false;
  }

  /**
   * 安装Package
   */
  async install() {
    await this.prepareVersion();
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
  async update() {
    await this.prepareVersion();
    // 1. 获取最新版本号
    const latestVersion = await getNewVersion(this.pkgName);
    // 2. 查询最新版本号对应的路径是否存在
    const newVersionCachePath = this.getCustomVerCachePath(latestVersion);
    // 3. 如果不存在则安装并更新
    if (!pathExists(newVersionCachePath)) {
      log.verbose(`正在更新${this.pkgName}...`);
      await npmInstall({
        root: this.targetPath,
        storeDir: this.storePath,
        registry: getRegistry(),
        pkgs: [{ name: this.pkgName, version: latestVersion }],
      });
      log.verbose(`${this.pkgName}更新完成(๑•̀ㅂ•́)و✧`);
    }
    this.pkgVersion = latestVersion;
    log.verbose(`${this.pkgName}当前已经是最新版本${this.pkgVersion}`);
  }

  /**
   * 获取入口文件的路径
   */
  getRootFilePath() {
    function _getRootFilePath(targetPath) {
      // 1. 获取package.json根目录
      const pkgRootPath = pkgDir(targetPath);
      if (pkgRootPath) {
        // 2. 拿到package.json地址
        const pkgPath = path.resolve(pkgRootPath, 'package.json');
        // 3. 读取package.json
        const pkg = require(pkgPath);

        if (pkg && pkg.main) {
          return formatPath(path.resolve(pkgRootPath, pkg.main));
        }
      }
      return null;
    }

    if (this.storePath) {
      // const nameList = this.pkgName.split('/');
      // if (nameList.length > 1) {
      //   return _getRootFilePath(path.resolve(this.cacheFilePath, nameList[1]));
      // }
      return _getRootFilePath(this.cacheFilePath);
    } else if (this.targetPath) {
      return _getRootFilePath(this.targetPath);
    }
    return null;
  }
}

module.exports = Package;
