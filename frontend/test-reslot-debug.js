// Quick diagnostic script to debug reslot opportunities
// Run this in browser console on the heatmap page

(function debugReslot() {
  // Access React internals to get state (this is a debug-only approach)
  const root = document.getElementById('__next');

  console.log('=== RESLOT DEBUG ===');
  console.log('Look for these in the Network tab or add console.logs to dashboardUtils.ts');

  console.log(`
To debug, add these console.logs to findItemReslottingOpportunities() in dashboardUtils.ts:

1. After line "const sortedItems = itemAnalysis.filter(...)":
   console.log('Total items with move-closer:', sortedItems.length);
   console.log('Sample item:', sortedItems[0]);

2. Inside the forEach loop, after finding targetElements:
   console.log('Item:', item.externalItemId, 'Targets found:', targetElements.length);
   if (targetElements.length > 0) {
     console.log('  Primary target hasEmptySlot:', targetElements[0].hasEmptySlot);
     console.log('  Primary target swapSuggestion:', targetElements[0].swapSuggestion);
   }

3. At the end before return:
   console.log('Total opportunities found:', opportunities.length);
   console.log('Opportunities with swaps:', opportunities.filter(o => o.moveType === 'swap').length);
   console.log('Opportunities with empty-slot:', opportunities.filter(o => o.moveType === 'empty-slot').length);
  `);
})();
