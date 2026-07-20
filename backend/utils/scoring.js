const getRatingBand = (score) => {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 4.0) return 'Exceeds Expectations';
  if (score >= 3.0) return 'Meets Expectations';
  if (score >= 2.0) return 'Needs Improvement';
  return 'Unsatisfactory';
};

const calculateReviewScores = (managerReview, kpiTemplate) => {
  const categoryWeights = {
    quality: 0.25,        // maps to workQuality
    productivity: 0.20,
    technical: 0.20,
    communication: 0.10,
    ownership: 0.15,
    learning: 0.10
  };

  const details = managerReview.details || [];
  const templateItems = kpiTemplate.items || [];

  // Group manager review details by category
  const categoryValues = {
    quality: [],
    productivity: [],
    technical: [],
    communication: [],
    ownership: [],
    learning: []
  };

  details.forEach(detail => {
    // Determine category from template item or from the detail itself
    let category = detail.category;
    if (!category) {
      const matchedItem = templateItems.find(item => item._id.toString() === detail.kpiItemId.toString());
      if (matchedItem) category = matchedItem.category;
    }
    
    if (category && categoryValues[category] !== undefined) {
      categoryValues[category].push(detail.score);
    }
  });

  // Calculate average for each category
  const categoryScores = {};
  let weightedScoreSum = 0;
  let activeWeightSum = 0;

  Object.keys(categoryWeights).forEach(category => {
    const scores = categoryValues[category];
    const avg = scores.length > 0 ? (scores.reduce((sum, val) => sum + val, 0) / scores.length) : 0;
    
    // Convert key name for database schema (quality -> workQuality, others remain same)
    const dbKey = category === 'quality' ? 'workQuality' : category;
    categoryScores[dbKey] = Math.round(avg * 100) / 100; // Round to 2 decimal places

    // Only include in final score formula if the category had items reviewed
    if (scores.length > 0) {
      weightedScoreSum += avg * categoryWeights[category];
      activeWeightSum += categoryWeights[category];
    }
  });

  // Calculate final score: if no items were graded at all, default to 0. Otherwise normalize weights.
  let finalScore = 0;
  if (activeWeightSum > 0) {
    finalScore = weightedScoreSum / activeWeightSum;
  }
  finalScore = Math.round(finalScore * 100) / 100; // Round to 2 decimal places

  const rating = getRatingBand(finalScore);

  return {
    categoryScores,
    finalScore,
    rating
  };
};

module.exports = {
  calculateReviewScores,
  getRatingBand
};
