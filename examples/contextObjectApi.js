
var StateManager = function(){
	var state = contextObject.state;

	delete contextObject.state;

	this.getState=function(){
		return state;
	};
};
exports.api = {
	stateManager: new StateManager()
};
