'use strict';
const cp = require('child_process');
const Spinner = require('cli-spinner').Spinner;

function isObject(o) {
  return Object.prototype.toString.call(o) === '[object Object]';
}

function sleep(time = 1000) {
  return new Promise(() => setTimeout(() => {}, time));
}

function startSpinner(msg = 'processing...', animation = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏') {
  const spinner = new Spinner(`%s ${msg}`);
  spinner.setSpinnerString(animation);
  return spinner.start();
}

function spawn(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;

  return cp.spawn(cmd, cmdArgs, options || {});
}

function spawnAsync(
  command,
  args,
  options = {
    cwd: process.cwd(),
    stdio: 'inherit',
  }
) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    child.on('exit', code => resolve(code));
    child.on('error', error => reject(error));
  });
}

module.exports = {
  isObject,
  sleep,
  startSpinner,
  spawnAsync,
};
