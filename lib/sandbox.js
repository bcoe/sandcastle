var _ = require('underscore'),
  net = require('net');

function Sandbox(opts) {
  _.extend(this, {
    socket: '/tmp/sandcastle.sock'
  }, opts);
}

Sandbox.prototype.start = function() {
  var _this = this;
  
  this.server = net.createServer(function(c) { //'connection' listener
    
    var data = '';

    c.on('close', function() {

    });
    
    c.on('data', function(data) {
      data += data.toString();
    });

    c.on('end', function() {
      _this.returnResult(c, data);
    });

  });

  this.server.listen(this.socket, function() {
    console.log('sandbox server created');
  });

};

Sandbox.prototype.returnResult = function(connection, data) {

};

exports.Sandbox = Sandbox;



/*var net = require('net'),
  spawn = require( 'child_process' ).spawn;

var server = net.createServer(function(c) { //'connection' listener
  console.log('server connected');
  c.on('close', function) {

  });
  c.on('data', function(data) {
    console.log(data.toString());
  });
  c.on('end', function() {
    console.log('server disconnected');
  });
});

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