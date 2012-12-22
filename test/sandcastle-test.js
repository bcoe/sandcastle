var equal = require('assert').equal,
  SandCastle = require('../lib').SandCastle;


exports.tests = {
  'on("exit") is fired when a sandboxed script calls the exit method': function(finished, prefix) {    
    var SandCastle = new SandCastle();
  }
}