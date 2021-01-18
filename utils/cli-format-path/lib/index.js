"use strict";

const path = require("path");

function cliFormatPath(p) {
  if (typeof p === "string") {
    if (path.sep === "/") {
      return p;
    } else if (path.sep === "\\") {
      return p.replace(/\\/g, "/");
    }
  }
  return null;
}

module.exports = cliFormatPath;
