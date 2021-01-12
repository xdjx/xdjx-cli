#!/usr/bin/env node

const importLocal = require("import-local");

if (importLocal(__filename)) {
  require("@xdjx/cli-log").notice("正在使用 XDJX-CLI 本地版本");
} else {
  require("../lib")(process.argv.slice(2));
}
