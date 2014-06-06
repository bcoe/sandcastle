exports.api = {
  _state: {},

  getState: function () {
    return _state;
  },

  setState: function (state) {
    _state = state;
  }
};