var _ =           require('underscore');
var SandCastle =  require("./sandcastle").SandCastle;

function Pool(opts, sandCastleCreationOpts) {
  _.extend(this, {
    numberOfInstances: 1
  }, opts);

  if(this.numberOfInstances < 1) {
    throw "Can't create a pool with zero instances";
  }


  this.sandcastles = [];
  this.runQueue = [];
  this.consumerSleeping = true;

  for(var i = 0; i < this.numberOfInstances; ++i) {
    var sandCastleOptions = {}
    _.extend(sandCastleOptions, 
             sandCastleCreationOpts, { 
              socket: '/tmp/sandcastle_' + i.toString() + '.sock'
            });

    this.sandcastles.push({ 
      castle: new SandCastle(sandCastleOptions),
      running: false
    });
  }
};

Pool.prototype.shutdown = function() {
  for(var i = 0; i < this.sandcastles.length; ++i) {
    this.sandcastles[i].castle.kill();
  }
}

Pool.prototype.consumeScript = function() {

  if(this.runQueue && this.runQueue.length > 0) {
    for(var i = 0; i < this.sandcastles.length; ++i) {
      if(!this.sandcastles[i].running && this.sandcastles[i].castle.isInitialized()) {
        var nextScript = this.runQueue.splice(0,1)[0];
        if(nextScript.script) {
          this.runOnSandCastleNumber(nextScript.script, nextScript.globals, i);
        } 
      }
    }

    setImmediate(function() {
      this.consumeScript()
    }.bind(this));
    this.consumerSleeping = false;

  } else {
    this.consumerSleeping = true;
  }
}

Pool.prototype.runOnSandCastleNumber = function(nextScript, scriptGlobals, number) {  
  var _this = this;

  _this.sandcastles[number].running = true;

  nextScript.on('exit', function(err, output, cnum) {
    _this.sandcastles[number].running = false;
  });
  nextScript.setSandCastle(_this.sandcastles[number].castle);
  nextScript.super_run(scriptGlobals);
}

Pool.prototype.requestRun = function(script, scriptGlobals) {
  this.runQueue.push({script: script, globals: scriptGlobals});
  if(this.consumerSleeping) {
    this.consumeScript();
  }
};

Pool.prototype.createScript = function(source, opts) {
  var _this = this;

  // All scripts are created from first sandbox, but the 
  // final target-sandbox is decided just before running.
  var newScript = this.sandcastles[0].castle.createScript(source, opts);

  // Override run-function, but keep the run function of superclass in 
  // super_run. This allows drop in placement of Pool in place of SandCastle.
  newScript.super_run = newScript.run;
  newScript.run = function (globals) {
    _this.requestRun(newScript, globals);
  }
  return newScript;
}

exports.Pool = Pool;