var SandCastle = require('../').SandCastle;

var sandcastle = new SandCastle();

var script = sandcastle.createScript("\
  exports.main = function() {\n\
    require('fs');\n\
  }\
");

script.on('exit', function(err, output) {
    console.log(err.message);
    console.log(err.stack);
});

script.run();