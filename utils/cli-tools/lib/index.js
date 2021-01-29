'use strict';
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
  spinner.start();
  return spanner;
}

module.exports = {
  isObject,
  sleep,
  startSpinner,
};
