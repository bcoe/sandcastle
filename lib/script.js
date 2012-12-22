var _ = require('underscore'),
  net = require('net');

function Script(opts) {
  _.extend(this, {
    timeout: [],
    exit: [],
    source: '',
    socket: '/tmp/sandcastle.sock'
  }, opts);
};

Script.prototype.on = function(method, callback) {
  if (this[method]) {
    this[method].push(callback);
  } else {
    callback(new Error('cannot bind to ' + method));
  }
};

Script.prototype.run = function(callback) {
  var _this = this;

  var client = net.createConnection(this.socket, function() { //'connect' listener
    console.log('client connected');
    client.write(JSON.stringify({
      source: _this.source,
      sourceAPI: _this.sourceAPI
    }));
  });

  client.on('data', function(data) {
    _this.onExit(data.toString());
  });
};

Script.prototype.onExit = function(data) {
  var _this = this,
    output = null,
    error = null;

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

  this.exit.forEach(function(callback) {
    callback(error, output);
  });
};

exports.Script = Script;