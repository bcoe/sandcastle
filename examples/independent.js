var fs = require('fs');
var SandCastle = require('../lib').SandCastle;

var sandcastle = new SandCastle({
  api: './stateApi.js'
});

var script = sandcastle.createScript("\
  exports.main = {\
    foo: function() {\
      setState({ fooName: name });\
      exit('Hello ' + name + '!');\
    },\
    bar: function() {\
      var state = getState();\
      state.barName = name;\
      setState(state);\
      \
      exit('Hello ' + name + '! Your old name was: ' + state.fooName);\
    },\
    hello: function() {\
      var state = getState();\
      exit('Hey ' + name + '! You changed your name from ' + state.fooName + ' to ' + state.barName + '!');\
    }\
  }\
");

script.on('exit', function (err, output, methodName) {
  console.log(output);

  run();
});

var start = 0;
var methodsToCall = [
  {
    method: 'foo',
    name: 'Foo'
  },
  {
    method: 'bar',
    name: 'Bar'
  },
  {
    method: 'hello',
    name: 'Hello'
  }
];
var run = function() {
  if (start < methodsToCall.length) {
    script.run('main.' + methodsToCall[start].method, { name: methodsToCall[start].name });
    start++;
  }
};

run();
