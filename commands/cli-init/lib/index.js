"use strict";

const log = require("@xdjx/cli-log");

module.exports = init;

function init(projectName, { force }) {
  log.info("init", projectName, force, process.env.CLI_TARGET_PATH);
}
