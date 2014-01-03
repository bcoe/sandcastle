var _ = require('underscore'),
  net = require('net'),
  vm = require('vm'),
  BufferStream = require('bufferstream');

function Sandbox(opts) {
  _.extend(this, {
    socket: '/tmp/sandcastle.sock'
  }, opts);
}

Sandbox.prototype.start = function() {
  var _this = this;
  var data = '';
  
  this.server = net.createServer(function(c) {

    var stream = new BufferStream({size:'flexible'});
    stream.split('\u0000');
    stream.on('split', function(chunk) {
      _this.executeScript(c, chunk);
    });

    c.on('data', stream.write);
  });

  this.server.listen(this.socket, function() {
    console.log('sandbox server created'); // emit data so that sandcastle knows sandbox is created
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
          connection.write(JSON.stringify(output) + '\u0000'); // separator char
        } catch(e) {
          connection.write(JSON.stringify({
            error: {
              message: e.message,
              stack: e.stack.replace()
            }
          }) + '\u0000');
        }
      }
    };

  try {
    var script = JSON.parse(data);

    // The trusted API.
    if (script.sourceAPI) {
      var api = eval(script.sourceAPI);

      Object.keys(api).forEach(function(key) {
        contextObject[key] = api[key];
      });
    }

    // The trusted global variables.
    if (script.globals) {
      var globals = JSON.parse(script.globals);

      Object.keys(globals).forEach(function(key) {
        contextObject[key] = globals[key];
      });
    }

    vm.runInContext( this.wrapForExecution(script.source), vm.createContext(contextObject));
  } catch (e) {
    connection.write(JSON.stringify({
      error: {
        message: e.message,
        stack: e.stack
      }
    }) + '\u0000');
  }
  
};

Sandbox.prototype.wrapForExecution = function(source) {
  return "var exports = {};" + source + "\nexports.main();"
};

exports.Sandbox = Sandbox;