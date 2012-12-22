var _ = require('underscore');

function SandCastle(opts) {

}

exports.SandCastle = SandCastle;
/*
var net = require('net');

var client = net.createConnection('/tmp/sandcastle.sock',
    function() { //'connect' listener
  console.log('client connected');
  client.write('world!\r\n');
  client.end();
});

client.on('data', function(data) {
  console.log(data.toString());
  client.end();
});

client.on('end', function() {
  console.log('client disconnected');
});*/