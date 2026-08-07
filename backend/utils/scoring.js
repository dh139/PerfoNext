const getRatingBand = (score) => {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 4.0) return 'Exceeds Expectations';
  if (score >= 3.0) return 'Meets Expectations';
  if (score >= 2.0) return 'Needs Improvement';
  return 'Unsatisfactory';
};

/**
 * PerfoNext Enterprise Performance Scoring Engine
 * 
 * 1. Final Performance Score (100% Weight):
 *    - Manager ratings average across 6 core qualities: Communication, Ownership, Leadership, Teamwork, Learning Ability, Problem Solving.
 * 
 * 2. Supporting Context Metrics (Attendance, Certifications, Awards):
 *    - 40% Attendance: Calculated directly from actual attendance percentage in the cycle window: (Att% / 100) * 5.0.
 *    - 30% Certifications: Dynamic evidence-based score within cycle.
 *    - 30% Awards: Dynamic evidence-based score within cycle.
 */
const calculateReviewScores = (managerReview = {}, extraMetrics = {}) => {
  // 1. Manager Competency Ratings (6 Core Qualities)
  const comp = managerReview.competencyRatings || {};
  const compValues = [
    comp.communication,
    comp.ownership,
    comp.leadership,
    comp.teamwork,
    comp.learningAbility,
    comp.problemSolving
  ].map(v => Number(v)).filter(v => !isNaN(v) && v > 0);

  const competencyScore = compValues.length > 0
    ? (compValues.reduce((sum, v) => sum + v, 0) / compValues.length)
    : (Number(managerReview.overallRating) || 3.5);

  // 2. Attendance Score (1.0 / 5.0 if no attendance records exist)
  let attendanceScore = 1.0;
  if (extraMetrics.hasAttendanceRecords || (extraMetrics.attendanceRecordsCount && extraMetrics.attendanceRecordsCount > 0)) {
    const attPct = Number(extraMetrics.attendancePercentage) || 0;
    attendanceScore = Math.min(5.0, Math.max(1.0, (attPct / 100) * 5.0));
  }

  // 3. Certifications (Dynamic evidence-based score within cycle)
  const certs = extraMetrics.certifications || [];
  const certCount = Array.isArray(certs) ? certs.length : (Number(extraMetrics.certificationsCount) || 0);
  let certScore = 3.5;
  if (certCount === 1) certScore = 4.0;
  else if (certCount === 2) certScore = 4.5;
  else if (certCount >= 3) certScore = 5.0;

  // 4. Awards & Recognition (Dynamic evidence-based score within cycle)
  const awards = extraMetrics.awards || [];
  const awardCount = Array.isArray(awards) ? awards.length : (Number(extraMetrics.awardsCount) || 0);
  let awardScore = 3.5;
  if (awardCount === 1) awardScore = 4.25;
  else if (awardCount >= 2) awardScore = 5.0;

  // Core Manager Competency Rating (100% Final Score Weight)
  const coreScoreRaw = competencyScore;
  const coreScore = Math.round(coreScoreRaw * 100) / 100;
  const coreRating = getRatingBand(coreScore);

  // Supporting Context Metrics (40% Attendance, 30% Certs, 30% Awards)
  const supportingScoreRaw = (attendanceScore * 0.40) + (certScore * 0.30) + (awardScore * 0.30);
  const supportingScore = Math.round(supportingScoreRaw * 100) / 100;
  const supportingRating = getRatingBand(supportingScore);

  // Final Performance Score = 100% Manager Competency Rating Average
  const finalScore = coreScore;
  const rating = getRatingBand(finalScore);

  return {
    competencyScore: Math.round(competencyScore * 100) / 100,
    attendanceScore: Math.round(attendanceScore * 100) / 100,
    certScore: Math.round(certScore * 100) / 100,
    awardScore: Math.round(awardScore * 100) / 100,
    coreScore,
    coreRating,
    supportingScore,
    supportingRating,
    externalScore: supportingScore,
    externalRating: supportingRating,
    finalScore,
    rating
  };
};

module.exports = {
  calculateReviewScores,
  getRatingBand
};
