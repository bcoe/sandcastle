var equal = require('assert').equal,
  assert = require('assert'),
  notEqual = require('assert').notEqual,
  SandCastle = require('../lib').SandCastle,
  Pool = require('../lib').Pool,
  path = require('path');

describe('SandCastle', function () {
  it('should fire on("exit") when a sandboxed script calls the exit method', function (finished) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports.main = function() {\
        var result = 1 + 1;\
        exit({\
          results: [result]\
        });\
      }\
    ");

    script.on('exit', function (err, result, methodName) {
      sandcastle.kill();
      equal(result.results[0], 2);
      equal('main', methodName);
      finished();
    });

    script.run();
  });

  it('should pass global variables to run()', function (finished) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports.main = function() {\
        exit(foo);\
      }\
    ");

    script.on('exit', function (err, result, methodName) {
      sandcastle.kill();
      equal('bar', result);
      equal('main', methodName);
      finished();
    });

    script.run({foo: 'bar'});
  });

  it('should run the specified function and pass global variables correctly', function (finished) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports = {\
        foo: function () {\
          exit(foo);\
        }\
      };\
    ");

    script.on('exit', function (err, result, methodName) {
      sandcastle.kill();
      equal('bar', result);
      equal('foo', methodName);
      finished();
    });
    script.run('foo', {foo: 'bar'});
  });

  it('should not allow require() to be called', function (finished) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports.main = function() {\
        var net = require('net');\
      }\
    ");

    script.on('exit', function (err, result) {
      sandcastle.kill();
      assert(err.message.match(/require is not defined/));
      finished();
    });

    script.run();
  });

  it('should able to exit(null)', function (finished) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports.main = function() {\
        exit(null);\
      }\
    ");

    script.on('exit', function (err, result) {
      sandcastle.kill();
	  equal(result,null);
      finished();
    });

    script.run();
  });

  it('should provide an API', function (finished) {
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

    script.on('exit', function (err, result) {
      sandcastle.kill();
      equal(result, 'The rain in spain falls mostly on the plain.');
      finished();
    });

    script.run();
  });

  it('should allow API to be passed in as string', function(finished) {
    var sandcastle = new SandCastle({
      api: "_ = require('lodash');\
        exports.api = {\
          map: function(values, cb) {\
            return _.map(values, cb);\
          }\
      }"
    });

    var script = sandcastle.createScript("\
      exports.main = function() {\
        exit(map([{a: 1}, {a: 2}, {a: 3}], function(obj) {\
          return obj.a;\
        }))\
      }\
    ");

    script.on('exit', function (err, result) {
      sandcastle.kill();
      equal(JSON.stringify(result), JSON.stringify([1, 2, 3]));
      finished();
    });

    script.run();
  });

  it('should provide an API and a per-script API', function (finished) {
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

    script.on('exit', function (err, result) {
      sandcastle.kill();
      equal(result, 'The reign in spane falls mostly on the plain');
      finished();
    });

    script.run();
  });

  it('should timeout and respawn when looping script runs', function (finished) {
    this.timeout(10000);

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

    safeScript.on('exit', function (err, result) {
      sandcastle.kill();
      equal(result, 'banana');
      finished();
    });

    loopingScript.on('timeout', function (methodName) {
      equal(methodName, 'main');
      safeScript.run();
    });

    loopingScript.run();
  });

  it('should return a human readable stacktrace', function (finished) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
        exports.main = function() {\n\
          var net = require('net');\n\
        }\n\
      "
    );

    script.on('exit', function (err, result) {
      sandcastle.kill();
      equal(err.stack.indexOf('2:21') > -1, true);
      finished();
    });
    script.run();
  });

  it('should enforce memory limit', function (finished) {
    this.timeout(10000);

    var sandcastle = new SandCastle({memoryLimitMB: 10});

    var script = sandcastle.createScript("\
        exports.main = function() {\n\
          var test = []; \
          for(var i = 0; i < 5000000; ++i) { \
            test[i] = 'a'; \
          } \
          exit(1); \
        }\n\
      "
    );

    script.on('exit', function (err, result) {
      // Should not go here.
      equal(false, true);
    });

    script.on('timeout', function (err, result) {
      sandcastle.kill();
      finished();
    });
    script.run();
  });

  it('sets cwd, when running scripts', function(finished) {
    var cwd = process.cwd() + '/test';

    var sandcastle = new SandCastle({
      api: '../examples/api.js',
      cwd: cwd
    });

    var script = sandcastle.createScript("\
      exports.main = function() {\
        exit({ cwd: cwd() });\
      }\
    ");

    script.on('exit', function(err, result) {
      equal(cwd, result.cwd);
      sandcastle.kill();
      finished();
    });

    script.run();
  });

  it('should allow api to see globals',function(finished){
    var sandcastle = new SandCastle({
      api: './examples/contextObjectApi.js'
    });

    var script = sandcastle.createScript("\
     exports.main = function() {\n\
       var globalState = {};\n\
       if(typeof state === \"undefined\"){\n\
         globalState = 'none';\n\
       }\n\
       else{\n\
         globalState = state;\n\
       }\n\
       exit({\n\
         globalState:globalState,\n\
         apiState:stateManager.getState()\n\
       });\n\
     }\n");

    script.on('exit', function(err, result) {
       equal(result.globalState, 'none');
       equal(result.apiState.key, 'val');
       sandcastle.kill();
       finished();
    });

    script.run({state:{key:'val'}});
  });

  it('should correctly run the "test" task and and return the result', function (finished) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports = {\
        onTestTask: function (data) {\
          if (data.count > 1) {\
            exit(data);\
          }\
          else {\
            runTask('test', data);\
          }\
        },\
        main: function() {\
          runTask('test', {count: 0});\
        }\
      }\
    ");

    script.on('task', function (err, taskName, options, methodName, callback) {
        options.count++;

        equal(taskName, 'test');
        equal(methodName, 'main');

        return callback(options);
    });

    script.on('exit', function (err, result) {
      equal(result.count, 2);
      sandcastle.kill();
      finished();
    });

    script.run();
  });
});
