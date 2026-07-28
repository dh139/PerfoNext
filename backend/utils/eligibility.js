/**
 * HR Review Cycle Eligibility & Evaluation Period Calculator:
 * - Quarterly: 3 Months, Min Service 45 Days. Evaluation Window: Max(Joining Date, Review Start) -> Review End
 * - Half-Yearly: 6 Months, Min Service 60 Days. Evaluation Window: Max(Joining Date, Review Start) -> Review End
 * - Yearly: 12 Months, Min Service 90 Days. Evaluation Window: Max(Joining Date, Review Start) -> Review End
 */

const getCycleEvaluationPeriod = (cycleType, reviewMonth, startDate, endDate) => {
  let reviewStart = null;
  let reviewEnd = null;
  let minDaysRequired = 45; // default quarterly

  const type = (cycleType || '').toLowerCase();

  if (type === 'quarterly' || /^\d{4}-Q[1-4]$/i.test(reviewMonth)) {
    minDaysRequired = 45;
    const match = (reviewMonth || '').match(/^(\d{4})-Q([1-4])$/i);
    if (match) {
      const year = parseInt(match[1], 10);
      const q = parseInt(match[2], 10);
      const startMonth = (q - 1) * 3;
      reviewStart = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
      reviewEnd = new Date(Date.UTC(year, startMonth + 3, 0, 23, 59, 59, 999));
    }
  } else if (type === 'half_yearly' || /^\d{4}-H[1-2]$/i.test(reviewMonth)) {
    minDaysRequired = 60;
    const match = (reviewMonth || '').match(/^(\d{4})-H([1-2])$/i);
    if (match) {
      const year = parseInt(match[1], 10);
      const h = parseInt(match[2], 10);
      const startMonth = (h - 1) * 6;
      reviewStart = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
      reviewEnd = new Date(Date.UTC(year, startMonth + 6, 0, 23, 59, 59, 999));
    }
  } else if (['yearly', 'annual'].includes(type) || /^\d{4}$/.test(reviewMonth)) {
    minDaysRequired = 90;
    const match = (reviewMonth || '').match(/^(\d{4})/);
    if (match) {
      const year = parseInt(match[1], 10);
      reviewStart = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
      reviewEnd = new Date(Date.UTC(year, 12, 0, 23, 59, 59, 999));
    }
  }

  // Fallbacks if reviewStart or reviewEnd could not be parsed from reviewMonth
  if (!reviewStart) {
    reviewStart = startDate ? new Date(startDate) : new Date();
  }
  if (!reviewEnd) {
    reviewEnd = endDate ? new Date(endDate) : new Date(reviewStart.getTime() + 90 * 24 * 60 * 60 * 1000);
  }

  return { reviewStart, reviewEnd, minDaysRequired };
};

const isEmployeeEligibleForCycle = (joiningDate, cycleType, reviewMonth, startDate, endDate) => {
  if (!joiningDate) return false;

  const rawJd = new Date(joiningDate);
  if (isNaN(rawJd.getTime())) return false;

  const jd = new Date(Date.UTC(rawJd.getUTCFullYear(), rawJd.getUTCMonth(), rawJd.getUTCDate(), 0, 0, 0, 0));
  const { reviewStart, reviewEnd, minDaysRequired } = getCycleEvaluationPeriod(cycleType, reviewMonth, startDate, endDate);

  // Effective Evaluation Start Date = Max(Joining Date, Review Start Date)
  const evalStart = jd > reviewStart ? jd : reviewStart;

  // If joining date is after the review period end, 0 days of service
  if (evalStart > reviewEnd) {
    return false;
  }

  // Calculate days of active service during the evaluation period
  const diffMs = reviewEnd.getTime() - evalStart.getTime();
  const serviceDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  return serviceDays >= minDaysRequired;
};

const getEmployeeEvaluationWindow = (joiningDate, cycleType, reviewMonth, startDate, endDate) => {
  const { reviewStart, reviewEnd } = getCycleEvaluationPeriod(cycleType, reviewMonth, startDate, endDate);
  if (!joiningDate) return { evalStart: reviewStart, evalEnd: reviewEnd };

  const rawJd = new Date(joiningDate);
  const jd = new Date(Date.UTC(rawJd.getUTCFullYear(), rawJd.getUTCMonth(), rawJd.getUTCDate(), 0, 0, 0, 0));
  const evalStart = jd > reviewStart ? jd : reviewStart;

  return { evalStart, evalEnd: reviewEnd };
};

module.exports = {
  isEmployeeEligibleForCycle,
  getCycleEvaluationPeriod,
  getEmployeeEvaluationWindow
};
