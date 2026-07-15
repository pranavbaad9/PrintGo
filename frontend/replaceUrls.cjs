const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'pages');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the hardcoded API URL inside template literals
  // from: `http://${window.location.hostname}:5000/api...`
  // to: `${import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`}/api...`
  const target = 'http://${window.location.hostname}:5000';
  const replacement = '${import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`}';
  
  if (content.includes(target)) {
    content = content.split(target).join(replacement);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
