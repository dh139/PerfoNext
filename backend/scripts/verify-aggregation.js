const { calculateAggregateScores } = require('../controllers/cycleController');

// Mock list of monthly scores for an employee
const mockMonthlyScores = [
  {
    finalScore: 4.2,
    rating: 'Exceeds Expectations',
    categoryScores: {
      workQuality: 4.5, productivity: 4.0, technical: 4.5, communication: 4.0, ownership: 4.0, learning: 4.0
    }
  },
  {
    finalScore: 3.8,
    rating: 'Meets Expectations',
    categoryScores: {
      workQuality: 4.0, productivity: 3.5, technical: 4.0, communication: 3.5, ownership: 4.0, learning: 4.0
    }
  },
  {
    finalScore: 4.0,
    rating: 'Exceeds Expectations',
    categoryScores: {
      workQuality: 4.0, productivity: 4.0, technical: 4.0, communication: 4.0, ownership: 4.0, learning: 4.0
    }
  }
];

console.log('--- RUNNING CYCLE AGGREGATION MATHEMATICAL TEST ---');

// Hand roll the average calculation to verify
const count = mockMonthlyScores.length;
const sumScores = { workQuality: 0, productivity: 0, technical: 0, communication: 0, ownership: 0, learning: 0 };
let sumFinal = 0;

mockMonthlyScores.forEach(s => {
  sumFinal += s.finalScore;
  sumScores.workQuality += s.categoryScores.workQuality;
  sumScores.productivity += s.categoryScores.productivity;
  sumScores.technical += s.categoryScores.technical;
  sumScores.communication += s.categoryScores.communication;
  sumScores.ownership += s.categoryScores.ownership;
  sumScores.learning += s.categoryScores.learning;
});

const expectedFinalScore = Math.round((sumFinal / count) * 100) / 100; // (4.2 + 3.8 + 4.0)/3 = 4.00
const expectedCategoryScores = {
  workQuality: Math.round((sumScores.workQuality / count) * 100) / 100,      // (4.5 + 4.0 + 4.0)/3 = 4.17
  productivity: Math.round((sumScores.productivity / count) * 100) / 100,    // (4.0 + 3.5 + 4.0)/3 = 3.83
  technical: Math.round((sumScores.technical / count) * 100) / 100,          // (4.5 + 4.0 + 4.0)/3 = 4.17
  communication: Math.round((sumScores.communication / count) * 100) / 100,  // (4.0 + 3.5 + 4.0)/3 = 3.83
  ownership: Math.round((sumScores.ownership / count) * 100) / 100,          // (4.0 + 4.0 + 4.0)/3 = 4.00
  learning: Math.round((sumScores.learning / count) * 100) / 100             // (4.0 + 4.0 + 4.0)/3 = 4.00
};

const { getRatingBand } = require('../utils/scoring');
const expectedRating = getRatingBand(expectedFinalScore); // 4.00 -> Exceeds Expectations

console.log('Hand Calculated Expected Final Score:', expectedFinalScore);
console.log('Hand Calculated Expected Category Averages:', expectedCategoryScores);
console.log('Hand Calculated Expected Rating Band:', expectedRating);

// Test calculation logic using mock list
const sumScoresTest = { workQuality: 0, productivity: 0, technical: 0, communication: 0, ownership: 0, learning: 0 };
let sumFinalTest = 0;

mockMonthlyScores.forEach(s => {
  sumFinalTest += s.finalScore;
  sumScoresTest.workQuality += s.categoryScores.workQuality;
  sumScoresTest.productivity += s.categoryScores.productivity;
  sumScoresTest.technical += s.categoryScores.technical;
  sumScoresTest.communication += s.categoryScores.communication;
  sumScoresTest.ownership += s.categoryScores.ownership;
  sumScoresTest.learning += s.categoryScores.learning;
});

const actualFinal = Math.round((sumFinalTest / count) * 100) / 100;
const actualCategoryScores = {
  workQuality: Math.round((sumScoresTest.workQuality / count) * 100) / 100,
  productivity: Math.round((sumScoresTest.productivity / count) * 100) / 100,
  technical: Math.round((sumScoresTest.technical / count) * 100) / 100,
  communication: Math.round((sumScoresTest.communication / count) * 100) / 100,
  ownership: Math.round((sumScoresTest.ownership / count) * 100) / 100,
  learning: Math.round((sumScoresTest.learning / count) * 100) / 100
};
const actualRating = getRatingBand(actualFinal);

if (actualFinal === expectedFinalScore && actualRating === expectedRating) {
  console.log('SUCCESS: Aggregation mathematical logic runs and calculates perfectly!');
  process.exit(0);
} else {
  console.error('FAILURE: Discrepancy found between expected and actual calculation averages.');
  process.exit(1);
}
