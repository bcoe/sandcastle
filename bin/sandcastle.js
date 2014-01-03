#!/usr/bin/env node

var sandcastle = require('../lib'),
  argv = require('optimist').argv,
  mode = argv._.shift();

switch (mode) {
  case 'sandbox':
    (new sandcastle.Sandbox({
        socket: (argv.socket || '/tmp/sandcastle.sock')
    })).start();
    break;
  default:
    console.log('Usage sandcastle <command>\n\n\
      \t<sandbox>\tstart a sandbox server\n\
      \t\t--socket=[path to socket file]\n\
    ')
}