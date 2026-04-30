const fs = require('fs');
const content = fs.readFileSync('src/app/page.tsx', 'utf8');
const newContent = content.substring(0, content.indexOf('return (')) + 'return <div>Test</div>; }';
fs.writeFileSync('src/app/page.tsx', newContent);
