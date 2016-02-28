var fs = require('fs');
var lodash = require('lodash')

exports.api = {
  extend: function () {
    lodash.extend.apply(this, arguments)
  },
  getFact: function(callback) {
    fs.readFile('./examples/example.txt', function (err, data) {
      if (err) throw err;
      callback(data.toString());
    });
  },
  setTimeout: function(callback, timeout) {
    setTimeout(callback, timeout);
  },
  callAdditional: function(callback) {
    anotherFunction(callback)
  },
  cwd: function() {
    return process.cwd();
  }
}
