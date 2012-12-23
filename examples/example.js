var SandCastle = require('../lib').SandCastle;

var sandcastle = new SandCastle({
  api: './examples/api.js' // We provide an API with the setTimeout function.
});

// A script that executes after 1 second.
var script1 = sandcastle.createScript("\
  exports.main = function() {\
    setTimeout(function() {\
      exit('script1 complete')\
    }, 1000)\
  }\
");

script1.on('exit', function(err, output) {
  console.log(output);
});

script1.on('timeout', function() {
  console.log('rescheduling script 1');
  script1.run();
});

// a malicious script that loops infinitely.
var script2 = sandcastle.createScript("\
  exports.main = function() {\
    while(true) {};\
  }\
");

script2.on('exit', function(err, output) {
  console.log(output);
});

script2.on('timeout', function() {
  console.log('not rescheduing 2 it is malicious.')
});

// a script that exists after 2 seconds.
var script3 = sandcastle.createScript("\
  exports.main = function() {\
    setTimeout(function() {\
      exit('script3 complete')\
    }, 2000)\
  }\
");

script3.on('exit', function(err, output) {
  console.log(output);
});

script3.on('timeout', function() {
  console.log('rescheduling script 3');
  script3.run();
});

// Running script 1 and 3 will take.
// about 2 seconds to complete.
console.log('running script 1')
script1.run();
console.log('running script 2')
script3.run();

var id = setInterval(function() {
  if (script1.exited && script3.exited) {
    clearInterval(id);

    console.log('both script1 and script 2 exited.')
    console.log('script2 is malicious and will cause the sandbox to shutdown');
    // Running script 1 and 3 will take.
    // about 2 seconds to complete.
    console.log('running script 1')
    script1.run();
    console.log('running script 2')
    script2.run();
    console.log('running script 3')
    script3.run();
  }
}, 1000);
