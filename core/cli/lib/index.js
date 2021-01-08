"use strict";

const log = require("@xdjx/cli-log");

module.exports = cli;

function cli(argv) {
  log.danger('cli', '你好 执行完成了');
}
