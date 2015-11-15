#!/usr/bin/env node

var sandcastle = require('../lib'),
  yargs = require('yargs')
    .usage('Usage sandcastle <command>')
    .command('sandbox', 'start a sandbox server')
    .option('socket', {
      alias: 's',
      describe: 'path to socket file',
      default: '/tmp/sandcastle.sock'
    }),
  argv = yargs.argv,
  mode = argv._.shift();

switch (mode) {
  case 'sandbox':
    (new sandcastle.Sandbox({
        socket: argv.socket
    })).start();
    break;
  default:
    yargs.showHelp()
}
