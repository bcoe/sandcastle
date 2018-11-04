const net = require('net');
const vm = require('vm');
//const BufferStream = require('bufferstream');
const clone = require('clone');
const EJSON = require('mongodb-extended-json');
const Shared = require('mmap-object');

const Sandbox = function(opts) {
  Object.assign(this, {
    socket: '/tmp/sandcastle.sock'
  }, opts);
};

Sandbox.prototype.start = function() {

  this.server = net.createServer((c) => {

    c.on('data', (data) => {
      data = data.toString();
      const ufid = data.substring(0, data.indexOf('-'));
      const timeStamp = data.substring(data.indexOf('-')+1);
      this.readOnlySharedObject = new Shared.Open(`/tmp/shared-${ufid}`);
      if (this.readOnlySharedObject[`type${timeStamp}`]  === 'script') {
        this.executeScript(c, this.readOnlySharedObject[`sandScript${timeStamp}`] );
      } else {
        this.answerTask(c, this.readOnlySharedObject[`sandTask${timeStamp}`] );
      }
    });

    c.once('close', (hadError) => {
      if (hadError) { c.destroy(); }
      c.removeAllListeners();
      c._ctx = null;

      setImmediate(function() { gc(); });
    });
  });

  this.server.listen(this.socket, function() {
    console.log('sandbox server created'); // emit data so that sandcastle knows sandbox is created
  });

  this.server.on('error', () => {
    this.server.removeAllListeners();
    this.server = null;
    setTimeout(function() { this.start(); }, 500);
  });
};

Sandbox.prototype._sendError = (connection, e, replaceStack) => {
  connection.write(`${EJSON.stringify({
    error: {
      message: e.message,
      stack: !replaceStack ? e.stack : e.stack.replace()
    }
  })}\u0000\u0000`); // exit/start separator
};

Sandbox.prototype.answerTask = function(connection, data) {
  try {
    const taskData = EJSON.parse(data.toString());
    const taskName = taskData.task;
    const onAnswerName = `on${taskName.charAt(0).toUpperCase()}${taskName.slice(1)}Task`;
    if (connection._ctx.exports[onAnswerName]) {
      connection._ctx.exports[onAnswerName](taskData.data);
    } else if (connection._ctx.exports.onTask) {
      connection._ctx.exports.onTask(taskName, taskData.data);
    }
  } catch (e) {
    console.log(e);
    this._sendError(connection, e);
  }
};

Sandbox.prototype.executeScript = function(connection, data) {
  let contextObject = {
    runTask: (taskName, options) => {
      try {
        connection.write(`${EJSON.stringify({
          task: taskName,
          options: options || {}
        })}\u0000`); // task seperator
      } catch (e) {
        this._sendError(connection, e, false);
      }
    },
    exit: (output) => {
      try {
        connection.write(`${EJSON.stringify(output)}\u0000\u0000`); // exit/start separator
      } catch (e) {
        this._sendError(connection, e, true);
      }
    }
  };

  try {
    const script = EJSON.parse(data);

    // The trusted global variables.
    if (script.globals) {
      const globals = EJSON.parse(script.globals);

      if (globals) {
        Object.keys(globals).forEach(function(key) {
          contextObject[key] = globals[key];
        });
      }
    }

    // The trusted API.
    if (script.sourceAPI) {
      const api = eval(script.sourceAPI); // eslint-disable-line

      Object.keys(api).forEach(function(key) {
        contextObject[key] = api[key];
      });
    }
    // recursively clone contextObject without prototype,
    // to prevent exploits using __defineGetter__, __defineSetter__.
    // https://github.com/bcoe/sandcastle/pull/21
    contextObject = clone(contextObject, true, Infinity, null);

    connection._ctx = vm.createContext(contextObject);
    vm.runInContext(this.wrapForExecution(script.source, script.methodName), connection._ctx);
  } catch (e) {
    this._sendError(connection, e, false);
  }

};

Sandbox.prototype.wrapForExecution = function(source, methodName) {
  return `var exports = Object.create(null);${source}\nexports.${methodName}();`;
};

exports.Sandbox = Sandbox;
