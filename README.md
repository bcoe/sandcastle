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
** This better suits Node's evented architecture.
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

script1.on('exit', function(err, output) {
    console.log(output); // Hello World!
});
```

__Outputs__

```bash

```

* __exit():__ causes a sandboxed script to return.
** Any JSON serializable data passed into __exit()__, will be returned in the output parameter of an __exit__ event.
* __on('exit'):__ on exit is called when an untrusted script finishes executing.

Handling Timeouts
-----------------------

Handling Errors
-----------------------

```bash

```

Providing an API
------------------------

SandCastle will be an ongoing project, please be liberal with your feedback, criticisms, and contributions.