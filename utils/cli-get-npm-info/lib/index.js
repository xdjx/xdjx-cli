"use strict";

const axios = require("axios");
const urlJoin = require("url-join");
const semver = require("semver");

/**
 * 获取指定包名的 npm 信息
 * @param {string} pkgName 包名
 * @param {boolean} native [可选]是否使用原生npm地址, 默认使用淘宝镜像源
 */
async function getNpmInfo(pkgName, native) {
  const url = urlJoin(getRegistry(native), pkgName);
  return axios.get(url).then((res) => {
    return res.data;
  });
}

/**
 * 获取镜像源地址
 * @param {boolean} native [可选]是否使用原生npm地址, 默认使用淘宝镜像源
 */
function getRegistry(native) {
  return native
    ? "https://registry.npmjs.org"
    : "https://registry.npm.taobao.org/";
}

/**
 * 获取当前包所有版本号列表
 * @param {string} pkgName 包名
 * @param {boolean} native [可选]是否使用原生npm地址, 默认使用淘宝镜像源
 */
async function getPkgVersions(pkgName, native) {
  const data = await getNpmInfo(pkgName, native);
  let versions = [];
  if (data) {
    versions = Object.keys(data.versions);
  }
  versions.sort((a, b) => (semver.gt(b, a) ? 1 : -1));
  return versions;
}

/**
 * 获取大于当前版本号的所有版本号列表
 * @param {string} pkgName 包名
 * @param {string} baseVersion 当前版本号
 * @param {boolean} native [可选]是否使用原生npm地址, 默认使用淘宝镜像源
 */
async function getGTVersions(pkgName, baseVersion, native) {
  const versionList = await getPkgVersions(pkgName, native);
  return versionList.filter((version) => semver.gte(version, baseVersion));
}

/**
 * 获取最新版本号
 * @param {string} pkgName 包名
 * @param {string} baseVersion 当前版本号
 * @param {boolean} native [可选]是否使用原生npm地址, 默认使用淘宝镜像源
 */
async function getLastestVersion(pkgName, baseVersion, native) {
  const versions = await getGTVersions(pkgName, baseVersion, native);
  return versions[0];
}

async function getNewVersion(pkgName) {
  const versions = await getPkgVersions(pkgName);
  return versions[0];
}

module.exports = {
  getNpmInfo,
  getPkgVersions,
  getGTVersions,
  getLastestVersion,
  getNewVersion,
  getRegistry,
};
