var equal = require('assert').equal,
  SandCastle = require('../lib').SandCastle;

exports.tests = {
  'on("exit") is fired when a sandboxed script calls the exit method': function(finished, prefix) {
    new SandCastle(function(err, sandcastle) {
      var script = sandcastle.createScript("\
        exports.main = function() {\
          var result = 1 + 1;\
          exit({\
            results: [result]\
          });\
        }\
      ")

      script.on('exit', function(err, result) {
        equal(result.results[0], 2, prefix)
        finished();
      });

      script.run();

    });
  },
  'require() cannot be called from sandbox': function(finished, prefix) {
    new SandCastle(function(err, sandcastle) {
      var script = sandcastle.createScript("\
        exports.main = function() {\
          var net = require('net');\
        }\
      ")

      script.on('exit', function(err, result) {
        equal(err.message, 'require is not defined', prefix)
        finished();
      });

      script.run();
    });
  },
  'an API can be provided for untrusted JavaScript to interact with': function(finished, prefix) {
    new SandCastle({
      api: './examples/api.js'
    }, function(err, sandcastle) {
      var script = sandcastle.createScript("\
        exports.main = function() {\
          getFact(function(fact) {\
            exit(fact);\
          });\
        }\
      ")

      script.on('exit', function(err, result) {
        equal(result, 'The rain in spain falls mostly on the plain.', prefix)
        finished();
      });

      script.run();
    });
  }
}