// Demonstrate an exploit based on modifying the prototypes
// of built-in objects.
//
// This file is the 'good' part of the demonstration,
// showing a plausible way that sandcastle might be used
// to run untrusted code.
//
// The companion file hack-evil.js contains the script that
// exploits the hole.

var fs = require('fs');
var path = require('path');
var SandCastle = require('../lib').SandCastle;

var sandcastle = new SandCastle();

function runIt(done) {
	var source = fs.readFileSync(
		path.dirname(module.filename) + '/hack-evil.js',
		{encoding: 'utf8'});
	var script = sandcastle.createScript(source);

	script.on('exit', function(err, output) {
		if (err)
			console.log('Error:', err);
		else
			console.log('Output:', output);
		done();
	});

	var globals = {
		parameters: {
			string: "some string"
		}
	};

	script.run(globals);
}

runIt(runIt.bind(null, function() {}));
