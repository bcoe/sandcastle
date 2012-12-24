var _ = require('underscore'),
  Script = require('./script').Script,
  net = require('net'),
  fs = require('fs'),
  spawn = require( 'child_process' ).spawn;

function SandCastle(opts) {
  var _this = this;

  _.extend(this, {
    client: null,
    api: null,
    timeout: 5000,
    sandbox: null,
    lastHeartbeat: (new Date()).getTime(),
    socket: '/tmp/sandcastle.sock'
  }, opts);

  if (this.api) this.sourceAPI = fs.readFileSync(this.api).toString();

  this.spawnSandbox();
  this.startHeartbeat();

  // Shutdown the sandbox subprocess.
  // when the sandcastle process is terminated.
  process.on('exit', function() {
    _this.sandbox.kill('SIGHUP');
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
  this.sandboxInitialized = false;
  this.sandbox.kill('SIGHUP');
};

SandCastle.prototype.spawnSandbox = function() {

  var _this = this;  

  // attempt to unlink the old socket.
  try {fs.unlinkSync(this.socket)} catch (e) {};

  this.sandbox = spawn(process.execPath, [__dirname + '/../bin/sandcastle.js', 'sandbox', '--socket=' + this.socket]);

  // Assume that the sandbox is created once
  // data is emitted on stdout.
  this.sandbox.stdout.on('data', function(data) {
    console.log(data.toString());
    _this.waitingOnHeartbeat = false; // Used to keep only one heartbeat on the wire at a time.
    _this.sandboxInitialized = true;
  });

  this.sandbox.stderr.on('data', function(data) {
    console.log(data.toString());
    _this.waitingOnHeartbeat = false;
  });

  this.sandbox.on('exit', function (code) {
    _this.spawnSandbox();
  });

};

SandCastle.prototype.kill = function() {
  clearInterval(this.heartbeatId);
  this.sandbox.removeAllListeners('exit');
  this.sandbox.kill('SIGHUP');
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

  script.run();
};

SandCastle.prototype.createScript = function(source) {
  return new Script({
    source: source,
    sourceAPI: this.sourceAPI,
    timeout: this.timeout,
    socket: this.socket,
    sandcastle: this
  });
};

exports.SandCastle = SandCastle;