"use strict";

const log = require("@xdjx/cli-log");
const Command = require("@xdjx/cli-command");

class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0];
    this.force = !!this._cmd.force;
    log.verbose("init[projectName]:\t", this.projectName);
    log.verbose("init[force]:\t", this.force);
  }

  exec() {
    log.verbose("开始执行init命令逻辑...");
  }
}

function init(...args) {
  return new InitCommand(...args);
}

module.exports = init;
module.exports.InitCommand = InitCommand;
