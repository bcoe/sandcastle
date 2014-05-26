var _ = require('underscore'),
  net = require('net'),
  events = require('events'),
  util = require('util'),
  BufferStream = require('bufferstream'),
  Buffer = require('buffer').Buffer;

function Script(opts) {
  _.extend(this, {
    source: '',
    socket: '/tmp/sandcastle.sock',
    timeout: 5000,
    exited: false,
    sandcastle: null // the parent sandcastle executing this script.
  }, opts);
};

util.inherits(Script, events.EventEmitter);

Script.prototype.run = function(methodName, globals) {
  var _this = this;

  if (globals === undefined) {
    // passed in methodName argument is the globals object
    if (typeof methodName === 'object') {
      globals = methodName;
      methodName = null;
    }
  }

  if (typeof methodName !== 'string') {
    methodName = 'main';
  }

  this.reset();

  this.timeoutId = setTimeout(function() {
    if (_this.exited) return;
    _this.exited = true;
    _this.sandcastle.kickOverSandCastle();
    _this.emit('timeout', methodName);
  }, this.timeout);

  this.createClient(methodName, globals);
};

Script.prototype.reset = function() {
  if (this.timeoutId) clearTimeout(this.timeoutId);
  this.exited = false;
};

Script.prototype.createClient = function(methodName, globals) {

  var _this = this;

  this.sandcastle.sandboxReady(function() {
    
    if (_this.exited) return;

    var client = net.createConnection(_this.sandcastle.getSocket(), function() {
      client.write(JSON.stringify({
        source: _this.source,// the untrusted JS.
        sourceAPI: _this.sourceAPI,// the trusted API.
        globals: JSON.stringify(globals), // trusted global variables.
        methodName: (methodName && typeof methodName === 'string') ? methodName : 'main'
      }) + '\u0000'); // the chunk separator
    });

    client.on('close', function() {
      if (!_this.dataReceived) {
        setTimeout(function() {
          _this.createClient(methodName);
        }, 500);
      }
    });

    client.on('error', function(err) {
      setTimeout(function() {
        _this.createClient(methodName);
      }, 500);
    });


    var stream = new BufferStream({size:'flexible'});
    stream.split('\u0000');
    stream.on('split', function(chunk) {
      client.end();
      _this.onExit(methodName, chunk);
    });

    client.on('data', function(chunk) {
      _this.dataReceived = true;
      stream.write(chunk);
    });

  });
};

Script.prototype.onExit = function(methodName, data) {
  var _this = this,
    output = null,
    error = null;

  if (this.exited) return;
  this.exited = true;

  try {
    if (data.toString() !== 'undefined') {
        output = JSON.parse(data);
        if (output.error) {
            error = new Error(output.error.message);
            error.stack = output.error.stack;
            output = null;
        }
    }
  } catch (e) {
    error = e;
  }

  this.emit('exit', error, output, methodName);
};

Script.prototype.setSandCastle = function(sandcastle) {
  this.sandcastle = sandcastle;
}

exports.Script = Script;