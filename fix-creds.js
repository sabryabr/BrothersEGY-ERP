var fs  = require('fs');
var raw = fs.readFileSync('./google-credentials.json', 'utf8');

// Remove BOM
raw = raw.replace(/^\uFEFF/, '').trim();

// Check if it is already valid JSON
var isJson = false;
try { JSON.parse(raw); isJson = true; } catch(e) {}

if (isJson) {
  fs.writeFileSync('./google-credentials.json', raw, 'utf8');
  console.log('Already valid JSON - BOM removed');
} else {
  // Convert TOML format to JSON
  var lines = raw.split('\n');
  var obj   = {};
  lines.forEach(function(line) {
    line = line.trim();
    // Skip section headers like [gcp_service_account]
    if (line[0] === '[') return;
    // Skip empty lines
    if (!line) return;
    // Parse key = "value"
    var eqIdx = line.indexOf('=');
    if (eqIdx === -1) return;
    var key = line.slice(0, eqIdx).trim();
    var val = line.slice(eqIdx + 1).trim();
    // Remove surrounding quotes
    if (val[0] === '"') val = val.slice(1);
    if (val[val.length - 1] === '"') val = val.slice(0, -1);
    // Fix escaped newlines in private key
    val = val.split('\\n').join('\n');
    obj[key] = val;
  });
  var json = JSON.stringify(obj, null, 2);
  fs.writeFileSync('./google-credentials.json', json, 'utf8');
  console.log('Converted TOML to JSON successfully');
  console.log('Keys found:', Object.keys(obj).join(', '));
}
