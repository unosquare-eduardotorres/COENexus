// Single source of truth for Fill Rate goal rules.
// Imported by both the main-process service (fillRateService) and the
// renderer UI so the classification never drifts.
//
// Formula:  Fill Rate = ClosedWon count / denominator count × 100
//
// Denominator (toggle OFF): positions where position_status LIKE 'Closed%'
//                           with closed_date within the window
// Denominator (toggle ON):  above + Active/Draft positions with created
//                           within the window
// Numerator:                positions where position_status = 'ClosedWon'
//                           with closed_date within the window

/** Default fill rate goal for all COEs. */
export const FILL_RATE_DEFAULT_GOAL = 60

/** COEs that use the elevated goal. */
const ELEVATED_GOAL_COES = new Set(['Quality Engineering', 'Quality Assurance'])

/** Elevated fill rate goal for QE/QA COEs. */
export const FILL_RATE_ELEVATED_GOAL = 70

/** Returns the fill rate goal for a given COE name. */
export function fillRateGoalFor(coe: string): number {
  return ELEVATED_GOAL_COES.has(coe) ? FILL_RATE_ELEVATED_GOAL : FILL_RATE_DEFAULT_GOAL
}
