var SandCastle = require('../lib').SandCastle;

var sandcastle = new SandCastle();

var script = sandcastle.createScript("\
  exports = {\
    foo: function() {\
      exit('Hello Foo!');\
    },\
    bar: function() {\
      exit('Hello Bar!');\
    },\
    hello: function() {\
      exit('Hey ' + name + ' Hello World!');\
    }\
  }\
");

script.on('timeout', function(methodName) {
  console.log(methodName);
});

script.on('exit', function(err, output, methodName) {
  console.log(methodName, output); // foo, bar, hello
});

script.run('foo'); // Hello Foo!
script.run('bar'); // Hello Bar!
script.run('hello', {name: 'Ben'}); // Hey, Ben Hello World!
