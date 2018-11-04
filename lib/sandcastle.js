const Script = require('./script').Script;
const path = require('path');
const fs = require('fs');
const os = require('os');
const debug = require('debug')('sandcastle');
const spawn = require( 'child_process' ).spawn;
const MMAP = require('mmap-object');

const SIGHUP = os.platform() === 'win32' ? 'SIGTERM' : 'SIGHUP';

const SandCastle = function(opts) {
  Object.assign(this, {
    client: null,
    api: null,
    timeout: 5000,
    sandbox: null,
    lastHeartbeat: Date.now(),
    socket: '/tmp/sandcastle.sock',
    useStrictMode: true,
    memoryLimitMB: 0,
    cwd: process.cwd(),
    spawnExecPath: process.execPath,
    refreshTimeoutOnTask: false,
    sharedFileID: '1',
    sharedObject: null
  }, opts);

  if (this.sharedObject === null) {
    this.singleMode = true;
    this.createMmap();
  } else {
    this.singleMode = false;
  }

  if (this.api) {
    if (this.api.indexOf('{') !== -1) {
      // allow the API to be passed in as a blob of source-code.
      this.sourceAPI = this.api;
    } else {
      // otherwise, load the API from a file.
      // expanding ./ to current working directory.
      if (this.api.indexOf('.') === 0) { this.api = path.join(this.cwd, this.api); }
      this.sourceAPI = fs.readFileSync(this.api, 'utf-8');
    }
  }

  this.spawnSandbox();
  this.startHeartbeat();

  // Shutdown the sandbox subprocess.
  // when the sandcastle process is terminated.
  this.onProcessExit = () => { this.kill(); };
  process.on('exit', this.onProcessExit);
};

SandCastle.prototype.createMmap = function() {
  // create a unique file id in case of multiple or crash
  const pid = process.pid ? process.pid.toString(36) : '';
  const time = Date.now().toString(36);
  this.ufid = pid + time;
  const tempMemFile = `/tmp/shared-${this.sharedFileID}`;
  // setup with a portion of memory (we only want a ~10th of the max)
  let mmapMemory = this.memoryLimitMB * 100;
  if (mmapMemory === 0) { mmapMemory = 5120; } //KB
  this.sharedObject = new MMAP.Create(tempMemFile, mmapMemory, 5);
}

SandCastle.prototype.sandboxReady = function(callback) {
  if (this.sandboxInitialized) {
    callback();
  } else {
    setTimeout(() => {
      this.sandboxReady(callback);
    }, 500);
  }
};

SandCastle.prototype.kickOverSandCastle = function() {
  if (this.heartbeatScript) {
    this.heartbeatScript.removeAllListeners();
    this.heartbeatScript = null;
  }
  if (this.sandboxInitialized) {
    this.sandboxInitialized = false;
    this.sandbox.kill(SIGHUP);
  }
};

SandCastle.prototype.spawnSandbox = function() {
  // attempt to unlink the old socket.
  try { fs.unlinkSync(this.socket); } catch (e) {}
  this.sandbox = spawn(this.spawnExecPath, [
    '--expose-gc',
    '--zero-fill-buffers',
    this.useStrictMode ? '--use_strict' : '--nouse_strict',
    `--max_old_space_size=${this.memoryLimitMB.toString()}`,
    `${__dirname}/../bin/sandcastle.js`,
    'sandbox',
    `--socket=${this.socket}`
  ], { cwd: this.cwd, env: { } });

  // Assume that the sandbox is created once
  // data is emitted on stdout.
  this.sandbox.stdout.on('data', (data) => {
    //console.log(data.toString())
    debug(`Sandbox output: ${data.toString()}`);
    this.waitingOnHeartbeat = false; // Used to keep only one heartbeat on the wire at a time.
    this.sandboxInitialized = true;
  });

  this.sandbox.stderr.on('data', (data) => {
    debug(`Sandbox error: ${data.toString()}`);
    this.waitingOnHeartbeat = false;
  });

  this.sandbox.on('exit', () => {
    this.spawnSandbox();
  });


};

SandCastle.prototype.kill = function() {
  clearInterval(this.heartbeatId);
  this.heartbeatId = null;
  this.sandbox.removeAllListeners();
  this.sandbox.kill(SIGHUP);
  if (this.singleMode) {
    this.sharedObject.close();
    try { fs.unlinkSync(`/tmp/shared-${this.sharedFileID}`); } catch (e) {}
  }
  process.removeListener('exit', this.onProcessExit);
};

SandCastle.prototype.startHeartbeat = function() {
  this.heartbeatId = setInterval(() => {
    const now = Date.now();

    this.runHeartbeatScript();

    if ( (now - this.lastHeartbeat) > this.timeout) {
      this.lastHeartbeat = Date.now();
      this.kickOverSandCastle();
    }
  }, 2000);
};

SandCastle.prototype.runHeartbeatScript = function() {
  // Only wait for one heartbeat script
  // to execute at a time.
  if (this.waitingOnHeartbeat) { return; }
  this.waitingOnHeartbeat = true;

  if (this.heartbeatScript) {
    this.heartbeatScript.removeAllListeners();
    this.heartbeatScript = null;
  }
  this.heartbeatScript = this.createScript('exports.main = function() {exit(true)}');

  this.heartbeatScript.once('exit', (err, output) => { // eslint-disable-line
    if (output) {
      this.lastHeartbeat = Date.now();
      this.waitingOnHeartbeat = false;
    }
  });

  this.heartbeatScript.run('main');
};

SandCastle.prototype.createScript = function(source, opts) {
  let sourceAPI = this.sourceAPI || '';
  if (opts && opts.extraAPI) { sourceAPI += `;\n${opts.extraAPI}`; }

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
};

SandCastle.prototype.getSocket = function() {
  return this.socket;
};

exports.SandCastle = SandCastle;
