var equal = require('assert').equal,
  notEqual = require('assert').notEqual,
  SandCastle = require('../lib').SandCastle,
  Pool = require('../lib').Pool

exports.tests = {
  'on("exit") is fired when a sandboxed script calls the exit method': function(finished, prefix) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports.main = function() {\
        var result = 1 + 1;\
        exit({\
          results: [result]\
        });\
      }\
    ");

    script.on('exit', function(err, result) {
      equal(result.results[0], 2, prefix)
      sandcastle.kill();
      finished();
    });

    script.run();
  },
  'run() can have global variables passed into it': function(finished, prefix) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports.main = function() {\
        exit(foo);\
      }\
    ");

    script.on('exit', function(err, result) {
      equal('bar', result, prefix)
      sandcastle.kill();
      finished();
    });

    script.run({foo: 'bar'});
  },
  'require() cannot be called from sandbox': function(finished, prefix) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports.main = function() {\
        var net = require('net');\
      }\
    ");

    script.on('exit', function(err, result) {
      equal(err.message, 'require is not defined', prefix);
      sandcastle.kill();
      finished();
    });

    script.run();
  },
  'an API can be provided for untrusted JavaScript to interact with': function(finished, prefix) {
    var sandcastle = new SandCastle({
      api: './examples/api.js'
    });

    var script = sandcastle.createScript("\
      exports.main = function() {\
        getFact(function(fact) {\
          exit(fact);\
        });\
      }\
    ");

    script.on('exit', function(err, result) {
      equal(result, 'The rain in spain falls mostly on the plain.', prefix);
      sandcastle.kill();
      finished();
    });

    script.run();
  },
  'an API can be provided for untrusted JavaScript to interact with along with per-script API code': function(finished, prefix) {
    var sandcastle = new SandCastle({
      api: './examples/api.js'
    });

    var script = sandcastle.createScript("\
      exports.main = function() {\
        callAdditional(function(fact) {\
          exit(fact);\
        });\
      }\
    ", {extraAPI: "function anotherFunction(cb) { cb('The reign in spane falls mostly on the plain') }" });

    script.on('exit', function(err, result) {
      equal(result, 'The reign in spane falls mostly on the plain', prefix);
      sandcastle.kill();
      finished();
    });

    script.run();
  },
  'looping script should cause timeout event to be called and sandbox to respawn': function(finished, prefix) {
    var sandcastle = new SandCastle({
      api: './examples/api.js',
      timeout: 2000
    });

    var loopingScript = sandcastle.createScript("\
      exports.main = function() {\
        while(true) {};\
      }\
    ");

    var safeScript = sandcastle.createScript("\
      exports.main = function() {\
        exit('banana');\
      }\
    ");

    safeScript.on('exit', function(err, result) {
      equal(result, 'banana', prefix);
      sandcastle.kill();
      finished();
    });

    loopingScript.on('timeout', function() {
      safeScript.run();
    });

    loopingScript.run();
  },
  'sandbox should return a human readable stacktrace': function(finished, prefix) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
        exports.main = function() {\n\
          var net = require('net');\n\
        }\n\
      "
    );

    script.on('exit', function(err, result) {
      equal(err.stack.indexOf('2:21') > -1, true, prefix);
      sandcastle.kill();
      finished();
    });
    script.run();
  },
  'sandbox pool should run multiple scripts': function(finished, prefix) {    
    var pool = new Pool({numberOfInstances: 5});

    var scriptsExited = 0;

    for(var i = 0; i < 20; ++i) {
      var script = pool.createScript("\
          exports.main = function() {\n\
            exit(testGlobal);\n\
          }\n\
        "
      );
      script.on('exit', function(err, result) {
        equal(10, result, prefix);
        scriptsExited++;
        if(scriptsExited == 10) {
          pool.shutdown();
          finished();
        }
      });
      script.run({testGlobal: 10});
    }
  },
  'sandbox pool should run scripts on non blocking instances': function(finished, prefix) {    
    var pool = new Pool({numberOfInstances: 2});
    var exited = false;
    // Create blocking script.
    var script = pool.createScript("\
        exports.main = function() {\n\
          while(true);\
        }\n\
      "
    );
    script.run();

    var scriptsExited = 0;
    for(var i = 0; i < 10; ++i) {
      var script2 = pool.createScript("\
          exports.main = function() {\n\
            exit(10);\n\
          }\n\
        "
      );
      script2.on('exit', function(err, result) {
        equal(10, result, prefix);
        scriptsExited++;
        if(scriptsExited == 10) {
          pool.shutdown();
          exited = true;
          finished();
        }
      });
      script2.run();
    }
    setTimeout(function(){ 
      if(!exited) {
        equal(false, true, prefix); 
      }
    }, 3000);
  },
  'do not create a pool, if there are zero or negative amount of specified instances': function(finished, prefix) {    
    var pool = null;
    try {
      pool = new Pool({numberOfInstances: 0});
      equal(false, true, prefix);
    } catch (error) {
      notEqual(-1, error.indexOf("Can't create a pool with zero instances"), prefix);
      finished();
    }
  },
}