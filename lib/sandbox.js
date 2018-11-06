const net = require('net');
const vm = require('vm');
//const BufferStream = require('bufferstream');
const clone = require('clone');
const EJSON = require('mongodb-extended-json');
const MMAP = require('mmap-object');

const Sandbox = function(opts) {
  Object.assign(this, {
    socket: '/tmp/sandcastle.sock',
    memoryLimit: 55,
    mmapObject: null
  }, opts);
};

Sandbox.prototype.start = function() {

  if (!this.mmapObject) {
    this.createMmap();
  }

  this.server = net.createServer((c) => {

    c.on('data', (data) => {
      data = data.toString();
      const ufid = data.substring(0, data.indexOf('-'));
      const timeStamp = data.substring(data.indexOf('-')+1);
      this.readOnlySharedObject = new MMAP.Open(`/tmp/shared-${ufid}`);
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
      setImmediate(() => { gc(); });
    });
  });

  this.server.listen(this.socket, () => {
    console.log(`sandbox file: ${this.ufid}`); // emit data so that sandcastle knows sandbox is created
  });

  this.server.on('error', () => {
    this.server.removeAllListeners();
    this.server = null;
    setTimeout(() => { this.start(); }, 500);
  });
};

Sandbox.prototype.createMmap = function() {
  // create a unique file id in case of multiple or crash
  const pid = process.pid ? process.pid.toString(36) : '';
  const time = this.nanoTime();
  this.ufid = pid + time;
  const tempMemFile = `/tmp/shared-${this.ufid}`;
  // setup with a portion of memory (we only want a ~10th of the max)
  const mmapMemory = this.memoryLimit * 100; //KB
  this.mmapObject = new MMAP.Create(tempMemFile, mmapMemory, 5);
};

Sandbox.prototype._sendError = function(connection, e, replaceStack) {
  const pack = Buffer.from(EJSON.stringify({
    error: {
      message: e.message,
      stack: !replaceStack ? e.stack : e.stack.replace()
    }
  }));
  const timeStamp = this.nanoTime();
  this.mmapObject[`type${timeStamp}`] = 'script';
  this.mmapObject[`sandScript${timeStamp}`] = pack;
  connection.write(`${this.ufid}-${timeStamp}`);
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
        const pack = Buffer.from(EJSON.stringify({
          task: taskName,
          options: options || {}
        }));
        const timeStamp = this.nanoTime();
        this.mmapObject[`type${timeStamp}`] = 'task';
        this.mmapObject[`sandTask${timeStamp}`] = pack;
        connection.write(`${this.ufid}-${timeStamp}`);
      } catch (e) {
        this._sendError(connection, e, false);
      }
    },
    exit: (output) => {
      try {
        const pack = Buffer.from(EJSON.stringify(output));
        const timeStamp = this.nanoTime();
        this.mmapObject[`type${timeStamp}`] = 'script';
        this.mmapObject[`sandScript${timeStamp}`] = pack;
        connection.write(`${this.ufid}-${timeStamp}`);
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
        Object.keys(globals).forEach((key) => {
          contextObject[key] = globals[key];
        });
      }
    }

    // The trusted API.
    if (script.sourceAPI) {
      const api = eval(script.sourceAPI); // eslint-disable-line

      Object.keys(api).forEach((key) => {
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

Sandbox.prototype.nanoTime = function() {
  const nanoSecs = process.hrtime();
  return ((nanoSecs[0]*1e9) + nanoSecs[1]).toString(36);
}; 

exports.Sandbox = Sandbox;
