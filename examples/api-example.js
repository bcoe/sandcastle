// example of using an external API. In this case
// we pul lin lodash's extend.
var SandCastle = require('../lib').SandCastle;

var sandcastle = new SandCastle({
  api: './examples/api.js', // We provide an API with the setTimeout function.,
});

var script = sandcastle.createScript("\
  exports.main = function() {\
    var o1 = {a: 2};\
    var o2 = {b: 3};\
    extend(o1, o2);\
    exit(JSON.stringify(o1));\
  }\
");

script.on('exit', function(err, output) {
    console.log(output); // Hello World!
    process.exit(0);
});

script.run();
