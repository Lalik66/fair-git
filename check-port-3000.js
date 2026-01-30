const net = require('net');
const s = net.createServer();
s.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.log('Port 3000 still in use');
    process.exit(1);
  }
});
s.listen(3000, () => {
  console.log('Port 3000 is free');
  s.close();
});
