var equal = require('assert').equal,
  notEqual = require('assert').notEqual,
  Pool = require('../lib').Pool;

describe('Pool', function () {
  it('should run multiple scripts', function (finished) {
    var pool = new Pool({numberOfInstances: 5});

    var scriptsExited = 0;

    for (var i = 0; i < 20; ++i) {
      var script = pool.createScript("\
          exports.main = function() {\n\
            exit(testGlobal);\n\
          }\n\
        "
      );
      script.on('exit', function (err, result) {
        scriptsExited++;
        if (scriptsExited == 10) {
          pool.kill();
          equal(10, result);
          finished();
        }
      });
      script.run({testGlobal: 10});
    }
  });

  it('should run scripts on non blocking instances', function (finished) {
    var pool = new Pool({numberOfInstances: 2});
    var exited = false;
    // Create blocking script.
    var script = pool.createScript("\
        exports.main = function() {\n\
          while(true);\
        }\n\
      "
    );
    script.run();

    var scriptsExited = 0;
    for (var i = 0; i < 10; ++i) {
      var script2 = pool.createScript("\
          exports.main = function() {\n\
            exit(10);\n\
          }\n\
        "
      );
      script2.on('exit', function (err, result) {
        scriptsExited++;
        if (scriptsExited == 10) {
          pool.kill();
          equal(10, result);
          exited = true;
          finished();
        }
      });
      script2.run();
    }
    setTimeout(function () {
      if (!exited) {
        equal(false, true);
      }
    }, 3000);
  });

  it('should not be created if there are zero or negative amount of specified instances', function (finished) {
    var pool = null;
    try {
      pool = new Pool({numberOfInstances: 0});
      equal(false, true);
    } catch (error) {
      notEqual(-1, error.indexOf("Can't create a pool with zero instances"));
      finished();
    }
  });
});
