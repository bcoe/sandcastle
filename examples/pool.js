var Pool = require('../lib').Pool;

// You can give options for SandCastle instances with second parameter.
var poolOfSandcastles = new Pool( { numberOfInstances: 3 }, { useStrictMode: true } );

var script = poolOfSandcastles.createScript("\
  exports.main = function() {\
    exit('Hello World!');\
  }\
");

script.on('exit', function(err, output) {
    console.log(output);
});


var script2 = poolOfSandcastles.createScript("\
  exports.main = function() {\
    exit('Hello World again!');\
  }\
");

script2.on('exit', function(err, output) {
  console.log(output);
});

script.run();
script2.run();
