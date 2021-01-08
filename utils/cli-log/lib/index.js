"use strict";
const npmlog = require("npmlog");

module.exports = npmlog;

npmlog.addLevel("danger", 3001, { fg: "red" });
