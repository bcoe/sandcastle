var SandCastle = require('../lib').SandCastle,
  equal = require('assert').equal;

var sandcastle = new SandCastle({
  api: './examples/api.js', // We provide an API with the setTimeout function.,
  timeout: 2000
});

(function execute(n) {

  if (!n) {
    process.exit(0);
    return;
  }

  // Keep track of execution stats.
  var stats = {
    script1: 0,
    script2: 0,
    script3: 0
  };

  // A non-malicious script with a timeout.
  var script1 = sandcastle.createScript("\
    exports.main = function() {\
      setTimeout(function() {\
        exit('script1')\
      }, 10)\
    }\
  ");

  script1.on('exit', function(err, output) {
    stats[output] += 1;
  });

  script1.on('timeout', function() {
    // reschedule script1 when it times out.
    script1.run();
  });

  // a malicious script that loops infinitely.
  var script2 = sandcastle.createScript("\
    exports.main = function() {\
      while('script2') {};\
    }\
  ");

  script2.on('exit', function(err, output) {
    stats[output] += 1;
  });

  // A non-malicious script with a timeout.
  var script3 = sandcastle.createScript("\
    exports.main = function() {\
      setTimeout(function() {\
        exit('script3')\
      }, 1000)\
    }\
  ");

  script3.on('exit', function(err, output) {
    stats[output] += 1;
  });

  script3.on('timeout', function() {

    // reschedule script3 when it times out.

    script3.removeAllListeners('exit');
    script3.on('exit', function(err, output) {
      stats.script3 += 1;
      
      // Make sure the scripts were
      // executed the appropriate # of times.
      equal(stats.script1, 2);
      equal(stats.script2, 0);
      equal(stats.script3, 2);
      console.log('scripts executed the correct # of times', stats)
      setTimeout(function() {
        execute(n - 1);
      }, 0);
    });
    script3.run();
  });

  // Running script 1 and 3 will take.
  // about 2 seconds to complete.
  script1.run();
  script3.run();

  var id = setInterval(function() {
    if (script1.exited && script3.exited) {
      clearInterval(id);

      // both script1 and script 2 exited after their first execution.
      // next we will schedule them with a malicious script.

      script3.run();
      script1.run();
      // script2 is malicious and will cause the sandbox to shutdown
      // script1 and script3's timeout methods however cause them to be
      // rescheduled.
      script2.run();
    }
  }, 1000);

})(1000);