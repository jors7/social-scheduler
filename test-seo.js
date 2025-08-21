// Test script to verify SEO metadata is working
// Run with: node test-seo.js

const pages = [
  { path: '/', name: 'Homepage' },
  { path: '/pricing', name: 'Pricing' },
  { path: '/about', name: 'About' },
  { path: '/blog', name: 'Blog' },
  { path: '/support', name: 'Support' },
  { path: '/terms', name: 'Terms' },
  { path: '/privacy', name: 'Privacy' }
];

async function testSEO() {
  console.log('Testing SEO implementation...\n');
  
  for (const page of pages) {
    const url = `http://localhost:3001${page.path}`;
    console.log(`Testing ${page.name} (${url})...`);
    
    try {
      const response = await fetch(url);
      const html = await response.text();
      
      // Check for meta tags in HTML
      const hasTitle = html.includes('<title>');
      const hasDescription = html.includes('name="description"');
      const hasOGTitle = html.includes('property="og:title"');
      const hasOGDescription = html.includes('property="og:description"');
      const hasTwitterCard = html.includes('name="twitter:card"');
      
      console.log(`  ✓ Title tag: ${hasTitle ? 'Found' : 'Missing'}`);
      console.log(`  ✓ Description: ${hasDescription ? 'Found' : 'Missing'}`);
      console.log(`  ✓ OG Title: ${hasOGTitle ? 'Found' : 'Missing'}`);
      console.log(`  ✓ OG Description: ${hasOGDescription ? 'Found' : 'Missing'}`);
      console.log(`  ✓ Twitter Card: ${hasTwitterCard ? 'Found' : 'Missing'}`);
      
      // Extract actual title
      const titleMatch = html.match(/<title>(.*?)<\/title>/);
      if (titleMatch) {
        console.log(`  → Title: "${titleMatch[1]}"`);
      }
      
      console.log('');
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}\n`);
    }
  }
  
  console.log('\nNote: Make sure the dev server is running on http://localhost:3001');
  console.log('To see dynamic SEO from database, save settings in /dashboard/seo first.');
}

testSEO();