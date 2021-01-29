'use strict';

const request = require('@xdjx/cli-request');

function requestTemplateList() {
  return request.get('/xdjx-cli/template');
}

module.exports = {
  requestTemplateList,
};
