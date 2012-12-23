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
  
  this.server = net.createServer(function(c) {
    c.on('data', function(data) {
      _this.executeScript(c, data.toString());
    });
  });

  this.server.listen(this.socket, function() {
    console.log('sandbox server created');
  });

  this.server.on('error', function() {
    setTimeout(function() {
      _this.start();
    }, 500);
  });
};

Sandbox.prototype.executeScript = function(connection, data) {

  var contextObject = {
      exit: function(output) {
        try {
          connection.write(JSON.stringify(output));
        } catch(e) {
          connection.write(JSON.stringify({
            error: {
              message: e.message,
              stack: e.stack.replace()
            }
          }));
        }
      }
    };

  try {
    var script = JSON.parse(data);

    if (script.sourceAPI) {
      var api = eval(script.sourceAPI);
      Object.keys(api).forEach(function(key) {
        contextObject[key] = api[key];
      });
    }

    vm.runInContext( this.wrapForExecution(script.source), vm.createContext(contextObject));
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