const User = require('../models/User');
const ReviewScore = require('../models/ReviewScore');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');

const GROQ_API_KEY = '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';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

const getAiInsights = async (employeeId) => {
  try {
    // 1. Gather employee details
    const employee = await User.findById(employeeId)
      .populate('departmentId designationId')
      .select('firstName lastName employeeCode role departmentId designationId');

    if (!employee) {
      throw new Error('Employee not found');
    }

    // 2. Gather performance history
    const scores = await ReviewScore.find({ employeeId }).populate('reviewCycleId').sort('createdAt');
    const selfAssessments = await SelfAssessment.find({ employeeId }).sort('createdAt');
    const managerReviews = await ManagerReview.find({ employeeId }).sort('createdAt');

    // 3. Construct analysis context
    let historyContext = `Employee: ${employee.firstName} ${employee.lastName} (Code: ${employee.employeeCode})
Designation: ${employee.designationId?.designationName || 'N/A'}
Department: ${employee.departmentId?.departmentName || 'N/A'}

Performance Review Cycles:
`;

    scores.forEach((s, idx) => {
      const cycleMonth = s.reviewCycleId?.reviewMonth || 'Unknown';
      historyContext += `- Cycle: ${cycleMonth} | Final Score: ${s.finalScore}/5.0 | Rating Band: ${s.rating}\n`;
    });

    historyContext += '\nManager Comments History:\n';
    managerReviews.forEach(mr => {
      mr.details.forEach(item => {
        if (item.comment) {
          historyContext += `- [Category: ${item.category}] "${item.comment}"\n`;
        }
      });
    });

    historyContext += '\nEmployee Self-Assessment Comments History:\n';
    selfAssessments.forEach(sa => {
      sa.details.forEach(item => {
        if (item.comment) {
          historyContext += `- [Category: ${item.category}] "${item.comment}"\n`;
        }
      });
    });

    // 4. Send query to Groq LLM API
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
            content: `You are a strategic HR Executive AI Advisor. Analyze the employee's performance score trends, self comments, and manager review descriptions. Generate a professional performance insight analysis report.
Output exactly in this clean JSON structure (do not include markdown wrapping blocks, just raw JSON):
{
  "summary": "2-3 sentence executive summary of overall performance.",
  "strengths": ["Strength point 1", "Strength point 2"],
  "improvements": ["Area of growth 1", "Area of growth 2"],
  "sentiment": "Positive / Mixed / Critical",
  "turnoverRisk": "Low / Medium / High",
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
      return generateLocalFallback(scores, managerReviews);
    }

    const resData = await response.json();
    const contentText = resData.choices[0]?.message?.content;
    
    // Parse JSON
    return JSON.parse(contentText);

  } catch (error) {
    console.error('getAiInsights error:', error);
    // Return structured fallback
    return generateLocalFallback([], []);
  }
};

// Algorithmic local fallback when API key fails or rate-limits
const generateLocalFallback = (scores, managerReviews) => {
  let avgScore = 0;
  if (scores.length > 0) {
    avgScore = scores.reduce((sum, s) => sum + s.finalScore, 0) / scores.length;
  }

  const strengths = [];
  const improvements = [];
  let sentiment = 'Mixed';
  let turnoverRisk = 'Low';

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
    turnoverRisk = 'Medium';
  } else {
    strengths.push('New hire or pending reviews.');
    improvements.push('Awaiting initial scores to trace baseline capabilities.');
    sentiment = 'Neutral';
  }

  return {
    summary: `Based on an average final review grade of ${avgScore.toFixed(2)}/5.0 across cycle logs, the employee exhibits a stable performance curve.`,
    strengths: strengths.length > 0 ? strengths : ['Core operational tasks completion.'],
    improvements: improvements.length > 0 ? improvements : ['Enhance cross-functional alignment.'],
    sentiment,
    turnoverRisk,
    actionItems: [
      'Conduct regular 1-on-1 performance alignments.',
      'Assign targeted micro-learning certification courses.'
    ]
  };
};

module.exports = {
  getAiInsights
};
