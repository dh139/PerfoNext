const User = require('../models/User');
const ReviewScore = require('../models/ReviewScore');
const SelfAssessment = require('../models/SelfAssessment');
const ManagerReview = require('../models/ManagerReview');
const Certification = require('../models/Certification');
const Attendance = require('../models/Attendance');
const Recognition = require('../models/Recognition');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

const getAiInsights = async (employeeId) => {
  try {
    // 1. Gather employee details
    const employee = await User.findById(employeeId)
      .populate('departmentId designationId')
      .select('firstName lastName employeeCode role departmentId designationId');

    if (!employee) {
      throw new Error('Employee not found');
    }

    // 2. Gather performance, attendance, certification, and awards history
    const scores = await ReviewScore.find({ employeeId }).populate('reviewCycleId').sort('createdAt');
    const selfAssessments = await SelfAssessment.find({ employeeId }).sort('createdAt');
    const managerReviews = await ManagerReview.find({ employeeId }).sort('createdAt');
    const certifications = await Certification.find({ employeeId }).sort('createdAt');
    const attendanceRecords = await Attendance.find({ employeeId }).sort('month');
    const awards = await Recognition.find({ employeeId }).populate('awardedBy').sort('-awardedAt');

    // Auto-heal existing certifications with missing extractedText on-the-fly
    for (const c of certifications) {
      if (!c.extractedText || !c.extractedText.trim()) {
        const filename = path.basename(c.fileUrl);
        const absolutePath = path.join(__dirname, '../uploads', filename);
        if (fs.existsSync(absolutePath) && filename.toLowerCase().endsWith('.pdf')) {
          try {
            const dataBuffer = fs.readFileSync(absolutePath);
            const parsedData = await pdf(dataBuffer);
            c.extractedText = parsedData.text || '';
            await Certification.findByIdAndUpdate(c._id, { extractedText: c.extractedText });
          } catch (err) {
            console.error(`Retroactive PDF text extraction failed for cert ${c._id}:`, err);
          }
        }
      }
    }

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

    historyContext += '\nProfessional Certifications & Achievements:\n';
    if (certifications.length === 0) {
      historyContext += '- None registered.\n';
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

    historyContext += '\nMonthly Attendance Percentage Records:\n';
    if (attendanceRecords.length === 0) {
      historyContext += '- None synchronized.\n';
    } else {
      attendanceRecords.forEach(att => {
        historyContext += `- Month: ${att.month} | Attendance: ${att.attendancePercentage}%\n`;
      });
    }

    historyContext += '\nAwards & Recognitions (Accolades Wall):\n';
    if (awards.length === 0) {
      historyContext += '- None granted.\n';
    } else {
      awards.forEach(aw => {
        const grantor = aw.awardedBy ? `${aw.awardedBy.firstName} ${aw.awardedBy.lastName}` : 'System';
        historyContext += `- Award Accolade: "${aw.category}" granted by "${grantor}" with citation: "${aw.comments || ''}"\n`;
      });
    }

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
            content: `You are a strategic HR Executive AI Advisor. Analyze the employee's performance score trends, self comments, manager reviews, monthly attendance percentage, professional certifications, and awards/accolades. Generate a comprehensive professional performance insight analysis report.
Output exactly in this clean JSON structure (do not include markdown wrapping blocks, just raw JSON):
{
  "summary": "2-3 sentence executive summary of overall performance, incorporating attendance status, awards, and credentials.",
  "strengths": ["Strength point 1 (e.g. certificates, awards, performance highlights)", "Strength point 2"],
  "improvements": ["Area of growth 1", "Area of growth 2"],
  "sentiment": "Positive / Mixed / Critical",
  "turnoverRisk": "Low / Medium / High (incorporate attendance percentage in this estimation)",
  "actionItems": ["Recommended action 1 (e.g. leveraging certifications, next steps)", "Recommended action 2"]
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
      return generateLocalFallback(scores, managerReviews, certifications, attendanceRecords, awards);
    }

    const resData = await response.json();
    const contentText = resData.choices[0]?.message?.content;
    
    // Parse JSON
    return JSON.parse(contentText);

  } catch (error) {
    console.error('getAiInsights error:', error);
    // Return structured fallback
    return generateLocalFallback([], [], [], [], []);
  }
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

  // Process certifications
  if (certifications.length > 0) {
    certifications.forEach(c => {
      strengths.push(`Successfully completed credential: "${c.name}" issued by ${c.issuer}.`);
    });
  }

  // Process awards
  if (awards.length > 0) {
    awards.forEach(aw => {
      strengths.push(`Awarded recognition: "${aw.category}" accolade for high contribution.`);
    });
  }

  // Process attendance
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
  getAiInsights
};
