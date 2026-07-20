const { calculateReviewScores } = require('../utils/scoring');

// Mock KPI Template
const mockTemplate = {
  items: [
    { _id: '1', category: 'quality', weight: 2 },
    { _id: '2', category: 'quality', weight: 2 },
    { _id: '3', category: 'productivity', weight: 1 },
    { _id: '4', category: 'technical', weight: 2 },
    { _id: '5', category: 'communication', weight: 1 },
    { _id: '6', category: 'ownership', weight: 1.5 },
    { _id: '7', category: 'learning', weight: 1 }
  ]
};

// Mock Manager Review
const mockReview = {
  details: [
    { kpiItemId: '1', score: 5, comment: 'Excellent quality' },
    { kpiItemId: '2', score: 4, comment: 'Good quality' },
    { kpiItemId: '3', score: 3, comment: 'Average productivity' },
    { kpiItemId: '4', score: 4, comment: 'Good technical skills' },
    { kpiItemId: '5', score: 5, comment: 'Excellent communication' },
    { kpiItemId: '6', score: 3, comment: 'Average ownership' },
    { kpiItemId: '7', score: 4, comment: 'Good learning' }
  ]
};

console.log('--- RUNNING SCORING ENGINE PROGRAM TEST ---');

const result = calculateReviewScores(mockReview, mockTemplate);

console.log('Category Averages:', result.categoryScores);
console.log('Calculated Final Score:', result.finalScore);
console.log('Resulting Rating Band:', result.rating);

// Verification assertions
// Averages:
// quality: (5 + 4) / 2 = 4.5
// productivity: 3 / 1 = 3.0
// technical: 4 / 1 = 4.0
// communication: 5 / 1 = 5.0
// ownership: 3 / 1 = 3.0
// learning: 4 / 1 = 4.0
// Weighted Sum: (4.5 * 0.25) + (3.0 * 0.20) + (4.0 * 0.20) + (5.0 * 0.10) + (3.0 * 0.15) + (4.0 * 0.10)
// = 1.125 + 0.60 + 0.80 + 0.50 + 0.45 + 0.40 = 3.875
// Rounded to 2 decimals = 3.88
// Rating band: 3.88 -> Meets Expectations

const expectedScore = 3.88;
const expectedRating = 'Meets Expectations';

if (result.finalScore === expectedScore && result.rating === expectedRating) {
  console.log('SUCCESS: Scoring engine matches expected mathematical results!');
  process.exit(0);
} else {
  console.error(`FAILURE: Expected score ${expectedScore} and rating ${expectedRating}, but got score ${result.finalScore} and rating ${result.rating}`);
  process.exit(1);
}
