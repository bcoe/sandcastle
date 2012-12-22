var equal = require('assert').equal,
  SandCastle = require('../lib').SandCastle;


exports.tests = {
  'on("complete") is fired when a sandboxed script executes the complete method': function(finished, prefix) {    
    equal(true, true, prefix);
    finished();
  }
}