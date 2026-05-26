var fs = require('fs');

var g  = fs.readFileSync('./google-credentials.json', 'utf8');
var sa = fs.readFileSync('./service-account.json', 'utf8');

console.log('GC first 50:', JSON.stringify(g.slice(0, 50)));
console.log('GC char0 code:', g.charCodeAt(0));

try { JSON.parse(g);  console.log('GC:  valid JSON'); }
catch(e){ console.log('GC  ERROR:', e.message); }

try { JSON.parse(sa); console.log('SA:  valid JSON'); }
catch(e){ console.log('SA  ERROR:', e.message); }
