const fs = require('fs');
const path = require('path');

function findRoutes(dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      results = results.concat(findRoutes(fullPath));
    } else if (item === 'route.ts') {
      results.push(fullPath);
    }
  }
  return results;
}

const routes = findRoutes('./app/api');

routes.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes("export const dynamic")) {
    // Add after last import
    content = content.replace(
      /(import[^;]+;)(\s*\n)(?!import)/,
      "$1$2\nexport const dynamic = 'force-dynamic';\n"
    );
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
  } else {
    console.log('Already fixed:', file);
  }
});

console.log('Done!');
