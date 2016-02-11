var _ = require('lodash'),
  net = require('net'),
  events = require('events'),
  util = require('util'),
  BufferStream = require('bufferstream'),
  Buffer = require('buffer').Buffer,
  EJSON = require('mongodb-extended-json');

function Script(opts) {
  events.EventEmitter.call(this);

  _.extend(this, {
    source: '',
    socket: '/tmp/sandcastle.sock',
    timeout: 5000,
    exited: false,
    sandcastle: null // the parent sandcastle executing this script.
  }, opts);
}

util.inherits(Script, events.EventEmitter);

Script.prototype.run = function(methodName, globals) {
  var _this = this;

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
  var _this = this;

  if (this.timeoutId){
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  this.timeoutId = setTimeout(function() {
    _this.timeoutId = null;
    if (_this.exited) return;
    _this.exited = true;
    _this.sandcastle.kickOverSandCastle();
    _this.emit('timeout', methodName);
  }, this.timeout);
};

Script.prototype.reset = function() {
  if (this.timeoutId){
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }
  this.exited = false;
};

Script.prototype.createClient = function(methodName, globals) {

  var _this = this;

  this.sandcastle.sandboxReady(function() {

    if (_this.exited) return;

    var stream = new BufferStream({size:'flexible'});

    var client = net.createConnection(_this.sandcastle.getSocket(), function() {
      client.write(EJSON.stringify({
        source: _this.source,// the untrusted JS.
        sourceAPI: _this.sourceAPI,// the trusted API.
        globals: EJSON.stringify(globals), // trusted global variables.
        methodName: methodName
      }) + '\u0000\u0000'); // the chunk separator
    });

    client.once('close', function() {
      client.destroy();
      client.removeAllListeners('data');
      client.removeAllListeners('error');
      stream.end();
      stream.removeAllListeners('split');
      if (!_this.dataReceived) {
        setTimeout(function() {
          _this.createClient(methodName, globals);
        }, 500);
      }
    });

    client.on('error', function(err) {
      setTimeout(function() {
        _this.createClient(methodName, globals);
      }, 500);
    });

    stream.split('\u0000\u0000', function(chunk) {
      client.end();
      _this.onExit(methodName, chunk);
    });

    stream.split('\u0000', function (chunk) {
      _this.onTask(client, methodName, chunk); // handling the task
    });

    client.on('data', function(chunk) {
      _this.dataReceived = true;
      stream.write(chunk);
    });

  });
};

Script.prototype._parseChunk = function(data) {
  var output = null,
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
  var _this = this,
    parsed = {
      output: null,
      error: null
    };

  if (this.exited) return;

  this.exited = true;
  if (this.timeoutId){
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
  }

  parsed = _this._parseChunk(data);

  this.emit('exit', parsed.error, parsed.output, methodName);
};

Script.prototype.onTask = function(client, methodName, data) {
  var _this = this,
    parsed = _this._parseChunk(data);

  if (this.exited) return;

  parsed.output = parsed.output || {};
  parsed.output.options = parsed.output.options || {};

  this.emit('task', parsed.error, parsed.output.task, parsed.output.options, methodName, function (answerData) {
    if (_this.refreshTimeoutOnTask) _this.createTimeout(methodName);
    client.write(EJSON.stringify({ task: parsed.output.task, data: answerData }) + '\u0000');
  });
};

Script.prototype.setSandCastle = function(sandcastle) {
  this.sandcastle = sandcastle;
};

exports.Script = Script;
