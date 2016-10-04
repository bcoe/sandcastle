var os = require('os');

function unixSocketName(instanceNumber) {
  var instanceString = typeof instanceNumber === 'number' ? '_' + instanceNumber : '';
  return '/tmp/sandcastle' + instanceString + '.sock';
}

function windowsSocketName(instanceNumber) {
  var instanceString = typeof instanceNumber === 'number' ? '_' + instanceNumber : '';
  return '\\\\.\\pipe\\sandcastle' + instanceString;
}

exports.socketName = os.platform() === 'win32' ? windowsSocketName : unixSocketName
