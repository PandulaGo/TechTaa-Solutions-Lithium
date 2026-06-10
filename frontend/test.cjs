const { Agent } = require('undici');

const agent = new Agent({
  connect: {
    rejectUnauthorized: false,
  },
});

fetch('https://localhost:5701/reports/invokereport', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: '{"test":true}',
  dispatcher: agent,
}).then(r => {
  console.log('Status:', r.status, 'OK:', r.ok);
  return r.text();
}).then(t => console.log('Body:', t.substring(0, 200)))
.catch(e => console.error('Error:', e.message, e.cause?.message || ''));
