const net = require('net');
const s = net.createServer();
s.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('Port 3002 still in use');
    process.exit(1);
  }
});
s.listen(3002, () => {
  console.log('Port 3002 is free');
  s.close();
});
