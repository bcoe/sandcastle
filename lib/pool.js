const SandCastle = require("./sandcastle").SandCastle;
const fs = require('fs');
const MMAP = require('mmap-object');

const Pool = function(opts, sandCastleCreationOpts) {
  Object.assign(this, {
    numberOfInstances: 1
  }, opts);

  if (this.numberOfInstances < 1) {
    throw "Can't create a pool with zero instances";
  }

  this.sandcastles = [];
  this.runQueue = [];
  this.consumerSleeping = true;

  if (sandCastleCreationOpts) {
    if (sandCastleCreationOpts.memoryLimitMB) {
      this.createMmap(sandCastleCreationOpts.memoryLimitMB);
    } else {
      this.createMmap(0);
    }
  } else {
    this.createMmap(0);
  }

  const sandCastleOptions = {};
  for (let i = 0; i < this.numberOfInstances; ++i) {
    Object.assign( sandCastleOptions,
      sandCastleCreationOpts, {
        socket: `/tmp/sandcastle_${i.toString()}.sock`,
        sharedFileID: this.ufid,
        sharedObject: this.mmapObject
      }
    );

    this.sandcastles.push({
      castle: new SandCastle(sandCastleOptions),
      running: false
    });
  }
};

Pool.prototype.createMmap = function(memoryLimit) {
  // create a unique file id in case of multiple or crash
  const pid = process.pid ? process.pid.toString(36) : '';
  const time = Date.now().toString(36);
  this.ufid = pid + time;
  const tempMemFile = `/tmp/shared-${this.ufid}`;
  // setup with a portion of memory (we only want a ~10th of the max)
  let mmapMemory = memoryLimit * 100;
  if (mmapMemory === 0) { mmapMemory = 5120; } //KB
  const mmapObjects = (this.numberOfInstances*2)+1; // x2 + 1 for two scripts and the type
  this.mmapObject = new MMAP.Create(tempMemFile, mmapMemory, mmapObjects);
};

Pool.prototype.kill = function() {
  // close and clean mmap
  this.sandcastles.forEach(function(sandcastleData) {
    sandcastleData.castle.kill();
  });
  this.mmapObject.close();
  try { fs.unlinkSync(`/tmp/shared-${this.ufid}`); } catch (e) {}
};

Pool.prototype.consumeScript = function() {
  if (this.runQueue && this.runQueue.length > 0) {
    let sandcastleData, nextScript;
    for (let i = 0; i < this.sandcastles.length; ++i) {
      sandcastleData = this.sandcastles[i];
      if (!sandcastleData.running && sandcastleData.castle.isInitialized()) {
        nextScript = this.runQueue.splice(0, 1)[0];
        if (nextScript && nextScript.script) {
          this.runOnSandCastle(nextScript.script, nextScript.globals, sandcastleData);
        } else {
          // No scripts on queue.
          break;
        }
      }

    }

    setImmediate(function() {
      this.consumeScript();
    }.bind(this));
    this.consumerSleeping = false;

  } else {
    this.consumerSleeping = true;
  }
};

Pool.prototype.runOnSandCastle = function(nextScript, scriptGlobals, sandcastleData) {
  sandcastleData.running = true;

  nextScript.once('exit', function() {
    sandcastleData.running = false;
  });

  nextScript.once('timeout', function() {
    sandcastleData.running = false;
  });

  nextScript.setSandCastle(sandcastleData.castle);
  nextScript.super_run(scriptGlobals);
};

Pool.prototype.requestRun = function(script, scriptGlobals) {
  this.runQueue.push({ script: script, globals: scriptGlobals });
  if (this.consumerSleeping) {
    this.consumeScript();
  }
};

Pool.prototype.createScript = function(source, opts) {
  // All scripts are created from first sandbox, but the
  // final target-sandbox is decided just before running.
  const newScript = this.sandcastles[0].castle.createScript(source, opts);

  // Override run-function, but keep the run function of superclass in
  // super_run. This allows drop in placement of Pool in place of SandCastle.
  newScript.super_run = newScript.run;
  newScript.run = (globals) => {
    this.requestRun(newScript, globals);
  };
  return newScript;
};

exports.Pool = Pool;
