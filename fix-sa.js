var fs   = require('fs');
var raw  = fs.readFileSync('./service-account.json', 'utf8').replace(/^\uFEFF/, '').trim();

var lines = raw.split('\n');
var obj   = {};

lines.forEach(function(line) {
  line = line.trim();
  if (!line || line[0] === '[') return;
  var eqIdx = line.indexOf('=');
  if (eqIdx === -1) return;
  var key = line.slice(0, eqIdx).trim();
  var val = line.slice(eqIdx + 1).trim();
  if (val[0] === '"') val = val.slice(1);
  if (val[val.length - 1] === '"') val = val.slice(0, -1);
  val = val.split('\\n').join('\n');
  obj[key] = val;
});

var json = JSON.stringify(obj, null, 2);
fs.writeFileSync('./service-account.json', json, 'utf8');
console.log('service-account.json converted successfully');
console.log('Keys:', Object.keys(obj).join(', '));
