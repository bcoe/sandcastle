var _ = require('underscore'),
  net = require('net'),
  events = require('events'),
  util = require('util');

function Script(opts) {
  _.extend(this, {
    source: '',
    socket: '/tmp/sandcastle.sock',
    timeout: 5000,
    exited: false
  }, opts);
};

util.inherits(Script, events.EventEmitter);

Script.prototype.run = function() {

  var _this = this;
  
  setTimeout(function() {
    _this.exited = true;
    _this.emit('timeout');
  }, this.timeout);

  this.createClient();
};

Script.prototype.createClient = function() {

  if (this.exited) return;

  var _this = this,
    client = net.createConnection(this.socket, function() {
      client.write(JSON.stringify({
        source: _this.source,
        sourceAPI: _this.sourceAPI
      }));
    });

  client.on('close', function() {
    if (!_this.dataReceived) {
      setTimeout(function() {
        _this.createClient();
      }, 500);
    }
  });

  client.on('error', function(err) {
    setTimeout(function() {
      _this.createClient();
    }, 500);
  });

  client.on('data', function(data) {
    _this.dataReceived = true;
    _this.onExit(data.toString());
  });
};

Script.prototype.onExit = function(data) {
  var _this = this,
    output = null,
    error = null;

  if (this.exited) return;
  this.exited = true;

  try {
    output = JSON.parse(data);
    if (output.error) {
      error = new Error(output.error.message);
      error.stack = output.error.stack;
      output = null;
    }
  } catch (e) {
    error = e;
  }

  this.emit('exit', error, output);
};

exports.Script = Script;