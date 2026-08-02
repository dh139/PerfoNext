const User = require('../models/User');
const ReviewScore = require('../models/ReviewScore');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const Certification = require('../models/Certification');
const Attendance = require('../models/Attendance');
const Recognition = require('../models/Recognition');
const AIReport = require('../models/AIReport');
const ReviewCycle = require('../models/ReviewCycle');
const WorkJournal = require('../models/WorkJournal');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

// Helper to calculate months in range
const getMonthsInRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const months = [];
  const curr = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
  while (curr <= end) {
    const yearStr = curr.getUTCFullYear();
    const monthStr = String(curr.getUTCMonth() + 1).padStart(2, '0');
    months.push(`${yearStr}-${monthStr}`);
    curr.setUTCMonth(curr.getUTCMonth() + 1);
  }
  return months;
};

const calculateCyclePeriodBounds = (cycle) => {
  let startBound;
  let endBound;

  if ((cycle.cycleType === 'quarterly' || /^\d{4}-Q[1-4]$/i.test(cycle.reviewMonth)) && cycle.reviewMonth) {
    const match = cycle.reviewMonth.match(/^(\d{4})-Q([1-4])$/i);
    if (match) {
      const year = parseInt(match[1], 10);
      const q = parseInt(match[2], 10);
      const startMonth = (q - 1) * 3;
      startBound = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
      endBound = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59));
      return { startBound, endBound };
    }
  }

  if ((cycle.cycleType === 'half_yearly' || /^\d{4}-H[1-2]$/i.test(cycle.reviewMonth)) && cycle.reviewMonth) {
    const match = cycle.reviewMonth.match(/^(\d{4})-H([1-2])$/i);
    if (match) {
      const year = parseInt(match[1], 10);
      const h = parseInt(match[2], 10);
      const startMonth = (h - 1) * 6;
      startBound = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
      endBound = new Date(Date.UTC(year, startMonth + 6, 0, 23, 59, 59));
      return { startBound, endBound };
    }
  }

  if (['yearly', 'annual'].includes(cycle.cycleType) || (cycle.reviewMonth && /^\d{4}$/.test(cycle.reviewMonth))) {
    const match = (cycle.reviewMonth || '').match(/^(\d{4})/);
    if (match) {
      const year = parseInt(match[1], 10);
      startBound = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      endBound = new Date(Date.UTC(year, 12, 0, 23, 59, 59));
      return { startBound, endBound };
    }
  }

  if (cycle.reviewMonth && /^\d{4}-\d{2}$/.test(cycle.reviewMonth)) {
    const [year, month] = cycle.reviewMonth.split('-').map(Number);
    startBound = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    endBound = new Date(Date.UTC(year, month, 0, 23, 59, 59));
  } else {
    startBound = new Date(cycle.startDate);
    startBound.setUTCHours(0, 0, 0, 0);
    endBound = new Date(cycle.endDate);
    endBound.setUTCHours(23, 59, 59, 999);
  }

  return { startBound, endBound };
};

// Generate AI performance insights (called by GET /api/review-cycles/:cycleId/employees/:employeeId/insights)
const getAiInsights = async (employeeId, cycleId) => {
  try {
    let targetCycleId = cycleId;

    // 1. If cycleId not provided, default to the latest cycle with a score
    if (!targetCycleId) {
      const latestScore = await ReviewScore.findOne({ employeeId }).sort({ createdAt: -1 });
      if (!latestScore) {
        return {
          status: 'PENDING_FINALIZATION',
          message: 'No completed reviews found for this employee. AI insights are generated once a review cycle is finalized.'
        };
      }
      targetCycleId = latestScore.reviewCycleId;
    }

    // 2. Verify that the review is finalized (ReviewScore exists)
    const score = await ReviewScore.findOne({ employeeId, reviewCycleId: targetCycleId });
    if (!score) {
      return {
        status: 'PENDING_FINALIZATION',
        message: 'Evaluation is still in progress. AI insights will be generated once the review cycle is finalized.'
      };
    }

    const cycleObj = await ReviewCycle.findById(targetCycleId);
    const { startBound, endBound } = calculateCyclePeriodBounds(cycleObj || {});

    // 3. Fetch existing cached AI report
    const cachedReport = await AIReport.findOne({ employeeId, reviewCycleId: targetCycleId });
    if (cachedReport && cachedReport.status === 'COMPLETED') {
      return {
        summary: cachedReport.summary,
        aiScore: cachedReport.aiScore || 3.5,
        confidence: cachedReport.confidence || 'High',
        aiScoreRationale: cachedReport.aiScoreRationale || '',
        strengths: cachedReport.strengths || [],
        improvements: cachedReport.improvements || [],
        sentiment: cachedReport.sentiment || 'Neutral',
        turnoverRisk: cachedReport.turnoverRisk || 'Low',
        productivityTrend: cachedReport.productivityTrend || 'Consistent',
        loggingConsistency: cachedReport.loggingConsistency || 'Moderate',
        businessImpact: cachedReport.businessImpact || 'Medium',
        actionItems: cachedReport.actionItems || [],
        startDate: cachedReport.startDate || startBound,
        endDate: cachedReport.endDate || endBound,
        reviewMonth: cachedReport.reviewMonth || cycleObj?.reviewMonth,
        status: 'COMPLETED',
        generatedAt: cachedReport.generatedAt
      };
    }

    // 4. Cache MISS: Generate AI Insights
    return await generateAndSaveInsights(employeeId, targetCycleId);

  } catch (error) {
    console.error('getAiInsights error:', error);
    return generateLocalFallback([], [], [], [], [], []);
  }
};

// Explicitly regenerate AI insights (called by POST /api/review-cycles/:cycleId/employees/:employeeId/insights/regenerate)
const regenerateAiInsights = async (employeeId, cycleId) => {
  if (!cycleId) {
    throw new Error('Cycle ID is required for regeneration');
  }

  // Verify that the review is finalized (ReviewScore exists)
  const score = await ReviewScore.findOne({ employeeId, reviewCycleId: cycleId });
  if (!score) {
    throw new Error('Cannot regenerate AI report for a review cycle that is not finalized.');
  }

  // Delete existing cache first to avoid stale data
  await AIReport.deleteOne({ employeeId, reviewCycleId: cycleId });

  return await generateAndSaveInsights(employeeId, cycleId);
};

const generateAndSaveInsights = async (employeeId, cycleId) => {
  const employee = await User.findById(employeeId).populate('departmentId designationId');
  if (!employee) throw new Error('Employee not found');

  const cycle = await ReviewCycle.findById(cycleId);
  if (!cycle) throw new Error('Review cycle not found');

  const { startBound, endBound } = calculateCyclePeriodBounds(cycle);

  const overlappingCycles = await ReviewCycle.find({
    startDate: { $lte: endBound },
    endDate: { $gte: startBound }
  });

  const cycleIds = [cycleId];
  overlappingCycles.forEach(c => {
    if (c._id.toString() !== cycleId.toString()) cycleIds.push(c._id);
  });

  // Query database filtering strictly by cycle date boundaries
  const scores = await ReviewScore.find({ employeeId, reviewCycleId: { $in: cycleIds } }).populate('reviewCycleId').sort('createdAt');
  const managerReviews = await ManagerReview.find({ employeeId, reviewCycleId: { $in: cycleIds } }).sort('createdAt');
  const certifications = await Certification.find({ employeeId, issueDate: { $gte: startBound, $lte: endBound } }).sort('-issueDate');
  const awards = await Recognition.find({ employeeId, awardedAt: { $gte: startBound, $lte: endBound } }).populate('awardedBy').sort('-awardedAt');

  const months = getMonthsInRange(startBound, endBound);
  const attendanceRecords = await Attendance.find({ employeeId, month: { $in: months } }).sort('month');

  // Work Journal Verified Evidence strictly in cycle window
  const workJournalItems = await WorkJournal.find({
    employeeId,
    completedDate: { $gte: startBound, $lte: endBound },
    status: { $in: ['approved', 'verified'] }
  }).sort('-completedDate');

  // Auto-heal certifications pdf text extraction
  for (const c of certifications) {
    if (!c.extractedText || !c.extractedText.trim()) {
      const filename = path.basename(c.fileUrl);
      const absolutePath = path.join(__dirname, '../uploads', filename);
      if (fs.existsSync(absolutePath) && filename.toLowerCase().endsWith('.pdf')) {
        try {
          const dataBuffer = fs.readFileSync(absolutePath);
          const parser = new pdf.PDFParse({});
          await parser.load(dataBuffer);
          c.extractedText = await parser.getText() || '';
          await Certification.findByIdAndUpdate(c._id, { extractedText: c.extractedText });
        } catch (err) {
          console.error(`Retroactive PDF text extraction failed for cert ${c._id}:`, err);
        }
      }
    }
  }

  // Construct analysis prompt context matching PerfoNext Architecture
  let historyContext = `EMPLOYEE EVIDENCE PROFILE (Evaluation Period: ${formatDateDDMMYYYY(startBound)} to ${formatDateDDMMYYYY(endBound)})
Employee: ${employee.firstName} ${employee.lastName} (Code: ${employee.employeeCode})
Designation: ${employee.designationId?.designationName || 'N/A'}
Department: ${employee.departmentId?.departmentName || 'N/A'}

1. VERIFIED APPROVED DAILY WORK LOGS (${workJournalItems.length} Entries Logged in Quarter):
`;

  if (workJournalItems.length === 0) {
    historyContext += '- Zero approved daily work logs recorded in this period.\n';
  } else {
    workJournalItems.forEach((w, idx) => {
      historyContext += `${idx + 1}. [Category: ${w.category}] Title: "${w.title}" | Project: "${w.project || 'General'}" | Date Completed: ${formatDateDDMMYYYY(w.completedDate)} | Hours Logged: ${w.hoursSpent || 0} Hrs | Work Summary & Output Result: "${w.resultSummary || 'N/A'}" | Manager Review Note: "${w.managerFeedback || 'Good Work'}" | Evidence Proof Type: ${w.evidenceType}\n`;
    });
  }

  historyContext += '\n2. MANAGER COMPETENCY EVALUATION RATINGS (6 Core Criteria Rated by Reporting Manager):\n';
  if (managerReviews.length === 0) {
    historyContext += '- Manager review pending / not completed.\n';
  } else {
    managerReviews.forEach(mr => {
      if (mr.competencyRatings) {
        historyContext += `- Communication & Collaboration: ${mr.competencyRatings.communication || 'N/A'}/5\n`;
        historyContext += `- Ownership & Accountability: ${mr.competencyRatings.ownership || 'N/A'}/5\n`;
        historyContext += `- Leadership & Initiative: ${mr.competencyRatings.leadership || 'N/A'}/5\n`;
        historyContext += `- Teamwork & Support: ${mr.competencyRatings.teamwork || 'N/A'}/5\n`;
        historyContext += `- Learning & Adaptability: ${mr.competencyRatings.learningAbility || 'N/A'}/5\n`;
        historyContext += `- Problem Solving & Critical Thinking: ${mr.competencyRatings.problemSolving || 'N/A'}/5\n`;
      }
      if (mr.overallComments) {
        historyContext += `- Manager Overall Feedback Note: "${mr.overallComments}"\n`;
      }
    });
  }

  historyContext += '\n3. ATTENDANCE PERCENTAGE RECORDS:\n';
  if (attendanceRecords.length === 0) {
    historyContext += '- No attendance records synchronized for this evaluation window.\n';
  } else {
    attendanceRecords.forEach(att => {
      historyContext += `- Month: ${att.month} | Attendance: ${att.attendancePercentage}%\n`;
    });
  }

  historyContext += '\n4. VERIFIED PROFESSIONAL CERTIFICATIONS (Earned in Cycle):\n';
  if (certifications.length === 0) {
    historyContext += '- None registered in this cycle window.\n';
  } else {
    certifications.forEach(c => {
      historyContext += `- Certificate: "${c.name}" issued by "${c.issuer}" on ${formatDateDDMMYYYY(c.issueDate)}\n`;
    });
  }

  historyContext += '\n5. AWARDS & RECOGNITIONS (Granted in Cycle):\n';
  if (awards.length === 0) {
    historyContext += '- None granted in this cycle window.\n';
  } else {
    awards.forEach(aw => {
      const grantor = aw.awardedBy ? `${aw.awardedBy.firstName} ${aw.awardedBy.lastName}` : 'System';
      historyContext += `- Award Accolade: "${aw.category}" granted by "${grantor}" with citation: "${aw.comments || ''}" on ${formatDateDDMMYYYY(aw.awardedAt || aw.createdAt)}\n`;
    });
  }

  const apiKey = (process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY || '').trim();
  let modelName = (process.env.CHATGPT_MODEL || process.env.GROQ_MODEL || 'chatgpt-5.6-terra').trim();
  
  let targetUrl = (process.env.CHATGPT_API_URL || process.env.GROQ_API_URL || '').trim();
  if (!targetUrl) {
    if (apiKey.startsWith('gsk_')) {
      targetUrl = 'https://api.groq.com/openai/v1/chat/completions';
      if (modelName === 'chatgpt-5.6-terra') {
        modelName = 'llama-3.3-70b-versatile';
      }
    } else {
      targetUrl = 'https://api.openai.com/v1/chat/completions';
    }
  }

  const systemPrompt = `You are ChatGPT 5.6 Terra, an enterprise HR Performance Intelligence AI.

Your primary objective is to deliver an HONEST, BRUTAL, EVIDENCE-BASED PERFORMANCE AUDIT for an employee based strictly on their verified Daily Work Logs, Manager Comments, Attendance, Certifications, Awards, and Manager Competency Ratings.

Evaluation Period:
${formatDateDDMMYYYY(startBound)} to ${formatDateDDMMYYYY(endBound)}

CORE AUDIT DIRECTIVES & SCORING RULES:

1. DAILY WORK LOGGING COMPLIANCE:
- Analyze all work journal entries logged by the employee during this evaluation cycle.
- Synthesize actual deliverable titles, work summaries, and project accomplishments.
- Reference the review cycle period (e.g. 2026-H2) without using fixed "quarter" terminology unless cycleType is quarterly.

2. EXPLICITLY ANALYZE CERTIFICATIONS & AWARDS:
- You MUST explicitly reference verified professional certifications (e.g. "Sales Strategy" by AWS, "Marketing" by Udemy) and awards in summary, strengths, and rationale.

3. DEPARTMENT-AGNOSTIC ADAPTATION:
- Adapt your terminology dynamically based on Department and Designation (Engineering, Sales, Marketing, HR, Finance, Support, Administration).

4. ZERO GENERIC HR FLUFF:
- Every strength and development area MUST cite specific evidence (work logs, certificates, awards, or attendance). NEVER use generic fluff.

Output JSON in this exact structure (raw JSON, no markdown formatting):
{
  "summary": "<2-3 sentence executive summary written as an HR Business Partner describing actual work deliverables, work summaries, credentials, awards, attendance, and manager ratings>",
  "aiScore": 3.85,
  "confidence": "High / Medium / Low",
  "aiScoreRationale": "<1-2 sentence AI audit rationale explaining how the AI score was derived from work log evidence, manager competency ratings, attendance, certs, and awards>",
  "strengths": ["<Evidence-grounded strength 1>", "<Evidence-grounded strength 2>"],
  "improvements": ["<Evidence-grounded improvement area 1>", "<Evidence-grounded improvement area 2>"],
  "sentiment": "Positive / Mixed / Critical",
  "turnoverRisk": "Low / Medium / High",
  "productivityTrend": "Consistent / Fluctuating / Improving / Declining",
  "loggingConsistency": "Excellent / Good / Moderate / Poor",
  "businessImpact": "High / Medium / Low",
  "actionItems": ["<Action item 1>", "<Action item 2>"]
}`;

  // Call ChatGPT 5.6 Terra LLM API
  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: historyContext }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn('ChatGPT 5.6 Terra API responded with error, utilizing local analytics engine:', errText);
    const fallbackParsed = generateLocalFallback(scores, managerReviews, certifications, attendanceRecords, awards, workJournalItems);

    await AIReport.findOneAndUpdate(
      { employeeId, reviewCycleId: cycleId },
      {
        employeeId,
        reviewCycleId: cycleId,
        summary: fallbackParsed.summary,
        aiScore: fallbackParsed.aiScore || 3.08,
        confidence: fallbackParsed.confidence || 'Medium',
        aiScoreRationale: fallbackParsed.aiScoreRationale || '',
        strengths: fallbackParsed.strengths || [],
        improvements: fallbackParsed.improvements || [],
        sentiment: fallbackParsed.sentiment || 'Neutral',
        turnoverRisk: fallbackParsed.turnoverRisk || 'Low',
        productivityTrend: fallbackParsed.productivityTrend || 'Fluctuating',
        loggingConsistency: fallbackParsed.loggingConsistency || 'Poor',
        businessImpact: fallbackParsed.businessImpact || 'Medium',
        actionItems: fallbackParsed.actionItems || [],
        startDate: startBound,
        endDate: endBound,
        reviewMonth: cycle.reviewMonth,
        prompt: historyContext,
        responseRaw: 'LOCAL_FALLBACK_ENGINED_GENERATION: ' + errText,
        modelUsed: modelName,
        status: 'COMPLETED',
        generatedAt: new Date()
      },
      { upsert: true }
    );

    return { ...fallbackParsed, startDate: startBound, endDate: endBound, reviewMonth: cycle.reviewMonth, status: 'COMPLETED', generatedAt: new Date() };
  }

  const resData = await response.json();
  const contentText = resData.choices[0]?.message?.content;
  const parsed = JSON.parse(contentText);

  const now = new Date();
  // Save new completed AI report to MongoDB
  await AIReport.findOneAndUpdate(
    { employeeId, reviewCycleId: cycleId },
    {
      employeeId,
      reviewCycleId: cycleId,
      summary: parsed.summary,
      aiScore: Number(parsed.aiScore) || 3.08,
      confidence: parsed.confidence || 'Medium',
      aiScoreRationale: parsed.aiScoreRationale || '',
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      sentiment: parsed.sentiment || 'Neutral',
      turnoverRisk: parsed.turnoverRisk || 'Low',
      productivityTrend: parsed.productivityTrend || 'Fluctuating',
      loggingConsistency: parsed.loggingConsistency || 'Poor',
      businessImpact: parsed.businessImpact || 'Medium',
      actionItems: parsed.actionItems || [],
      startDate: startBound,
      endDate: endBound,
      reviewMonth: cycle.reviewMonth,
      prompt: historyContext,
      responseRaw: contentText,
      modelUsed: modelName,
      status: 'COMPLETED',
      generatedAt: now
    },
    { upsert: true }
  );

  return { ...parsed, startDate: startBound, endDate: endBound, reviewMonth: cycle.reviewMonth, status: 'COMPLETED', generatedAt: now };
};

const formatDateDDMMYYYY = (dateInput) => {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

// Algorithmic local fallback synthesizing all employee evidence & manager feedback
const generateLocalFallback = (scores, managerReviews, certifications = [], attendanceRecords = [], awards = [], workJournalItems = []) => {
  const logCount = (workJournalItems || []).length;
  
  // 1. Work Journal Logging Compliance Audit (50% Weight)
  // Daily work logging is a mandatory daily operational requirement (not occasional!).
  let workLogQualityScore = 5.0;
  let loggingConsistency = 'Excellent';
  let confidence = 'High';

  if (logCount <= 3) {
    workLogQualityScore = 1.0; // 0-3 logs in cycle: Critical logging non-compliance
    loggingConsistency = 'Poor';
    confidence = 'Low';
  } else if (logCount <= 8) {
    workLogQualityScore = 2.0; // 4-8 logs in cycle: Severe under-logging penalty (<5% daily compliance)
    loggingConsistency = 'Poor';
    confidence = 'Medium';
  } else if (logCount <= 20) {
    workLogQualityScore = 3.0; // 9-20 logs in cycle: Irregular logging
    loggingConsistency = 'Moderate';
    confidence = 'High';
  } else if (logCount <= 45) {
    workLogQualityScore = 4.0; // 21-45 logs in cycle: Good logging
    loggingConsistency = 'Good';
    confidence = 'High';
  }

  // 2. Manager Competency Ratings Average (20% Weight)
  let mgrCompAvg = 3.50;
  let mgrComments = '';
  if (managerReviews.length > 0) {
    const mr = managerReviews[0];
    if (mr.competencyRatings) {
      const vals = Object.values(mr.competencyRatings).map(Number).filter(v => v > 0);
      if (vals.length > 0) mgrCompAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
    if (mr.overallComments) mgrComments = mr.overallComments;
  }

  // 3. Attendance Average (Calculated from Total Days Present / Total Working Days in Cycle)
  let avgAttendance = 85.6;
  if (attendanceRecords.length > 0) {
    const totalPresent = attendanceRecords.reduce((sum, att) => sum + (att.daysPresent || (att.attendancePercentage ? (att.attendancePercentage * (att.totalWorkingDays || 22) / 100) : 0)), 0);
    const totalDays = attendanceRecords.reduce((sum, att) => sum + (att.totalWorkingDays || 22), 0);
    avgAttendance = totalDays > 0 ? (totalPresent / totalDays) * 100 : (attendanceRecords.reduce((sum, att) => sum + (att.attendancePercentage || 0), 0) / attendanceRecords.length);
  }
  const attScore = Math.min(5.0, Math.max(1.0, (avgAttendance / 100) * 5.0));

  // 4. Certifications Score (10% Weight)
  const certScore = certifications.length === 0 ? 3.0 : certifications.length === 1 ? 4.0 : 5.0;

  // 5. Awards & Recognition Score (10% Weight)
  const awardScore = awards.length === 0 ? 3.0 : awards.length === 1 ? 4.25 : 5.0;

  // 6. Honest Independent AI Audit Score Formula (1.00 - 5.00)
  // 50% Daily Work Journal Logging + 20% Manager Competency + 10% Attendance + 10% Certs + 10% Awards
  const rawAiScore = (workLogQualityScore * 0.50) + (mgrCompAvg * 0.20) + (attScore * 0.10) + (certScore * 0.10) + (awardScore * 0.10);
  const aiScore = Math.round(rawAiScore * 100) / 100;

  // Extract Projects, Categories, Work Summaries, Certifications, Awards
  const certNames = certifications.map(c => `"${c.name}" (${c.issuer})`).join(', ');
  const awardNames = awards.map(a => `"${a.category}"`).join(', ');

  // Synthesize actual work summaries from logged achievements
  const workSummariesList = workJournalItems.map(w => {
    const summaryText = w.resultSummary || w.description || '';
    return `"${w.title}"${summaryText ? `: ${summaryText}` : ''}`;
  });
  const topWorkSummaries = workSummariesList.slice(0, 3).join('; ');

  // Build Honest Rationale
  let aiScoreRationale = `Independent AI Audit Score is ${aiScore.toFixed(2)}/5.0. Derived from 50% Work Journal Proof (${logCount} entries logged in cycle), 20% Manager Competency Evaluation (${mgrCompAvg.toFixed(2)}/5.0), 10% Attendance (${avgAttendance.toFixed(1)}%), 10% Certifications (${certifications.length} active), and 10% Awards (${awards.length} active).`;
  if (mgrComments) {
    aiScoreRationale += ` Manager feedback note: "${mgrComments}".`;
  }

  // Build Strengths
  const strengths = [];
  if (topWorkSummaries) {
    strengths.push(`Successfully delivered key work activities during cycle: ${topWorkSummaries}.`);
  }
  if (certifications.length > 0) {
    strengths.push(`Earned professional credential(s): ${certNames}.`);
  }
  if (awards.length > 0) {
    strengths.push(`Recognized with company award(s): ${awardNames}.`);
  }
  strengths.push(`Evaluated with strong manager competency ratings averaging ${mgrCompAvg.toFixed(2)}/5.0 across core qualities.`);

  // Build Honest Improvement Areas
  const improvements = [];
  if (logCount <= 10) {
    improvements.push(`Increase daily work log submission frequency (currently ${logCount} entries logged in cycle). Regular daily logging ensures full visibility into daily achievements and output.`);
  } else if (logCount < 30) {
    improvements.push(`Maintain consistent daily work logging throughout the review cycle (currently ${logCount} entries).`);
  }
  if (avgAttendance < 90) {
    improvements.push(`Target attendance improvement above 90% (currently ${avgAttendance.toFixed(1)}%).`);
  }
  if (mgrComments) {
    improvements.push(`Address manager evaluation guidance: "${mgrComments}".`);
  } else {
    improvements.push('Focus on expanding quantitative performance output metrics in daily work logs.');
  }

  // Build Executive Summary reading actual work summaries
  let summary = `${employee.firstName || ''} ${employee.lastName || ''}, a ${employee.designationId?.designationName || 'Team Member'} in ${employee.departmentId?.departmentName || 'Department'}, `;
  if (workJournalItems.length > 0) {
    summary += `demonstrated key deliverables in this cycle including ${topWorkSummaries}. `;
  } else {
    summary += `completed tasks during this review cycle. `;
  }
  if (certifications.length > 0 || awards.length > 0) {
    summary += `Verified accomplishments include ${certifications.length > 0 ? `credentials (${certNames})` : ''}${certifications.length > 0 && awards.length > 0 ? ' and ' : ''}${awards.length > 0 ? `awards (${awardNames})` : ''}. `;
  }
  summary += `Manager competency ratings averaged ${mgrCompAvg.toFixed(2)}/5.0 with verified attendance at ${avgAttendance.toFixed(1)}%.`;

  return {
    summary,
    aiScore,
    confidence,
    aiScoreRationale,
    strengths,
    improvements,
    sentiment: logCount <= 5 ? 'Mixed' : (aiScore >= 4.0 ? 'Positive' : 'Neutral'),
    turnoverRisk: 'Low',
    productivityTrend: logCount >= 20 ? 'Improving' : 'Fluctuating',
    loggingConsistency,
    businessImpact: logCount <= 5 ? 'Low' : 'High',
    actionItems: [
      'Establish a mandatory daily work log submission routine (at least 4-5 logs per week).',
      certifications.length > 0 ? 'Leverage active certifications for high-impact project architecture.' : 'Pursue role-based technical certifications.'
    ]
  };
};

module.exports = {
  getAiInsights,
  regenerateAiInsights,
  calculateCyclePeriodBounds
};
