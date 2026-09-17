const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function getFiles(dir) {
  let files = [];
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...getFiles(full));
    else if (full.endsWith('.yml') || full.endsWith('.yaml')) files.push(full);
  }
  return files;
}

const files = getFiles(path.resolve(__dirname, '../../.github'));
let invalid = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  try {
    yaml.load(content);
    console.log('YAML OK:', file);
  } catch (e) {
    console.error('YAML ERROR:', file, e.message);
    invalid.push(file);
  }

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('uses:')) {
      const match = line.match(/uses:\s*([^\s#]+)/);
      if (match) {
        const action = match[1];
        if (!action.startsWith('./')) {
          const parts = action.split('@');
          const version = parts[1];
          if (!version || !/^[a-f0-9]{40}$/i.test(version)) {
            console.warn('NOT PINNED TO SHA:', file, 'Line', idx + 1, ':', action);
            invalid.push(file + ':' + (idx + 1));
          }
        }
      }
    }
  });
}

if (invalid.length > 0) {
  console.error('\nIssues found:', invalid.length, invalid);
  process.exit(1);
} else {
  console.log('\nAll YAML files and action SHAs verified successfully! Zero unpinned actions.');
}
