// Test script for auto-align algorithm
// Run with: node test-autoalign.js

const { AUTO_ALIGN_CONFIG } = require('./lib/autoAlign.ts');

// Configuration constants (copied from autoAlign.ts)
const CONFIG = {
  POSITION_TOLERANCE: 10,
  CLUSTER_TOLERANCE: 40,
  MISALIGNMENT_THRESHOLD: 5,
  SPACING_BUCKET_SIZE: 3,
  MIN_CLUSTER_SIZE: 2,
};

// Cart marker dimensions: 40x24
// Bay dimensions: 24x48

const cartMarkers = [
  { id: 'cart1', label: 'Cart 1', x: 17, y: 192, width: 40, height: 24 },
  { id: 'cart2', label: 'Cart 2', x: 17, y: 312, width: 40, height: 24 },
  { id: 'cart3', label: 'Cart 3', x: 17, y: 405, width: 40, height: 24 },
  { id: 'cart4', label: 'Cart 4', x: 17, y: 552, width: 40, height: 24 },
  { id: 'cart5', label: 'Cart 5', x: 17, y: 672, width: 40, height: 24 },
];

const bays = [
  { id: 'b7', label: 'B7', x: 100, y: 340, width: 24, height: 48 },
  { id: 'b10', label: 'B10', x: 111, y: 460, width: 24, height: 48 },
  { id: 'b13', label: 'B13', x: 100, y: 580, width: 24, height: 48 },
];

function calculateMode(values, bucketSize) {
  if (values.length === 0) return 0;
  if (values.length === 1) return values[0];

  const buckets = new Map();
  values.forEach(v => {
    const bucket = Math.round(v / bucketSize) * bucketSize;
    if (!buckets.has(bucket)) {
      buckets.set(bucket, []);
    }
    buckets.get(bucket).push(v);
  });

  let maxCount = 0;
  let modeValues = [];

  buckets.forEach((vals) => {
    if (vals.length > maxCount) {
      maxCount = vals.length;
      modeValues = vals;
    }
  });

  return modeValues.reduce((a, b) => a + b, 0) / modeValues.length;
}

console.log('=== CART MARKERS COLUMN ANALYSIS ===\n');

// Calculate centers
const cartCenters = cartMarkers.map(c => ({
  label: c.label,
  centerX: c.x + c.width / 2,
  centerY: c.y + c.height / 2,
}));

console.log('Cart centers:');
cartCenters.forEach(c => console.log(`  ${c.label}: centerX=${c.centerX}, centerY=${c.centerY}`));

// Check X bucket grouping
console.log('\nX bucket grouping (CLUSTER_TOLERANCE=40):');
cartCenters.forEach(c => {
  const bucket = Math.round(c.centerX / CONFIG.CLUSTER_TOLERANCE) * CONFIG.CLUSTER_TOLERANCE;
  console.log(`  ${c.label}: centerX=${c.centerX} -> bucket ${bucket}`);
});

// Calculate spacings
const cartYs = cartCenters.map(c => c.centerY);
const cartSpacings = [];
for (let i = 1; i < cartYs.length; i++) {
  cartSpacings.push(cartYs[i] - cartYs[i - 1]);
}
console.log('\nY spacings between consecutive carts:', cartSpacings);

const modeSpacing = calculateMode(cartSpacings, CONFIG.SPACING_BUCKET_SIZE);
console.log('Mode spacing:', modeSpacing);

// Calculate expected positions and deviations
const firstY = cartYs[0];
console.log('\nExpected vs Actual Y positions:');
cartYs.forEach((y, i) => {
  const expected = firstY + i * modeSpacing;
  const deviation = Math.abs(y - expected);
  const flag = deviation > CONFIG.MISALIGNMENT_THRESHOLD ? '⚠️  MISALIGNED' : '✓';
  console.log(`  ${cartMarkers[i].label}: expected=${expected.toFixed(1)}, actual=${y}, deviation=${deviation.toFixed(1)}px ${flag}`);
});

// Check X alignment
const cartXs = cartCenters.map(c => c.centerX);
const modeX = calculateMode(cartXs, CONFIG.SPACING_BUCKET_SIZE);
console.log('\nX alignment (anchor axis):');
console.log('Mode X position:', modeX);
cartCenters.forEach(c => {
  const deviation = Math.abs(c.centerX - modeX);
  const flag = deviation > CONFIG.MISALIGNMENT_THRESHOLD ? '⚠️  MISALIGNED' : '✓';
  console.log(`  ${c.label}: centerX=${c.centerX}, deviation=${deviation.toFixed(1)}px ${flag}`);
});

console.log('\n\n=== BAYS COLUMN ANALYSIS ===\n');

const bayCenters = bays.map(b => ({
  label: b.label,
  centerX: b.x + b.width / 2,
  centerY: b.y + b.height / 2,
}));

console.log('Bay centers:');
bayCenters.forEach(b => console.log(`  ${b.label}: centerX=${b.centerX}, centerY=${b.centerY}`));

// Check X bucket grouping
console.log('\nX bucket grouping (CLUSTER_TOLERANCE=40):');
bayCenters.forEach(b => {
  const bucket = Math.round(b.centerX / CONFIG.CLUSTER_TOLERANCE) * CONFIG.CLUSTER_TOLERANCE;
  console.log(`  ${b.label}: centerX=${b.centerX} -> bucket ${bucket}`);
});

// Calculate X alignment
const bayXs = bayCenters.map(b => b.centerX);
const bayModeX = calculateMode(bayXs, CONFIG.SPACING_BUCKET_SIZE);
console.log('\nX alignment (anchor axis):');
console.log('Mode X position:', bayModeX);
bayCenters.forEach(b => {
  const deviation = Math.abs(b.centerX - bayModeX);
  const flag = deviation > CONFIG.MISALIGNMENT_THRESHOLD ? '⚠️  MISALIGNED' : '✓';
  console.log(`  ${b.label}: centerX=${b.centerX}, deviation=${deviation.toFixed(1)}px ${flag}`);
});

// Y spacing check
const bayYs = bayCenters.map(b => b.centerY);
const baySpacings = [];
for (let i = 1; i < bayYs.length; i++) {
  baySpacings.push(bayYs[i] - bayYs[i - 1]);
}
console.log('\nY spacings between consecutive bays:', baySpacings);
const bayModeSpacing = calculateMode(baySpacings, CONFIG.SPACING_BUCKET_SIZE);
console.log('Mode spacing:', bayModeSpacing);

const firstBayY = bayYs[0];
console.log('\nExpected vs Actual Y positions:');
bayYs.forEach((y, i) => {
  const expected = firstBayY + i * bayModeSpacing;
  const deviation = Math.abs(y - expected);
  const flag = deviation > CONFIG.MISALIGNMENT_THRESHOLD ? '⚠️  MISALIGNED' : '✓';
  console.log(`  ${bays[i].label}: expected=${expected.toFixed(1)}, actual=${y}, deviation=${deviation.toFixed(1)}px ${flag}`);
});

console.log('\n\n=== SUMMARY ===');
console.log('Cart 3 should be detected: Y deviation from expected position');
console.log('B10 should be detected: X deviation from mode position (11px off)');
