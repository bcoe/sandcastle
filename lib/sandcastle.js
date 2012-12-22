var _ = require('underscore'),
  Script = require('./script').Script,
  net = require('net'),
  fs = require('fs');

function SandCastle(opts, callback) {
  
  callback = callback || function() {};

  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }

  _.extend(this, {
    client: null,
    api: null
  }, opts);

  if (this.api) this.sourceAPI = fs.readFileSync(this.api).toString();

  callback(null, this);
}

SandCastle.prototype.getClient = function(callback) {
  if (this.client) {
    callback(null, client);
  } else {

  }
};

SandCastle.prototype.createScript = function(source) {
  var _this = this;
  return new Script({
    source: source,
    sourceAPI: this.sourceAPI
  });
}

exports.SandCastle = SandCastle;


/* spawn = require( 'child_process' ).spawn;

server.listen('/tmp/sandcastle.sock', function() { //'listening' listener
  var sandbox = spawn(process.execPath, [process.cwd() + '/lib/client.js'])

  sandbox.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  sandbox.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
  });

  sandbox.on('exit', function (code) {
    console.log('child process exited with code ' + code);
  });
});*/