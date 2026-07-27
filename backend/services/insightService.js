const User = require('../models/User');
const ReviewScore = require('../models/ReviewScore');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const Certification = require('../models/Certification');
const Attendance = require('../models/Attendance');
const Recognition = require('../models/Recognition');
const AIReport = require('../models/AIReport');
const ReviewCycle = require('../models/ReviewCycle');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

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

  if (cycle.cycleType === 'quarterly' && cycle.reviewMonth) {
    const match = cycle.reviewMonth.match(/^(\d{4})-Q([1-4])$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const q = parseInt(match[2], 10);
      const startMonth = (q - 1) * 3; // 0 for Q1, 3 for Q2, 6 for Q3, 9 for Q4
      startBound = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
      endBound = new Date(Date.UTC(year, startMonth + 3, 0, 12, 0, 0));
      return { startBound, endBound };
    }
  }

  if (cycle.cycleType === 'annual' && cycle.reviewMonth) {
    const match = cycle.reviewMonth.match(/^(\d{4})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      startBound = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
      endBound = new Date(Date.UTC(year, 12, 0, 12, 0, 0));
      return { startBound, endBound };
    }
  }

  if (cycle.reviewMonth && /^\d{4}-\d{2}$/.test(cycle.reviewMonth)) {
    const [year, month] = cycle.reviewMonth.split('-').map(Number);
    startBound = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    endBound = new Date(Date.UTC(year, month, 0, 12, 0, 0));
  } else {
    startBound = new Date(cycle.startDate);
    startBound.setUTCHours(0, 0, 0, 0);
    endBound = new Date(cycle.endDate);
    endBound.setUTCHours(12, 0, 0, 0);

    if (endBound.getTime() - startBound.getTime() < 86400000 * 2) {
      const year = startBound.getUTCFullYear();
      const month = startBound.getUTCMonth();
      startBound = new Date(Date.UTC(year, month, 1, 0, 0, 0));
      endBound = new Date(Date.UTC(year, month + 1, 0, 12, 0, 0));
    }
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
        strengths: cachedReport.strengths,
        improvements: cachedReport.improvements,
        sentiment: cachedReport.sentiment,
        turnoverRisk: cachedReport.turnoverRisk,
        actionItems: cachedReport.actionItems,
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
    return generateLocalFallback([], [], [], [], []);
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

  // Delete existing cache first to avoid duplicates
  await AIReport.deleteOne({ employeeId, reviewCycleId: cycleId });

  // Generate and return
  return await generateAndSaveInsights(employeeId, cycleId);
};

// Internal generation logic
const generateAndSaveInsights = async (employeeId, cycleId) => {
  const employee = await User.findById(employeeId)
    .populate('departmentId designationId')
    .select('firstName lastName employeeCode role departmentId designationId');

  if (!employee) {
    throw new Error('Employee not found');
  }

  const cycle = await ReviewCycle.findById(cycleId);
  if (!cycle) {
    throw new Error('Review cycle not found');
  }

  const { startBound, endBound } = calculateCyclePeriodBounds(cycle);

  // Always include target cycleId and any overlapping cycles
  const cycleIds = [cycle._id];
  const overlappingCycles = await ReviewCycle.find({
    _id: { $ne: cycle._id },
    startDate: { $gte: cycle.startDate },
    endDate: { $lte: cycle.endDate }
  });
  overlappingCycles.forEach(c => cycleIds.push(c._id));

  // Query database filtering by cycle date boundaries for review scores, attendance, certifications, and awards
  const scores = await ReviewScore.find({ employeeId, reviewCycleId: { $in: cycleIds } }).populate('reviewCycleId').sort('createdAt');
  const selfAssessments = await SelfAssessment.find({ employeeId, reviewCycleId: { $in: cycleIds } }).sort('createdAt');
  const managerReviews = await ManagerReview.find({ employeeId, reviewCycleId: { $in: cycleIds } }).sort('createdAt');
  const certifications = await Certification.find({ employeeId, issueDate: { $gte: startBound, $lte: endBound } }).sort('-issueDate');
  const awards = await Recognition.find({ employeeId, awardedAt: { $gte: startBound, $lte: endBound } }).populate('awardedBy').sort('-awardedAt');

  const months = getMonthsInRange(startBound, endBound);
  const attendanceRecords = await Attendance.find({ employeeId, month: { $in: months } }).sort('month');

  // Auto-heal certifications pdf text extraction on-the-fly
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

  // Construct analysis prompt context
  let historyContext = `Employee: ${employee.firstName} ${employee.lastName} (Code: ${employee.employeeCode})
Designation: ${employee.designationId?.designationName || 'N/A'}
Department: ${employee.departmentId?.departmentName || 'N/A'}
Evaluation Period: ${new Date(startBound).toLocaleDateString()} to ${new Date(endBound).toLocaleDateString()}

Performance Review Scores for this period:
`;

  scores.forEach(s => {
    const cycleMonth = s.reviewCycleId?.reviewMonth || 'Unknown';
    historyContext += `- Cycle: ${cycleMonth} | Final Score: ${s.finalScore}/5.0 | Rating Band: ${s.rating}\n`;
  });

  historyContext += '\nManager Comments for this period:\n';
  managerReviews.forEach(mr => {
    const scoreCycle = scores.find(s => s.reviewCycleId?._id?.toString() === mr.reviewCycleId?.toString());
    const label = scoreCycle?.reviewCycleId?.reviewMonth ? ` (Cycle: ${scoreCycle.reviewCycleId.reviewMonth})` : '';
    mr.details.forEach(item => {
      if (item.comment) {
        historyContext += `- [Category: ${item.category}]${label} "${item.comment}"\n`;
      }
    });
  });

  historyContext += '\nEmployee Self-Assessment Comments for this period:\n';
  selfAssessments.forEach(sa => {
    const scoreCycle = scores.find(s => s.reviewCycleId?._id?.toString() === sa.reviewCycleId?.toString());
    const label = scoreCycle?.reviewCycleId?.reviewMonth ? ` (Cycle: ${scoreCycle.reviewCycleId.reviewMonth})` : '';
    sa.details.forEach(item => {
      if (item.comment) {
        historyContext += `- [Category: ${item.category}]${label} "${item.comment}"\n`;
      }
    });
  });

  historyContext += '\nProfessional Certifications registered during this period:\n';
  if (certifications.length === 0) {
    historyContext += '- None registered in this range.\n';
  } else {
    certifications.forEach(c => {
      let certDetail = `- Certificate: "${c.name}" issued by "${c.issuer}" on ${new Date(c.issueDate).toLocaleDateString()}`;
      if (c.extractedText && c.extractedText.trim()) {
        const cleanText = c.extractedText.replace(/\s+/g, ' ').trim().slice(0, 500);
        certDetail += ` | Extracted Certificate Content: "${cleanText}"`;
      }
      historyContext += certDetail + '\n';
    });
  }

  historyContext += '\nMonthly Attendance Percentage Records in this range:\n';
  if (attendanceRecords.length === 0) {
    historyContext += '- None synchronized in this range.\n';
  } else {
    attendanceRecords.forEach(att => {
      historyContext += `- Month: ${att.month} | Attendance: ${att.attendancePercentage}%\n`;
    });
  }

  historyContext += '\nAwards & Recognitions granted during this period:\n';
  if (awards.length === 0) {
    historyContext += '- None granted in this range.\n';
  } else {
    awards.forEach(aw => {
      const grantor = aw.awardedBy ? `${aw.awardedBy.firstName} ${aw.awardedBy.lastName}` : 'System';
      historyContext += `- Award Accolade: "${aw.category}" granted by "${grantor}" with citation: "${aw.comments || ''}"\n`;
    });
  }

  // Call Groq LLM API
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a strategic HR Executive AI Advisor. Analyze the employee's performance score trends, self comments, manager reviews, monthly attendance percentage, professional certifications, and awards/accolades for the specified evaluation cycle period (${new Date(startBound).toLocaleDateString()} to ${new Date(endBound).toLocaleDateString()}).

CRITICAL CYCLE-SCOPED RULES:
1. STRICT PERIOD BOUNDARY: You must ONLY analyze performance metrics, reviews, attendance, awards, and certifications that occurred strictly within the specified evaluation cycle period (${new Date(startBound).toLocaleDateString()} to ${new Date(endBound).toLocaleDateString()}).
2. MULTI-PERSPECTIVE EVALUATION: Compare the Employee's Self-Assessment comments/justifications and the Manager's Review comments. Analyze the alignment, gaps, or discrepancies between the self-assessment and manager feedback, and reflect this in your strengths/improvements.
3. CERTIFICATIONS: If professional certifications were earned strictly within this evaluation cycle period, highlight them in "strengths" (e.g. "Earned verified professional certification in AWS CI/CD during this appraisal cycle"). If no certifications were issued during this specific cycle period, do NOT list certificates from other periods.
4. DO NOT suggest "pursuing professional certifications" under "improvements" unless directly relevant to current cycle gaps.

Output exactly in this clean JSON structure (do not include markdown wrapping blocks, just raw JSON):
{
  "summary": "2-3 sentence executive summary of performance during this evaluation cycle period, incorporating attendance status, awards, and credentials.",
  "strengths": ["Strength point 1 (performance highlights and credentials earned during this cycle)", "Strength point 2"],
  "improvements": ["Area of growth 1", "Area of growth 2"],
  "sentiment": "Positive / Mixed / Critical",
  "turnoverRisk": "Low / Medium / High (incorporate attendance percentage for this cycle in this estimation)",
  "actionItems": ["Recommended action 1", "Recommended action 2"]
}`
        },
        {
          role: 'user',
          content: historyContext
        }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn('Groq API responded with error, utilizing local analytics engine:', errText);
    const fallbackParsed = generateLocalFallback(scores, managerReviews, certifications, attendanceRecords, awards);

    await AIReport.findOneAndUpdate(
      { employeeId, reviewCycleId: cycleId },
      {
        employeeId,
        reviewCycleId: cycleId,
        summary: fallbackParsed.summary,
        strengths: fallbackParsed.strengths || [],
        improvements: fallbackParsed.improvements || [],
        sentiment: fallbackParsed.sentiment || 'Neutral',
        turnoverRisk: fallbackParsed.turnoverRisk || 'Low',
        actionItems: fallbackParsed.actionItems || [],
        startDate: startBound,
        endDate: endBound,
        reviewMonth: cycle.reviewMonth,
        prompt: historyContext,
        responseRaw: 'LOCAL_FALLBACK_ENGINED_GENERATION: ' + errText,
        modelUsed: 'local-analytics-fallback',
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
      strengths: parsed.strengths || [],
      improvements: parsed.improvements || [],
      sentiment: parsed.sentiment || 'Neutral',
      turnoverRisk: parsed.turnoverRisk || 'Low',
      actionItems: parsed.actionItems || [],
      startDate: startBound,
      endDate: endBound,
      reviewMonth: cycle.reviewMonth,
      prompt: historyContext,
      responseRaw: contentText,
      modelUsed: GROQ_MODEL,
      status: 'COMPLETED',
      generatedAt: now
    },
    { upsert: true }
  );

  return { ...parsed, startDate: startBound, endDate: endBound, reviewMonth: cycle.reviewMonth, status: 'COMPLETED', generatedAt: now };
};

// Algorithmic local fallback when API key fails or rate-limits
const generateLocalFallback = (scores, managerReviews, certifications = [], attendanceRecords = [], awards = []) => {
  let avgScore = 0;
  if (scores.length > 0) {
    avgScore = scores.reduce((sum, s) => sum + s.finalScore, 0) / scores.length;
  }

  const strengths = [];
  const improvements = [];
  let sentiment = 'Mixed';
  let turnoverRisk = 'Low';

  if (certifications.length > 0) {
    certifications.forEach(c => {
      strengths.push(`Successfully completed credential: "${c.name}" issued by ${c.issuer}.`);
    });
  }

  if (awards.length > 0) {
    awards.forEach(aw => {
      strengths.push(`Awarded recognition: "${aw.category}" accolade for high contribution.`);
    });
  }

  let avgAttendance = 100;
  if (attendanceRecords.length > 0) {
    avgAttendance = attendanceRecords.reduce((sum, att) => sum + att.attendancePercentage, 0) / attendanceRecords.length;
  }

  if (avgAttendance < 85) {
    turnoverRisk = 'High';
    improvements.push(`Improve attendance consistency (currently averaging ${avgAttendance.toFixed(1)}%).`);
  } else if (avgAttendance < 92) {
    turnoverRisk = 'Medium';
    improvements.push(`Align attendance patterns to maintain optimal team availability.`);
  } else {
    strengths.push(`Maintains excellent attendance rate averaging ${avgAttendance.toFixed(1)}%.`);
  }

  if (avgScore >= 4.0) {
    strengths.push('Demonstrates excellent performance exceeding core job criteria.');
    strengths.push('Consistently meets expectations across quality and technical deliverables.');
    improvements.push('Maintain current high benchmarks and look for leadership scaling options.');
    sentiment = 'Positive';
  } else if (avgScore >= 3.0) {
    strengths.push('Reliably meets performance criteria and works well within categories.');
    improvements.push('Focus on technical capability upgrades to transition to leadership roles.');
    sentiment = 'Mixed';
  } else if (avgScore > 0) {
    strengths.push('Shows effort in adapting to role requirements.');
    improvements.push('Requires closer mentoring support and goal clarity to improve productivity.');
    sentiment = 'Critical';
    if (turnoverRisk !== 'High') turnoverRisk = 'Medium';
  } else {
    strengths.push('New hire or pending reviews.');
    improvements.push('Awaiting initial scores to trace baseline capabilities.');
    sentiment = 'Neutral';
  }

  const certText = certifications.length > 0 ? ` with ${certifications.length} active credential(s)` : '';
  const awardText = awards.length > 0 ? ` and ${awards.length} accolade(s) earned` : '';

  return {
    summary: `Based on an average final review grade of ${avgScore.toFixed(2)}/5.0 and a consistent attendance average of ${avgAttendance.toFixed(1)}%, the employee exhibits a stable performance curve${certText}${awardText}.`,
    strengths: strengths.length > 0 ? strengths : ['Core operational tasks completion.'],
    improvements: improvements.length > 0 ? improvements : ['Enhance cross-functional alignment.'],
    sentiment,
    turnoverRisk,
    actionItems: [
      'Conduct regular 1-on-1 performance alignments.',
      certifications.length > 0 ? 'Leverage active certifications for complex team tasks.' : 'Assign targeted micro-learning certification courses.'
    ]
  };
};

module.exports = {
  getAiInsights,
  regenerateAiInsights,
  calculateCyclePeriodBounds
};
