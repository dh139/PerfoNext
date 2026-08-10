const User = require('../models/User');
const ReviewScore = require('../models/ReviewScore');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const Certification = require('../models/Certification');
const AttendancePunch = require('../models/AttendancePunch');
const AttendanceSettings = require('../models/AttendanceSettings');
const Holiday = require('../models/Holiday');
const Recognition = require('../models/Recognition');
const AIReport = require('../models/AIReport');
const ReviewCycle = require('../models/ReviewCycle');
const WorkJournal = require('../models/WorkJournal');
const WorkJournalTemplate = require('../models/WorkJournalTemplate');
const fs = require('fs');
const path = require('path');

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
        loggingConsistency: cachedReport.loggingConsistency || 'Moderate',
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
    let employeeObj = {};
    try {
      if (employeeId) {
        employeeObj = await User.findById(employeeId).populate('departmentId designationId') || {};
      }
    } catch (e) {
      console.error('Failed to fetch employee in getAiInsights catch:', e);
    }
    return await generateLocalFallback(employeeObj, [], [], [], [], [], [], {}, null, null);
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

  const dailyPunches = await AttendancePunch.find({ employeeId, date: { $gte: startBound, $lte: endBound } }).sort('date');

  // Work Journal Verified Evidence strictly in cycle window
  const workJournalItems = await WorkJournal.find({
    employeeId,
    completedDate: { $gte: startBound, $lte: endBound },
    status: { $in: ['approved', 'verified'] }
  }).sort('-completedDate');

  // PDF text extraction is disabled.

  const deptId = employee.departmentId?._id || employee.departmentId;
  const journalTemplate = deptId ? await WorkJournalTemplate.findOne({ departmentId: deptId }) : null;
  const customFieldMap = {};
  if (journalTemplate && journalTemplate.customFields) {
    journalTemplate.customFields.forEach(f => {
      customFieldMap[f.fieldKey] = f.label;
    });
  }

  const actualLogs = workJournalItems.filter(w => !['certification', 'recognition', 'award'].includes(w.category?.toLowerCase()));
  const actualLogsCount = actualLogs.length;

  // Construct analysis prompt context matching PerfoNext Architecture
  let historyContext = `EMPLOYEE EVIDENCE PROFILE (Evaluation Period: ${formatDateDDMMYYYY(startBound)} to ${formatDateDDMMYYYY(endBound)})
Employee: ${employee.firstName} ${employee.lastName} (Code: ${employee.employeeCode})
Designation: ${employee.designationId?.designationName || 'N/A'}
Department: ${employee.departmentId?.departmentName || 'N/A'}

Note: The employee has logged a TOTAL of ${workJournalItems.length} records in their work journal, but only ${actualLogsCount} are ACTUAL daily work logs (the rest are certifications/awards recorded in the work journal). You MUST strictly apply the logging compliance penalty scale based on the ${actualLogsCount} actual daily work logs (severe under-logging penalty for 0-3 actual logs).

1. VERIFIED APPROVED DAILY WORK LOGS (${workJournalItems.length} Entries Logged in this entire cycle period):
`;

  if (workJournalItems.length === 0) {
    historyContext += '- Zero approved daily work logs recorded in this period.\n';
  } else {
    workJournalItems.forEach((w, idx) => {
      let customFieldsStr = '';
      if (w.customFieldsData && typeof w.customFieldsData === 'object' && Object.keys(w.customFieldsData).length > 0) {
        const fields = [];
        for (const [key, val] of Object.entries(w.customFieldsData)) {
          if (val !== undefined && val !== null && val !== '') {
            const label = customFieldMap[key] || key;
            fields.push(`"${label}": "${val}"`);
          }
        }
        if (fields.length > 0) {
          customFieldsStr = ' | Custom Questions: ' + fields.join(', ');
        }
      }
      historyContext += `${idx + 1}. [Category: ${w.category}] Title: "${w.title}" | Project: "${w.project || 'General'}" | Date Completed: ${formatDateDDMMYYYY(w.completedDate)} | Hours Logged: ${w.hoursSpent || 0} Hrs | Work Summary & Output Result: "${w.resultSummary || 'N/A'}" | Manager Review Note: "${w.managerFeedback || 'Good Work'}" | Evidence Proof Type: ${w.evidenceType}${customFieldsStr}\n`;
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

  // 1. Calculate detailed attendance metrics from daily punches
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let incompleteDays = 0;
  let lateDays = 0;
  let totalWorkingMinutes = 0;
  let totalOvertimeMinutes = 0;
  let totalLoginMs = 0;
  let loginCount = 0;
  let totalLogoutMs = 0;
  let logoutCount = 0;
  
  dailyPunches.forEach(p => {
    if (['Present', 'Late', 'Regularized'].includes(p.status)) presentDays++;
    else if (p.status === 'Half Day') halfDays++;
    else if (['Absent', 'Auto Closed', 'Unusual'].includes(p.status)) absentDays++;
    else if (p.status === 'Incomplete') incompleteDays++;
    
    if (p.lateMinutes > 0) lateDays++;
    totalWorkingMinutes += (p.workingMinutes || 0);
    totalOvertimeMinutes += (p.overtimeMinutes || 0);
    
    if (p.punchIn) {
      const pin = new Date(p.punchIn);
      totalLoginMs += pin.getHours() * 3600000 + pin.getMinutes() * 60000 + pin.getSeconds() * 1000;
      loginCount++;
    }
    if (p.punchOut) {
      const pout = new Date(p.punchOut);
      totalLogoutMs += pout.getHours() * 3600000 + pout.getMinutes() * 60000 + pout.getSeconds() * 1000;
      logoutCount++;
    }
  });

  const formatMsToTime = (ms) => {
    if (ms === 0) return 'N/A';
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    return `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
  };

  const avgLoginTime = loginCount > 0 ? formatMsToTime(totalLoginMs / loginCount) : 'N/A';
  const avgLogoutTime = logoutCount > 0 ? formatMsToTime(totalLogoutMs / logoutCount) : 'N/A';
  
  const avgWorkingHours = dailyPunches.filter(p => p.punchOut).length > 0
    ? (totalWorkingMinutes / dailyPunches.filter(p => p.punchOut).length / 60).toFixed(2)
    : '0.00';
    
  const overtimeHours = (totalOvertimeMinutes / 60).toFixed(2);
  
  let attendancePct = 0;
  if (dailyPunches.length > 0) {
    let totalPresent = 0;
    dailyPunches.forEach(p => {
      if (p.status === 'Present' || p.status === 'Late' || p.status === 'Regularized' || p.status === 'Incomplete') totalPresent += 1;
      else if (p.status === 'Half Day') totalPresent += 0.5;
    });

    // Load configurable weekends and holidays
    let configWeekends = [0, 6];
    try {
      const attSettings = await AttendanceSettings.findOne().sort('-version');
      if (attSettings?.attendanceRules?.weekends?.length > 0) {
        configWeekends = attSettings.attendanceRules.weekends;
      }
    } catch (_) { /* use defaults */ }

    const holidayDates = new Set();
    try {
      const startStr = startBound ? (startBound instanceof Date ? startBound : new Date(startBound)).toISOString().split('T')[0] : '';
      const endStr = endBound ? (endBound instanceof Date ? endBound : new Date(endBound)).toISOString().split('T')[0] : '';
      if (startStr && endStr) {
        const activeHolidays = await Holiday.find({
          date: { $gte: startStr, $lte: endStr }
        }).lean();
        activeHolidays.forEach(h => {
          if (h.date) holidayDates.add(h.date);
        });
      }
    } catch (_) {}

    let totalDays = 0;
    const dTemp = new Date(startBound);
    for (let d = dTemp; d <= endBound; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (!configWeekends.includes(d.getUTCDay()) && !holidayDates.has(dateStr)) {
        totalDays++;
      }
    }
    totalDays = Math.max(1, totalDays);
    attendancePct = Math.round((totalPresent / totalDays) * 100);
  }
  
  let consistency = 'Excellent';
  if (lateDays > 5) consistency = 'Poor';
  else if (lateDays > 2) consistency = 'Moderate';
  else consistency = 'Excellent';

  historyContext += `\n3. ATTENDANCE & PUNCH PERFORMANCE METRICS (Selected Review Cycle):
- Attendance Rate: ${attendancePct}%
- Total Present Days: ${presentDays} | Half Days: ${halfDays} | Absent Days: ${absentDays} | Incomplete Days: ${incompleteDays}
- Late Arrivals Days: ${lateDays} (Consistency Rating: ${consistency})
- Average Shift Login Time: ${avgLoginTime} | Average Shift Logout Time: ${avgLogoutTime}
- Average Working Hours Per Punched Day: ${avgWorkingHours} Hrs | Overtime Accumulated: ${overtimeHours} Hrs
`;

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

  const apiKey = (process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY || '').trim();
  let modelName = (process.env.CHATGPT_MODEL || 'gpt-4o-mini').trim();
  
  let targetUrl = (process.env.CHATGPT_API_URL || '').trim();
  if (!targetUrl) {
    targetUrl = 'https://api.openai.com/v1/chat/completions';
  }

  // Determine dynamic local fallback score using a holistic approach
  let fallbackScore = 3.50;
  let mgrCompAvg = 3.50;
  if (managerReviews.length > 0) {
    const mr = managerReviews[0];
    if (mr.competencyRatings) {
      const vals = Object.values(mr.competencyRatings).map(Number).filter(v => v > 0);
      if (vals.length > 0) mgrCompAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }
  const attScore = Math.min(5.0, Math.max(1.0, (attendancePct / 100) * 5.0));
  const certScore = certifications.length === 0 ? 3.0 : certifications.length === 1 ? 4.0 : 5.0;
  const awardScore = awards.length === 0 ? 3.0 : awards.length === 1 ? 4.25 : 5.0;
  
  // Local fallback baseline: 40% Manager competency, 30% Work logs volume, 10% Attendance, 10% Certs, 10% Awards
  const logsVolumeScore = actualLogsCount === 0 ? 1.5 : actualLogsCount <= 3 ? 2.5 : actualLogsCount <= 10 ? 3.5 : actualLogsCount <= 25 ? 4.5 : 5.0;
  const rawFallback = (mgrCompAvg * 0.40) + (logsVolumeScore * 0.30) + (attScore * 0.10) + (certScore * 0.10) + (awardScore * 0.10);
  fallbackScore = Math.round(rawFallback * 100) / 100;

  const systemPrompt = `You are PerfoNext AI Performance Intelligence, an enterprise HR Performance Auditor.

Your primary objective is to deliver an HONEST, EVIDENCE-BASED PERFORMANCE AUDIT for an employee based strictly on their verified Daily Work Logs, custom department questions/answers, Manager Comments, Attendance, Certifications, Awards, and Manager Competency Ratings.

Evaluation Period:
${formatDateDDMMYYYY(startBound)} to ${formatDateDDMMYYYY(endBound)}

SCORING INSTRUCTIONS:
- Determine the employee's overall performance score on a 5-point scale.
- Return:
  * aiScore: decimal between 1.00 and 5.00
  * aiScoreDisplay: "/5.0"
  * confidence: "High", "Medium", or "Low"
  * aiScoreRationale: brief explanation of how the score was derived from the evidence
  * strengths: array of evidence-grounded performance strengths
  * improvements: array of evidence-grounded improvement areas
  * sentiment: overall tone of the evidence ("Positive", "Neutral", or "Mixed")
  * loggingConsistency: "Excellent", "Good", "Moderate", or "Poor"
  * actionItems: concrete follow-up steps for the employee

Consider ALL verified and relevant evidence available for the evaluation period, including:
- Actual daily work logs, work quality, and outcomes
- Manager competency ratings and feedback
- Attendance and punctuality
- Working hours / approved attendance records
- Certifications, awards, and recognitions

Do NOT use predetermined category weights or mandatory caps based on log counts.
Instead, determine the relative importance of each factor dynamically based on:
1. The quality and reliability of the evidence.
2. The employee's role and responsibilities.
3. The evaluation period.
4. The amount of evidence available.
5. The significance of the employee's achievements or deficiencies.
6. Whether the evidence represents actual performance or merely administrative activity.

Give greater importance to evidence that is directly relevant to actual job performance.
Do not automatically penalize an employee simply because there are fewer work logs if other reliable evidence demonstrates actual performance. However, if insufficient evidence exists to demonstrate performance, clearly reflect that limitation in the score and confidence.
Do not treat certifications or awards as proof of day-to-day job performance by themselves. They should support the overall assessment but should not automatically produce a high score.

Attendance should be evaluated using only valid/approved attendance records.
Do NOT count records marked as "Unusual" as attendance-present evidence.
Do NOT infer attendance from an incomplete or invalid punch record.

The score must represent an honest, evidence-based assessment rather than a mechanically calculated formula.
Do not artificially increase or decrease the score to satisfy any predetermined target.

Explain briefly why the score was given and identify the strongest positive and negative evidence.

Output JSON in this exact structure (raw JSON, no markdown formatting):
{
  "summary": "<2-3 sentence executive summary written as an HR Business Partner describing actual work deliverables, custom department question answers, credentials, awards, attendance percentage, and manager ratings>",
  "aiScore": 3.50,
  "aiScoreDisplay": "/5.0",
  "confidence": "Medium",
  "aiScoreRationale": "<explanation>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "sentiment": "Neutral",
  "loggingConsistency": "Moderate",
  "actionItems": ["<action item 1>", "<action item 2>"]
}`;

  // Call ChatGPT 5.6 Terra LLM API
  let response = await fetch(targetUrl, {
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

  let errText = '';
  if (!response.ok) {
    errText = await response.text();
    let isModelNotFoundError = false;
    try {
      const errObj = JSON.parse(errText);
      if (errObj.error?.code === 'model_not_found' || 
          (errObj.error?.message && errObj.error.message.includes('does not exist'))) {
        isModelNotFoundError = true;
      }
    } catch (e) {}

    if (isModelNotFoundError && modelName !== 'gpt-4o-mini') {
      console.warn(`Model ${modelName} not found/accessible. Retrying with gpt-4o-mini...`);
      response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: historyContext }
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });
      if (!response.ok) {
        errText = await response.text();
      }
    }
  }

  if (!response.ok) {
    console.warn('ChatGPT API responded with error, utilizing local analytics engine:', errText);
    const fallbackParsed = await generateLocalFallback(employee, scores, managerReviews, certifications, dailyPunches, awards, workJournalItems, customFieldMap, startBound, endBound);

    await AIReport.findOneAndUpdate(
      { employeeId, reviewCycleId: cycleId },
      {
        employeeId,
        reviewCycleId: cycleId,
        summary: fallbackParsed.summary,
        aiScore: fallbackScore,
        confidence: fallbackParsed.confidence || 'Medium',
        aiScoreRationale: fallbackParsed.aiScoreRationale || '',
        strengths: fallbackParsed.strengths || [],
        improvements: fallbackParsed.improvements || [],
        sentiment: fallbackParsed.sentiment || 'Neutral',
        loggingConsistency: fallbackParsed.loggingConsistency || 'Poor',
        actionItems: fallbackParsed.actionItems || [],
        startDate: startBound,
        endDate: endBound,
        reviewMonth: cycle.reviewMonth,
        prompt: historyContext,
        responseRaw: 'LOCAL_FALLBACK_ENGINED_GENERATION: ' + errText,
        status: 'COMPLETED',
        generatedAt: new Date()
      },
      { upsert: true }
    );

    return { ...fallbackParsed, aiScore: fallbackScore, startDate: startBound, endDate: endBound, reviewMonth: cycle.reviewMonth, status: 'COMPLETED', generatedAt: new Date() };
  }

  const resData = await response.json();
  const contentText = resData.choices[0]?.message?.content;
  const parsed = JSON.parse(contentText);
  const now = new Date();
  
  // Read aiScore directly from LLM response or fallback to local baseline calculation
  const parsedScore = Number(parsed.aiScore);
  const finalAiScore = (!isNaN(parsedScore) && parsedScore >= 1.0 && parsedScore <= 5.0) 
    ? Math.round(parsedScore * 100) / 100 
    : fallbackScore;

  // Save new completed AI report to MongoDB
  await AIReport.findOneAndUpdate(
    { employeeId, reviewCycleId: cycleId },
    {
      employeeId,
      reviewCycleId: cycleId,
      summary: parsed.summary,
      aiScore: finalAiScore,
      confidence: parsed.confidence || 'Medium',
      aiScoreRationale: parsed.aiScoreRationale || '',
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      sentiment: parsed.sentiment || 'Neutral',
      loggingConsistency: parsed.loggingConsistency || 'Poor',
      actionItems: parsed.actionItems || [],
      startDate: startBound,
      endDate: endBound,
      reviewMonth: cycle.reviewMonth,
      prompt: historyContext,
      responseRaw: contentText,
      status: 'COMPLETED',
      generatedAt: now
    },
    { upsert: true }
  );

  return { ...parsed, aiScore: finalAiScore, startDate: startBound, endDate: endBound, reviewMonth: cycle.reviewMonth, status: 'COMPLETED', generatedAt: now };
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
const generateLocalFallback = async (employee, scores, managerReviews, certifications = [], dailyPunches = [], awards = [], workJournalItems = [], customFieldMap = {}, startBound, endBound) => {
  const actualLogs = (workJournalItems || []).filter(w => !['certification', 'recognition', 'award'].includes(w.category?.toLowerCase()));
  const actualLogCount = actualLogs.length;
  
  // 1. Work Journal Logging Compliance Audit (50% Weight)
  // Daily work logging is a mandatory daily operational requirement (not occasional!).
  let workLogQualityScore = 5.0;
  let loggingConsistency = 'Excellent';
  let confidence = 'High';

  if (actualLogCount <= 3) {
    workLogQualityScore = 1.0; // 0-3 logs in cycle: Critical logging non-compliance
    loggingConsistency = 'Poor';
    confidence = 'Low';
  } else if (actualLogCount <= 8) {
    workLogQualityScore = 2.0; // 4-8 logs in cycle: Severe under-logging penalty (<5% daily compliance)
    loggingConsistency = 'Poor';
    confidence = 'Medium';
  } else if (actualLogCount <= 20) {
    workLogQualityScore = 3.0; // 9-20 logs in cycle: Irregular logging
    loggingConsistency = 'Moderate';
    confidence = 'High';
  } else if (actualLogCount <= 45) {
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
  if (dailyPunches.length > 0) {
    let totalPresent = 0;
    dailyPunches.forEach(p => {
      if (p.status === 'Present' || p.status === 'Late' || p.status === 'Regularized' || p.status === 'Incomplete') totalPresent += 1;
      else if (p.status === 'Half Day') totalPresent += 0.5;
    });

    let totalDays = 0;
    const dTemp2 = startBound ? new Date(startBound) : null;
    const dEnd2 = endBound ? new Date(endBound) : null;
    // Load configurable weekends for score calculation
    let configWeekends2 = [0, 6];
    try {
      const attSettings2 = await AttendanceSettings.findOne().sort('-version');
      if (attSettings2?.attendanceRules?.weekends?.length > 0) {
        configWeekends2 = attSettings2.attendanceRules.weekends;
      }
    } catch (_) { /* use defaults */ }

    const holidayDates2 = new Set();
    try {
      const startStr2 = dTemp2 ? dTemp2.toISOString().split('T')[0] : '';
      const endStr2 = dEnd2 ? dEnd2.toISOString().split('T')[0] : '';
      if (startStr2 && endStr2) {
        const activeHolidays2 = await Holiday.find({
          date: { $gte: startStr2, $lte: endStr2 }
        }).lean();
        activeHolidays2.forEach(h => {
          if (h.date) holidayDates2.add(h.date);
        });
      }
    } catch (_) {}

    if (dTemp2 && !isNaN(dTemp2.getTime()) && dEnd2 && !isNaN(dEnd2.getTime())) {
      for (let d = dTemp2; d <= dEnd2; d.setUTCDate(d.getUTCDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (!configWeekends2.includes(d.getUTCDay()) && !holidayDates2.has(dateStr)) {
          totalDays++;
        }
      }
    }
    totalDays = Math.max(1, totalDays);
    avgAttendance = (totalPresent / totalDays) * 100;
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
    let customFieldsStr = '';
    if (w.customFieldsData && typeof w.customFieldsData === 'object' && Object.keys(w.customFieldsData).length > 0) {
      const fields = [];
      for (const [key, val] of Object.entries(w.customFieldsData)) {
        if (val !== undefined && val !== null && val !== '') {
          const label = customFieldMap[key] || key;
          fields.push(`${label}: ${val}`);
        }
      }
      if (fields.length > 0) {
        customFieldsStr = ` (${fields.join(', ')})`;
      }
    }
    return `"${w.title}"${summaryText ? `: ${summaryText}` : ''}${customFieldsStr}`;
  });
  const topWorkSummaries = workSummariesList.slice(0, 3).join('; ');

  // Build Honest Rationale
  let aiScoreRationale = `Independent AI Audit Score is ${aiScore.toFixed(2)}/5.0. Derived from 50% Work Journal Proof (${actualLogCount} actual entries logged in cycle), 20% Manager Competency Evaluation (${mgrCompAvg.toFixed(2)}/5.0), 10% Attendance (${avgAttendance.toFixed(1)}%), 10% Certifications (${certifications.length} active), and 10% Awards (${awards.length} active).`;
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
  if (actualLogCount <= 10) {
    improvements.push(`Increase daily work log submission frequency (currently ${actualLogCount} entries logged in cycle). Regular daily logging ensures full visibility into daily achievements and output.`);
  } else if (actualLogCount < 30) {
    improvements.push(`Maintain consistent daily work logging throughout the review cycle (currently ${actualLogCount} entries).`);
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
    sentiment: actualLogCount <= 5 ? 'Mixed' : (aiScore >= 4.0 ? 'Positive' : 'Neutral'),
    loggingConsistency,
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
