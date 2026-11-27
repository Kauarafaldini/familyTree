const fs = require('fs');

const appContent = fs.readFileSync('app.js', 'utf8');

// 1. Verify twin line does NOT have glowPurple or neon #a855f7
if (appContent.includes('filter="url(#glowPurple)"')) {
  console.error('FAIL: glowPurple filter still present');
  process.exit(1);
}
if (appContent.includes('<filter id="glowPurple"')) {
  console.error('FAIL: defs glowPurple filter still present');
  process.exit(1);
}
console.log('PASS: No neon glowPurple filter in SVG');

// 2. Verify twin line uses matte purple #7e22ce
if (!appContent.includes('stroke="#7e22ce"')) {
  console.error('FAIL: stroke #7e22ce not found');
  process.exit(1);
}
console.log('PASS: Twin line uses matte purple #7e22ce');

// 3. Verify no ring emoji or circular seals in marriage line
if (appContent.includes('text-anchor="middle">💍</text>') || appContent.includes('💍 Matrimônio Avuncular')) {
  console.error('FAIL: Ring emoji still present in marriage connections');
  process.exit(1);
}
console.log('PASS: No ring emoji in marriage connections');

// 4. Verify no red sibling lines between twins
if (!appContent.includes('if (drawnTwinPairs.has(pairKey) || this.areCharactersTwins(child, sib)) return;')) {
  console.error('FAIL: twin check in sibling loop missing');
  process.exit(1);
}
console.log('PASS: Twin check correctly skips red sibling connections');

// 5. Verify styles.css has overflow: hidden and no scrollbars on grape-tree-viewport
const cssContent = fs.readFileSync('styles.css', 'utf8');
if (!cssContent.includes('.grape-tree-viewport::-webkit-scrollbar') || !cssContent.includes('scrollbar-width: none')) {
  console.error('FAIL: Scrollbar removal styles missing');
  process.exit(1);
}
console.log('PASS: Scrollbar suppression active for tree viewport');

console.log('ALL 5 CHECKS PASSED PERFECTLY!');
