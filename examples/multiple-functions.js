var async = require('async'),
  SandCastle = require('../lib').SandCastle,
  sandcastle = new SandCastle();

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
  return cb();
});

var cb = null;

async.eachLimit(['foo', 'bar', 'hello'], 1, function(item, _cb) {
  cb = _cb;
  script.run(item, {name: 'Ben'});
});
