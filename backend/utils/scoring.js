const getRatingBand = (score) => {
  if (score >= 4.5) return 'Outstanding';
  if (score >= 4.0) return 'Exceeds Expectations';
  if (score >= 3.0) return 'Meets Expectations';
  if (score >= 2.0) return 'Needs Improvement';
  return 'Unsatisfactory';
};

/**
 * PerfoNext Enterprise Performance Scoring Engine (40% - 30% - 10% - 10% - 10%):
 * 
 * 1. 40% Approved Daily Work Logs:
 *    - Calculated from manager-verified work logs & impact ratings (Critical: 5.0, High: 4.5, Medium: 4.0, Low: 3.0).
 * 
 * 2. 30% Manager Competency Ratings:
 *    - Manager ratings across 6 core qualities: Communication, Ownership, Leadership, Teamwork, Learning Ability, Problem Solving.
 * 
 * 3. 10% Attendance:
 *    - Calculated directly from actual attendance percentage in the cycle window: (Att% / 100) * 5.0.
 * 
 * 4. 10% Certifications:
 *    - Dynamic evidence-based contribution from verified certifications earned within the review cycle date window.
 * 
 * 5. 10% Awards & Recognition:
 *    - Dynamic evidence-based contribution from verified awards issued within the review cycle date window.
 */
const calculateReviewScores = (managerReview = {}, extraMetrics = {}) => {
  // 1. Daily Work Logs Score (Quarterly Density Scaling: 60-70 Working Days Expected)
  const approvedLogs = extraMetrics.approvedWorkLogs || extraMetrics.approvedAchievements || [];
  const logCount = approvedLogs.length;

  let workLogScore = 1.0;
  if (logCount <= 2) {
    workLogScore = 1.0; // 0-2 logs in 90 days (<3% of working days): Critical failure to log daily work
  } else if (logCount <= 10) {
    workLogScore = 2.0; // 3-10 logs in 90 days (5%-15%): Severe under-logging
  } else if (logCount <= 25) {
    workLogScore = 3.0; // 11-25 logs in 90 days (15%-40%): Irregular logging
  } else if (logCount <= 50) {
    workLogScore = 4.0; // 26-50 logs in 90 days (40%-75%): Moderate logging
  } else {
    // 51+ logs (>75% of working days): Full qualitative impact score average (4.0 - 5.0)
    let impactSum = 0;
    approvedLogs.forEach(log => {
      const imp = log.impactScore || 'Medium';
      if (imp === 'Critical') impactSum += 5.0;
      else if (imp === 'High') impactSum += 4.5;
      else if (imp === 'Medium') impactSum += 4.0;
      else impactSum += 3.0;
    });
    workLogScore = Math.min(5.0, Math.max(4.0, impactSum / approvedLogs.length));
  }

  // 2. 30% Manager Competency Ratings (6 Core Qualities)
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

  // 3. 10% Attendance Score (1.0 / 5.0 if no attendance records exist)
  let attendanceScore = 1.0;
  if (extraMetrics.hasAttendanceRecords || (extraMetrics.attendanceRecordsCount && extraMetrics.attendanceRecordsCount > 0)) {
    const attPct = Number(extraMetrics.attendancePercentage) || 0;
    attendanceScore = Math.min(5.0, Math.max(1.0, (attPct / 100) * 5.0));
  }

  // 4. 10% Certifications (Dynamic evidence-based score within cycle)
  const certs = extraMetrics.certifications || [];
  const certCount = Array.isArray(certs) ? certs.length : (Number(extraMetrics.certificationsCount) || 0);
  let certScore = 3.5;
  if (certCount === 1) certScore = 4.0;
  else if (certCount === 2) certScore = 4.5;
  else if (certCount >= 3) certScore = 5.0;

  // 5. 10% Awards & Recognition (Dynamic evidence-based score within cycle)
  const awards = extraMetrics.awards || [];
  const awardCount = Array.isArray(awards) ? awards.length : (Number(extraMetrics.awardsCount) || 0);
  let awardScore = 3.5;
  if (awardCount === 1) awardScore = 4.25;
  else if (awardCount >= 2) awardScore = 5.0;

  // 1. Core Manager Competency Rating (100% Final Score Weight)
  const coreScoreRaw = competencyScore;
  const coreScore = Math.round(coreScoreRaw * 100) / 100;
  const coreRating = getRatingBand(coreScore);

  // 2. Supporting Context Metrics
  const supportingScoreRaw = (attendanceScore * 0.40) + (certScore * 0.30) + (awardScore * 0.30);
  const supportingScore = Math.round(supportingScoreRaw * 100) / 100;
  const supportingRating = getRatingBand(supportingScore);

  // 3. Final Performance Score = 100% Manager Competency Rating Average
  const finalScore = coreScore;
  const rating = getRatingBand(finalScore);

  return {
    workLogScore: Math.round(workLogScore * 100) / 100,
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
