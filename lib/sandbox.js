var _ = require('underscore'),
  net = require('net'),
  vm = require('vm');

function Sandbox(opts) {
  _.extend(this, {
    socket: '/tmp/sandcastle.sock'
  }, opts);
}

Sandbox.prototype.start = function() {
  var _this = this;
  
  this.server = net.createServer(function(c) { //'connection' listener
    c.on('data', function(data) {
      _this.executeScript(c, data.toString());
    });
  });

  this.server.listen(this.socket, function() {
    console.log('sandbox server created');
  });
};

Sandbox.prototype.executeScript = function(connection, data) {

  var context = vm.createContext({
      exit: function(output) {
        try {
          connection.write(JSON.stringify(output));
        } catch(e) {
          connection.write(JSON.stringify({
            error: {
              message: e.message,
              stack: e.stack
            }
          }));
        }
      }
    });

  try {
    var script = JSON.parse(data);
    vm.runInContext( this.wrapForExecution(script.source), context);
  } catch (e) {
    connection.write(JSON.stringify({
      error: {
        message: e.message,
        stack: e.stack
      }
    }));
  }
  
};

Sandbox.prototype.wrapForExecution = function(source) {
  return "var exports = {};" + source + "\nexports.main();"
};

exports.Sandbox = Sandbox;