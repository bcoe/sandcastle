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
  }
}