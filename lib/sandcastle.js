var _ = require('lodash'),
  Script = require('./script').Script,
  path = require('path'),
  fs = require('fs'),
  os = require('os'),
  debug = require('debug')('sandcastle'),
  spawn = require( 'child_process' ).spawn;

var SIGHUP = os.platform()=='win32' ? 'SIGTERM' : 'SIGHUP';

function SandCastle(opts) {
  var _this = this;

  _.extend(this, {
    client: null,
    api: null,
    timeout: 5000,
    sandbox: null,
    lastHeartbeat: (new Date()).getTime(),
    socket: '/tmp/sandcastle.sock',
    useStrictMode: true,
    memoryLimitMB: 0,
    cwd: process.cwd(),
    spawnExecPath: process.execPath,
    refreshTimeoutOnTask: false
  }, opts);

  if (this.api) {
    if (this.api.indexOf('{') !== -1) {
      // allow the API to be passed in as a blob of source-code.
      this.sourceAPI = this.api;
    } else {
      // otherwise, load the API from a file.
      // expanding ./ to current working directory.
      if (this.api.indexOf('.') === 0) this.api = path.join(this.cwd, this.api);
      this.sourceAPI = fs.readFileSync(this.api, 'utf-8');
    }
  }

  this.spawnSandbox();
  this.startHeartbeat();

  // Shutdown the sandbox subprocess.
  // when the sandcastle process is terminated.
  process.on('exit', function() {
    _this.sandbox.kill(SIGHUP);
  });
}

SandCastle.prototype.sandboxReady = function(callback) {
  var _this = this;
  if (this.sandboxInitialized) {
    callback();
  } else {
    setTimeout(function() {
      _this.sandboxReady(callback);
    }, 500);
  }
};

SandCastle.prototype.kickOverSandCastle = function() {
  if(this.sandboxInitialized) {
    this.sandboxInitialized = false;
    this.sandbox.kill(SIGHUP);
  }
};

SandCastle.prototype.spawnSandbox = function() {

  var _this = this;

  // attempt to unlink the old socket.
  try {fs.unlinkSync(this.socket)} catch (e) {};

  this.sandbox = spawn(this.spawnExecPath, [
    _this.useStrictMode ? "--use_strict" : "--nouse_strict",
    "--max_old_space_size=" + _this.memoryLimitMB.toString(),
    __dirname + '/../bin/sandcastle.js',
    'sandbox',
    '--socket=' + this.socket
  ], {cwd: _this.cwd});

  // Assume that the sandbox is created once
  // data is emitted on stdout.
  this.sandbox.stdout.on('data', function(data) {
    debug("Sandbox output: " + data.toString());
    _this.waitingOnHeartbeat = false; // Used to keep only one heartbeat on the wire at a time.
    _this.sandboxInitialized = true;
  });

  this.sandbox.stderr.on('data', function(data) {
    debug("Sandbox error: " + data.toString());
    _this.waitingOnHeartbeat = false;
  });

  this.sandbox.on('exit', function (code) {
    _this.spawnSandbox();
  });

};

SandCastle.prototype.kill = function() {
  clearInterval(this.heartbeatId);
  this.sandbox.removeAllListeners('exit');
  this.sandbox.kill(SIGHUP);
  process.removeAllListeners('exit');
};

SandCastle.prototype.startHeartbeat = function() {
  var _this = this;

  _this.heartbeatId = setInterval(function() {
    var now = (new Date()).getTime();

    _this.runHeartbeatScript();

    if ( (now - _this.lastHeartbeat) > _this.timeout) {
      _this.lastHeartbeat = (new Date()).getTime();
      _this.kickOverSandCastle();
    }
  }, 500);

};

SandCastle.prototype.runHeartbeatScript = function() {

  // Only wait for one heartbeat script
  // to execute at a time.
  if (this.waitingOnHeartbeat) return;
  this.waitingOnHeartbeat = true;

  var _this = this,
    script = this.createScript("exports.main = function() {exit(true)}");

  script.on("exit", function(err, output) {
    if (output) {
      _this.lastHeartbeat = (new Date()).getTime();
      _this.waitingOnHeartbeat = false;
    }
  });

  script.run('main');
};

SandCastle.prototype.createScript = function(source, opts) {
  var sourceAPI = this.sourceAPI || '';
  if (opts && opts.extraAPI) sourceAPI += ";\n" + opts.extraAPI

  return new Script({
    source: source,
    sourceAPI: sourceAPI,
    timeout: this.timeout,
    socket: this.socket,
    sandcastle: this
  });
};

SandCastle.prototype.isInitialized = function() {
  return this.sandboxInitialized;
}

SandCastle.prototype.getSocket = function() {
  return this.socket;
}

exports.SandCastle = SandCastle;
