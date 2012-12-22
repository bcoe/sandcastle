#!/usr/bin/env node

var sandcastle = require('../lib'),
  argv = require('optimist').argv,
  mode = argv._.shift();

switch (mode) {
  case 'sandbox':
    var sandbox = new sandcastle.Sandbox({

    });
    sandbox.start();
    break;
  default:
    console.log('Usage sandcastle <command>\n\n')
}