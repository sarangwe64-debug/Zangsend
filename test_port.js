import http from 'http';

const req = http.request({
  hostname: '127.0.0.1',
  port: 54321,
  path: '/functions/v1/find-email',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, (res) => {
  console.log('STATUS:', res.statusCode);
  res.on('data', (chunk) => {
    console.log('BODY:', chunk.toString());
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(JSON.stringify({ url: 'test' }));
req.end();
