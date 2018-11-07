const net = require('net');
const events = require('events');
const util = require('util');
const { Buffer } = require('buffer');
const EJSON = require('mongodb-extended-json');
const MMAP = require('mmap-object');

const Script = function(opts) {
  events.EventEmitter.call(this);

  Object.assign(this, {
    source: '',
    socket: '/tmp/sandcastle.sock',
    timeout: 5000,
    exited: false,
    sandcastle: null // the parent sandcastle executing this script.
  }, opts);
};

util.inherits(Script, events.EventEmitter);

Script.prototype.run = function(methodName, globals) {
  // passed in methodName argument is the globals object
  if (globals === undefined && typeof methodName === 'object') {
    globals = methodName;
    methodName = null;
  }

  // we default to executing 'main'
  methodName = methodName ? methodName : 'main';

  this.reset();

  this.createTimeout(methodName);

  this.createClient(methodName, globals);
};

Script.prototype.createTimeout = function(methodName) {
  if (this.timeoutId) {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  this.timeoutId = setTimeout(() => {
    this.timeoutId = null;
    if (this.exited) { return; }
    this.exited = true;
    this.sandcastle.kickOverSandCastle();
    this.emit('timeout', methodName);
  }, this.timeout);
};

Script.prototype.reset = function() {
  if (this.timeoutId) {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }
  this.exited = false;
};

Script.prototype.createClient = function(methodName, globals) {
  try {
    globals = EJSON.stringify(globals);
  } catch (err) {
    this.onExit(methodName, EJSON.stringify({
      error: { message: 'Unserializable Payload' }
    }));
    return;
  }
  this.sandcastle.sandboxReady(() => {
    if (this.exited) { return; }

    const client = net.connect(this.sandcastle.getSocket(), () => {
      let pack = EJSON.stringify({
        source: this.source, // the untrusted JS.
        sourceAPI: this.sourceAPI, // the trusted API.
        globals: globals, // trusted global variables.
        methodName: methodName
      });
      // timestamp object in case of collision
      if (this.sandcastle.sharedObject.isClosed()) {
        this.sandcastle.createMmap();
      }
      // handle resize issue due to roughly 1/3 of free memory
      if (((Buffer.byteLength(pack) + 400)*3) > this.sandcastle.sharedObject.get_free_memory()) {
        this.onExit(methodName, EJSON.stringify({
          error: { message: 'Script and Payload exceeds your memory limit.' }
        }));
        return;
      }
      pack = Buffer.from(pack);
      const nanoSecs = process.hrtime();
      this.timeStamp = ((nanoSecs[0]*1e9) + nanoSecs[1]).toString(36);
      this.sandcastle.sharedObject[`type${this.timeStamp}`] = 'script';
      this.sandcastle.sharedObject[`sandScript${this.timeStamp}`] = pack;
      client.write(`${this.sandcastle.sharedFileID}-${this.timeStamp}`);
    });

    client.on('close', (hadError) => {
      if (hadError) { client.destroy(); }
      client.removeAllListeners();
      if (!this.dataReceived) {
        setTimeout(() => {
          this.createClient(methodName, globals);
        }, 300);
      }
    });

    client.on('error', () => {
      setTimeout(() => {
        this.createClient(methodName, globals);
      }, 500);
    });

    client.on('data', (data) => {
      this.dataReceived = true;
      data = data.toString();
      const ufid = data.substring(0, data.indexOf('-'));
      const timeStamp = data.substring(data.indexOf('-')+1);
      this.readOnlySharedObject = new MMAP.Open(`/tmp/shared-${ufid}`);
      if (this.readOnlySharedObject[`type${timeStamp}`]  === 'script') {
        client.end();
        const sharedData = this.readOnlySharedObject[`sandScript${timeStamp}`].toString();
        this.onExit(methodName, sharedData );
      } else {
        this.onTask(client, methodName, this.readOnlySharedObject[`sandTask${timeStamp}`].toString());
      }
    });
  });
};

Script.prototype._parseChunk = function(data) {
  let output = null,
    error = null;

  try {
    if (data.toString() !== 'undefined') {
      output = EJSON.parse(data);
      if (output !== null && output.error) {
        error = new Error(output.error.message);
        error.stack = output.error.stack;
        output = null;
      }
    }
  } catch (e) {
    error = e;
  }

  return {
    output: output,
    error: error
  };
};

Script.prototype.onExit = function(methodName, data) {
  let parsed = {
    output: null,
    error: null
  };
  delete this.sandcastle.sharedObject[`type${this.timeStamp}`];
  delete this.sandcastle.sharedObject[`sandScript${this.timeStamp}`];
  delete this.sandcastle.sharedObject[`sandTask${this.timeStamp}`];
  if (this.exited) { return; }

  this.exited = true;
  if (this.timeoutId) {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  parsed = this._parseChunk(data);
  this.emit('exit', parsed.error, parsed.output, methodName);
};

Script.prototype.onTask = function(client, methodName, data) {
  const parsed = this._parseChunk(data);
  if (this.exited) { return; }

  parsed.output = parsed.output || {};
  parsed.output.options = parsed.output.options || {};

  this.emit('task', parsed.error, parsed.output.task, parsed.output.options, methodName, (answerData) => {
    if (this.exited) { return; }
    if (this.refreshTimeoutOnTask) { this.createTimeout(methodName); }
    const pack = Buffer.from(EJSON.stringify({
      task: parsed.output.task,
      data: answerData
    }));
    const nanoSecs = process.hrtime();
    this.timeStamp = ((nanoSecs[0]*1e9) + nanoSecs[1]).toString(36);
    this.sandcastle.sharedObject[`type${this.timeStamp}`] = 'task';
    this.sandcastle.sharedObject[`sandTask${this.timeStamp}`] = pack;
    client.write(`${this.sandcastle.sharedFileID}-${this.timeStamp}`);
  });
};

Script.prototype.setSandCastle = function(sandcastle) {
  this.sandcastle = sandcastle;
};

exports.Script = Script;
