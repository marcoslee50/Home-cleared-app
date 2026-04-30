// Barry ROI calculator - per Addendum 2.
// Counterfactual: what could Marcos have done solo today?
//
// "Solo time available" defaults to 8 hours = 480 min of working time
// (08:00..16:00 - generous; tweakable in settings later).
//
// Approach:
//  1. Sum actual durations of jobs Barry worked on (operative=barry|both)
//  2. For each such job, estimate the *solo* duration. We don't track a
//     separate solo estimate, so use 1.5x the actual as a heuristic
//     (matches the rough multiplier in the system prompt's table).
//  3. Greedy fit: schedule jobs (in their actual order) into the solo
//     time budget. Anything that doesn't fit is "Barry-enabled revenue".
//  4. Net = Barry-enabled revenue - £80 (Barry's day rate).

import type { CompletedJobSummary } from './day-report'

export interface BarryRoiResult {
  barryWorked: boolean
  barryCost: number
  barryEnabledRevenue: number
  netRoi: number
  jobsBarryEnabled: { clientName: string; price: number; soloMinutes: number }[]
  totalSoloMinutesNeeded: number
  soloBudgetMinutes: number
}

const SOLO_TO_TEAM_RATIO = 1.5    // solo takes ~1.5x team time
const DEFAULT_SOLO_BUDGET_MIN = 8 * 60
const BARRY_DAY_RATE = 80

export function computeBarryRoi(
  completedJobs: CompletedJobSummary[],
  barryWorked: boolean,
  soloBudgetMinutes = DEFAULT_SOLO_BUDGET_MIN
): BarryRoiResult {
  if (!barryWorked) {
    return {
      barryWorked: false,
      barryCost: 0,
      barryEnabledRevenue: 0,
      netRoi: 0,
      jobsBarryEnabled: [],
      totalSoloMinutesNeeded: 0,
      soloBudgetMinutes,
    }
  }

  const teamJobs = completedJobs.filter(cj =>
    cj.job.operative === 'both' || cj.job.operative === 'barry'
  )

  // Estimate solo duration per job (heuristic)
  const estimated = teamJobs.map(cj => ({
    clientName: cj.job.clientName,
    price: cj.job.price || 0,
    soloMinutes: Math.round(cj.actualDuration * SOLO_TO_TEAM_RATIO),
  }))

  const totalSoloMinutesNeeded = estimated.reduce((s, j) => s + j.soloMinutes, 0)

  // Greedy fit by job order: anything past the budget is Barry-enabled.
  let runningTotal = 0
  const enabled: typeof estimated = []
  for (const j of estimated) {
    if (runningTotal + j.soloMinutes <= soloBudgetMinutes) {
      runningTotal += j.soloMinutes
    } else {
      enabled.push(j)
    }
  }

  const barryEnabledRevenue = enabled.reduce((s, j) => s + j.price, 0)
  const netRoi = barryEnabledRevenue - BARRY_DAY_RATE

  return {
    barryWorked: true,
    barryCost: BARRY_DAY_RATE,
    barryEnabledRevenue,
    netRoi,
    jobsBarryEnabled: enabled,
    totalSoloMinutesNeeded,
    soloBudgetMinutes,
  }
}

export function formatRoiHeadline(r: BarryRoiResult): string {
  if (!r.barryWorked) return ''
  if (r.barryEnabledRevenue === 0) {
    return `Marcos could have done all of today solo - Barry cost £${r.barryCost} for capacity not used.`
  }
  if (r.netRoi >= 0) {
    return `Barry enabled £${r.barryEnabledRevenue} of jobs that wouldn't have fit solo. Net £${r.netRoi} after his £${r.barryCost} day rate.`
  }
  return `Barry's day rate (£${r.barryCost}) exceeded the £${r.barryEnabledRevenue} of revenue he enabled today. Net -£${Math.abs(r.netRoi)}.`
}

export { BARRY_DAY_RATE, SOLO_TO_TEAM_RATIO, DEFAULT_SOLO_BUDGET_MIN }
