/**
 * BudgetBrain — AI Spending Milestone Feedback Engine
 *
 * Generates dynamic, empathetic, and actionable toast feedback with AI emojis
 * based on the user's spending against monthly budget and daily limits.
 *
 * Tiers:
 *  - EXCEEDED (> 100% Monthly OR Daily Limit Breached): 😰 / 😔 / 🚨
 *  - NEAR_LIMIT (≥ 90% and ≤ 100%): ⚠️ / ⚡ / ⏳
 *  - HALFWAY (≥ 50% and < 90%): ⚖️ / 💡 / 📊
 *  - HEALTHY (< 50%): ✨ / 😊 / 🥳 / 🌱
 */

export type MilestoneTier = 'healthy' | 'halfway' | 'near_limit' | 'exceeded';

export interface MilestoneFeedback {
  tier: MilestoneTier;
  emoji: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error';
  percent: number;
}

export interface EvaluateMilestoneParams {
  expenseTitle: string;
  expenseAmount: number;
  projectedTotalSpent: number;
  budgetLimit: number;
  projectedTodaySpent: number;
  dailyLimit: number;
  formatCurrency: (amount: number) => string;
}

export function evaluateSpendMilestone({
  expenseTitle,
  expenseAmount,
  projectedTotalSpent,
  budgetLimit,
  projectedTodaySpent,
  dailyLimit,
  formatCurrency,
}: EvaluateMilestoneParams): MilestoneFeedback {
  const percent = budgetLimit > 0 ? Math.round((projectedTotalSpent / budgetLimit) * 100) : 0;
  const isOverMonthly = budgetLimit > 0 && projectedTotalSpent > budgetLimit;
  const isOverDaily = dailyLimit > 0 && projectedTodaySpent > dailyLimit;

  // 1. Exceeded: Monthly budget deficit or daily limit breached
  if (isOverMonthly) {
    const deficit = projectedTotalSpent - budgetLimit;
    const sadEmojis = ['😰', '😔', '🚨', '🔥'];
    const emoji = sadEmojis[Math.floor(Math.random() * sadEmojis.length)];
    return {
      tier: 'exceeded',
      emoji,
      title: 'Monthly Budget Breached!',
      message: `${expenseTitle} (${formatCurrency(expenseAmount)}) pushed you into a deficit of ${formatCurrency(deficit)} (${percent}% of budget). Discretionary spending should be paused!`,
      type: 'error',
      percent,
    };
  }

  if (isOverDaily) {
    const dailyPercent = Math.round((projectedTodaySpent / dailyLimit) * 100);
    const sadEmojis = ['😰', '😔', '⚡'];
    const emoji = sadEmojis[Math.floor(Math.random() * sadEmojis.length)];
    return {
      tier: 'exceeded',
      emoji,
      title: 'Daily Spending Limit Exceeded!',
      message: `Today's spend reached ${formatCurrency(projectedTodaySpent)} (${dailyPercent}% of ${formatCurrency(dailyLimit)} daily limit). Take a breather for today!`,
      type: 'error',
      percent: dailyPercent,
    };
  }

  // 2. Near Limit: 90% to 100% of monthly budget
  if (budgetLimit > 0 && percent >= 90) {
    const remaining = Math.max(budgetLimit - projectedTotalSpent, 0);
    const warnEmojis = ['⚠️', '⚡', '⏳', '🚨'];
    const emoji = warnEmojis[Math.floor(Math.random() * warnEmojis.length)];
    return {
      tier: 'near_limit',
      emoji,
      title: 'Budget Alert: 90% Limit Reached',
      message: `Caution! You have utilized ${percent}% of your monthly budget. Only ${formatCurrency(remaining)} cushion left for the rest of the month!`,
      type: 'warning',
      percent,
    };
  }

  // 3. Halfway Milestone: 50% to 89% of monthly budget
  if (budgetLimit > 0 && percent >= 50) {
    const remaining = Math.max(budgetLimit - projectedTotalSpent, 0);
    const midEmojis = ['⚖️', '💡', '📊'];
    const emoji = midEmojis[Math.floor(Math.random() * midEmojis.length)];
    return {
      tier: 'halfway',
      emoji,
      title: '50% Budget Milestone Checkpoint',
      message: `Halfway checkpoint! You've used ${percent}% of your budget (${formatCurrency(remaining)} remaining). Spending pace is on track!`,
      type: 'warning',
      percent,
    };
  }

  // 4. Healthy Spending: Under 50% of budget
  if (budgetLimit > 0 && percent < 50) {
    const goodEmojis = ['✨', '😊', '🥳', '🌱'];
    const emoji = goodEmojis[Math.floor(Math.random() * goodEmojis.length)];
    return {
      tier: 'healthy',
      emoji,
      title: 'Healthy Spending Pace',
      message: `Solid financial discipline! Only ${percent}% of your monthly budget used so far. Keep up the great work!`,
      type: 'success',
      percent,
    };
  }

  // Fallback if no budget set
  return {
    tier: 'healthy',
    emoji: '✨',
    title: 'Expense Logged Successfully',
    message: `${expenseTitle} (${formatCurrency(expenseAmount)}) recorded into your financial ledger.`,
    type: 'success',
    percent: 0,
  };
}
