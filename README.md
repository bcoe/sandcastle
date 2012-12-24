SandCastle
==========

A simple and powerful sandbox for running untrusted JavaScript.

The Impetus
-----------

For a project I'm working on, I needed the ability to run untrusted JavaScript code.

I had a couple specific requirements:

* I wanted the ability to whitelist an API for inclusion within the sandbox.
* I wanted to be able to run multiple untrusted scripts in the same sandboxed subprocess:
* I wanted good error reporting and stack-traces, when a sandboxed script failed.

I could not find a library that met all these requirements, enter SandCastle.

What Makes SandCastle different?
---------------------

* It allows you to queue up multiple scripts for execution within a single sandbox.
  * This better suits Node's evented architecture.
* It provides reasonable stack traces when the execution of a sandboxed script fails.
* It allows an API to be provided to the sandboxed script being executed.
* It provides all this in a simple, unit-tested, API.

Creating and Executing a Script
----------------------

```javascript
var SandCastle = require('sandcastle').SandCastle,;

var sandcastle = new SandCastle();

var script = sandcastle.createScript("\
  exports.main = function() {\
    exit('Hello World!');\
  }\
");

script.on('exit', function(err, output) {
    console.log(output); // Hello World!
});

script.run();
```

__Outputs__

```bash

```

* __exit(output):__ causes a sandboxed script to return.
  * Any JSON serializable data passed into __exit()__ will be returned in the output parameter of an __exit__ event.
* __on('exit'):__ on exit is called when an untrusted script finishes.
* __run()__ execute a script.

Handling Timeouts
-----------------------

If a script takes too long to execute, a timeout event will be fired:


```javascript
var SandCastle = require('sandcastle').SandCastle,;

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
```

Handling Errors
-----------------------

If an exception occurs while executing a script, it will be returned as the first parameter in an __on(exit)__ event.

```bash
var SandCastle = require('sandcastle').SandCastle,;

var sandcastle = new SandCastle();

var script = sandcastle.createScript("\
  exports.main = function() {\
    require('fs');\
  }\
");

script.on('exit', function(err, output) {
    console.log(err); // Hello World!
});

script.run();
```

Providing an API
------------------------

When creating an instance of SandCastle, you can provide an API. Functions within this API will be available inside of the untrustred scripts being executed.

__AN Example of an API:__

```javascript
var fs = require('fs');

exports.api = {
  getFact: function(callback) {
    fs.readFile('./examples/example.txt', function (err, data) {
      if (err) throw err;
      callback(data.toString());
    });
  },
  setTimeout: function(callback, timeout) {
    setTimeout(callback, timeout);
  }
}
```

__A Script Using the API:__

```
var sandcastle = new SandCastle({
  api: './examples/api.js'
});

var script = sandcastle.createScript("\
  exports.main = function() {\
    getFact(function(fact) {\
      exit(fact);\
    });\
  }\
");

script.on('exit', function(err, result) {
  equal(result, 'The rain in spain falls mostly on the plain.', prefix);
  sandcastle.kill();
  finished();
});

script.run();
```

SandCastle will be an ongoing project, please be liberal with your feedback, criticisms, and contributions.

Copyright
---------

Copyright (c) 2012 Benjamin Coe. See LICENSE.txt for further details.