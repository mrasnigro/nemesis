/** Blank forms for a new attendance. Shapes mirror the live CRM diagnosis and script-progress documents. */

export function createEmptyDiagnosis() {
  return {
    companySize: '',
    monthlyRevenue: '',
    employees: '',
    partnerPresence: '',
    priority: '',
    painPoints: '',
    needs: '',
    objections: '',
    extraObservations: '',
    conversationSummary: '',
    pains: {
      lucro: false,
      vendas: false,
      gestao: false,
      lideranca: false,
      todos: false,
      nenhum: false,
    },
  }
}

export function createEmptyScriptProgress() {
  return {
    section: 'abertura',
    answered: {},
    painsTouched: false,
    completed: false,
    openObjectionCategoryId: null,
  }
}

/** Metrics before the first API response; the numbers are never invented client-side. */
export const EMPTY_METRICS = {
  totalCalls: 0,
  callsToday: 0,
  averageDurationLabel: '0m 0s',
  meetingsScheduled: 0,
  callsGoal: 0,
  meetingsGoal: 0,
  weekDeltaPercent: 0,
}
