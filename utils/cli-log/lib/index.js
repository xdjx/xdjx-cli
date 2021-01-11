"use strict";
const npmlog = require("npmlog");

module.exports = npmlog;

npmlog.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : "info";

npmlog.heading = "🚀XDJX";
npmlog.headingStyle = { bold: true };
