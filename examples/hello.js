var SandCastle = require('../lib').SandCastle;

var sandcastle = new SandCastle();

var script = sandcastle.createScript("\
  exports.main = function() {\
    exit('Hello World!');\
  }\
");

script.on('exit', function(err, output) {
    console.log(output); // Hello World!
    process.exit(0);
});

script.run();
