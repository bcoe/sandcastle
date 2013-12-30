var equal = require('assert').equal,
  notEqual = require('assert').notEqual,
  SandCastle = require('../lib').SandCastle,
  Pool = require('../lib').Pool;


describe('Sandcastle', function () {
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

    script.on('exit', function (err, result) {
      equal(result.results[0], 2)
      sandcastle.kill();
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

    script.on('exit', function (err, result) {
      equal('bar', result)
      sandcastle.kill();
      finished();
    });

    script.run({foo: 'bar'});
  });

  it('should not allow require() to be called', function (finished) {
    var sandcastle = new SandCastle();

    var script = sandcastle.createScript("\
      exports.main = function() {\
        var net = require('net');\
      }\
    ");

    script.on('exit', function (err, result) {
      equal(err.message, 'require is not defined');
      sandcastle.kill();
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
      equal(result, 'The rain in spain falls mostly on the plain.');
      sandcastle.kill();
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
      equal(result, 'The reign in spane falls mostly on the plain');
      sandcastle.kill();
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
      equal(result, 'banana');
      sandcastle.kill();
      finished();
    });

    loopingScript.on('timeout', function () {
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
      equal(err.stack.indexOf('2:21') > -1, true);
      sandcastle.kill();
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

  it('should enforce js-strict mode', function (finished) {
    var sandcastle = new SandCastle({useStrictMode: true});

    var script = sandcastle.createScript("\
        exports.main = function() {\n\
          globalObjectAccidentalPollution = true; \
          exit(0); \
        }\n\
      "
    );

    script.on('exit', function (err, result) {
      notEqual(-1, err.toString().indexOf("globalObjectAccidentalPollution is not defined"));
      sandcastle.kill();
      finished();
    });
    script.run();
  });

});