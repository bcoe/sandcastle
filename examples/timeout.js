var SandCastle = require('../lib').SandCastle;

var sandcastle = new SandCastle();

var script = sandcastle.createScript("\
  exports.main = function() {\
    while(true) {};\
  }\
");

script.on('exit', function(err, output) {
    console.log('this will never happen.');
});

script.on('timeout', function() {
    console.log('I timed out, oh what a silly script I am!');
});

script.run();
