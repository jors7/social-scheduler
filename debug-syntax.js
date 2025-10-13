const fs = require('fs');
const babel = require('@babel/parser');

const code = fs.readFileSync('app/dashboard/create/new/page.tsx', 'utf8');

try {
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx']
  });
  console.log('✅ File parses successfully!');
} catch (error) {
  console.log('❌ Syntax Error Found:');
  console.log('Line:', error.loc.line);
  console.log('Column:', error.loc.column);
  console.log('Message:', error.message);

  // Show context
  const lines = code.split('\n');
  const errorLine = error.loc.line - 1;
  console.log('\nContext:');
  for (let i = Math.max(0, errorLine - 3); i < Math.min(lines.length, errorLine + 3); i++) {
    const marker = i === errorLine ? '>>> ' : '    ';
    console.log(`${marker}${i + 1}: ${lines[i]}`);
  }
}
