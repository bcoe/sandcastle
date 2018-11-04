SandCastle
==========

[![Build Status](https://travis-ci.org/bcoe/sandcastle.png)](https://travis-ci.org/bcoe/sandcastle)

A simple and powerful sandbox for running untrusted JavaScript.

The Impetus
-----------

For a project I'm working on, I needed the ability to run untrusted JavaScript code.

I had a couple specific requirements:

* I wanted the ability to whitelist an API for inclusion within the sandbox.
* I wanted to be able to run multiple untrusted scripts in the same sandboxed subprocess.
* I wanted good error reporting and stack-traces, when a sandboxed script failed.

I could not find a library that met all these requirements, enter SandCastle.

What Makes SandCastle Different?
---------------------

* It allows you to queue up multiple scripts for execution within a single sandbox.
  * This better suits Node's evented architecture.
* It provides reasonable stack traces when the execution of a sandboxed script fails.
* It allows an API to be provided to the sandboxed script being executed.
* It provides all this in a simple, well-tested, API.
* Now Uses a Memory Mapped File (mmap) to increase performance for large scripts.

Installation
------------

```bash
npm install sandcastle
```

Creating and Executing a Script
----------------------

```javascript
var SandCastle = require('sandcastle').SandCastle;

var sandcastle = new SandCastle();

var script = sandcastle.createScript("\
  exports.main = function() {\
    exit('Hey ' + name + ' Hello World!');\
  }\
");

script.on('exit', function(err, output) {
    console.log(output); // Hello World!
});

script.run({name: 'Ben'});// we can pass variables into run.
```

__Outputs__

```bash
Hey Ben Hello World!
```

* __exit(output):__ from within untrusted code, causes a sandboxed script to return.
  * Any JSON serializable data passed into __exit()__ will be passed to the output parameter of an __exit__ event.
* __on('exit'):__ this event is called when an untrusted script finishes execution.
* __run()__ starts the execution of an untrusted script.


SandCastle Options
----------------------

The following options may be passed to the SandCastle constructor:

* `timeout` &mdash; number of milliseconds to allow script to run (defaults to 5000 ms)
* `memoryLimitMB` &mdash; maximum amount of memory that a script may consume  (defaults to 0)
* `useStrictMode` &mdash; boolean; when true script runs in strict mode (defaults to false)
* `api` &mdash; path to file that defines the API accessible to script
* `cwd` &mdash; path to the current working directory that the script will be run in (defaults to `process.cwd()`)
* `spawnExecPath` &mdash; path to a external node binary to run the sandbox with. (defaults to `process.execPath`) _This is a [temporary workaround](https://github.com/rogerwang/node-webkit/issues/213) which allows you to run the sandbox within [node-webkit](https://github.com/rogerwang/node-webkit)_
* `refreshTimeoutOnTask` &mdash; boolean; refreshes the timeout whenever an answer to a task will be sent to the script
* `sharedFileID` &mdash; string; suffix (shared-sharedFileID) to the mmap file temporarily saved to your /tmp folder


Executing Scripts on Pool of SandCastles
----------------------
A pool consists of several SandCastle child-processes, which will handle the script execution. Pool-object is a drop-in replacement of single Sandcastle instance. Only difference is, when creating the Pool-instance.

You can specify the amount of child-processes with parameter named numberOfInstances (default = 1).
```javascript
var Pool = require('sandcastle').Pool;

var poolOfSandcastles = new Pool( { numberOfInstances: 3 }, { timeout: 6000 } );

var script = poolOfSandcastles.createScript("\
  exports.main = function() {\
    exit('Hello World!');\
  }\
");

script.on('exit', function(err, output) {
    console.log(output);
});

script.run();
```

Handling Timeouts
-----------------------

If a script takes too long to execute, a timeout event will be fired:

```javascript
var SandCastle = require('sandcastle').SandCastle;

var sandcastle = new SandCastle({ timeout: 6000 });

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

__Outputs__

```bash
I timed out, oh what a silly script I am!
```

Handling Errors
-----------------------

If an exception occurs while executing a script, it will be returned as the first parameter in an __on(exit)__ event.

```bash
var SandCastle = require('sandcastle').SandCastle;

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
```

__Outputs__

```bash
require is not defined
ReferenceError: require is not defined
    at Object.main ([object Context]:2:5)
    at [object Context]:4:9
    at Sandbox.executeScript (/Users/bcoe/hacking/open-source/sandcastle/lib/sandbox.js:58:8)
    at Socket.<anonymous> (/Users/bcoe/hacking/open-source/sandcastle/lib/sandbox.js:16:13)
    at Socket.emit (events.js:64:17)
    at Socket._onReadable (net.js:678:14)
    at IOWatcher.onReadable [as callback] (net.js:177:10)
```

Providing an API
------------------------

When creating an instance of SandCastle, you can provide an API. Functions within this API will be available inside of the untrustred scripts being executed.

__An Example of an API:__

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

```javascript
var SandCastle = require('sandcastle').SandCastle;

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

Exporting Multiple Functions
------------------------

Rather than main, you create a script file that exports multiple methods.
_Notice that one extra parameter `methodName` is available within the callback functions._

```javascript
var SandCastle = require('sandcastle').SandCastle;

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
	console.log(methodName); // foo, bar, hello
});

// take note that a single script should only be
// executing a single method at a time.
var cb = null;
async.eachLimit(['foo', 'bar', 'hello'], 1, function(item, _cb) {
  cb = _cb;
  script.run(item, {name: 'Ben'});
});
```

Providing Tasks
------------------------

In contrast to the [API](#providing-an-api) which runs trusted code __inside__ the sandbox, the script can request that a task (a snippet of code) is executed in another process.

To run a task call `runTask(taskName, options = {})` and provide a `onTask(taskName, data)` method within the script file. Alternatively you can create a task specific function `on{TaskName}Task`, to receive data for an individual task.

```javascript
var script = sandcastle.createScript("\
  exports = {\
    onGetContentTask: function (data) {\
      // received content. do something here...
    },\
    main: function() {\
      runTask('getContent', {url: 'http://foo.bar'});\
    }\
  }\
");

script.on('task', function (err, taskName, options, methodName, callback) {
  if (whitelistedUrls.indexOf(options.url) !== -1) {
    http.get(options.url, function(res) {
      callback(res);
    }).on('error', function(e) {
      callback(null);
    });
  }
});
```

`refreshTimeoutOnTask` can be used to control the timeout behavior of the script executing the task. If set to true, the script will have its timeout reset when the task is completed.

Debugging
---------
Make debugging a little easier by ensuring the DEBUG environment variable includes `sandcastle`.

Contributing
---------

SandCastle will be an ongoing project, please be liberal with your feedback, criticism, and contributions.

* send pull requests, for creative exploits that you find find for the SandBox. Sandboxing JavaScript is hard, it's unlikely that this library will ever be 100% bullet-proof.
* write unit tests for your contributions!

Copyright
---------

Copyright (c) 2012 Benjamin Coe. See LICENSE.txt for further details.
