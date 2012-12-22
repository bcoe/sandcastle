SandCastle
==========

A simple and powerful sandbox for running untrusted JavaScript.

```javascript
var SandCastle = require('sandcastle').SandCastle;

new SandCastle({
    timeout: 2500
}, function(sandcastle) {
    var script = sandcastle.createScript("\
        exports.main = function() {\
            var result = 1 + 1;\
            exit({\
                results: [result]\
            });\
        }");

    script.on('timeout', function(err) {
        // called if the script takes longer than
        // 2500 ms to execute. 
    });

    script.on('exit', function(err, results) {
        console.log(results); // equals [2].
    });

    script.run();
});
```
