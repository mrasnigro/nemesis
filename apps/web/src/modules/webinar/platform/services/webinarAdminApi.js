import { platformRequest } from '../../../../core/api/platformClient.js'

const ADMIN = '/api/admin/webinar'

const unwrap = (payload) => payload.data

/** Webinar plans, subscriptions and payments. Only IMP administrators may call these. */
export const webinarAdminApi = {
  listPlans: () => platformRequest(`${ADMIN}/plans`).then(unwrap),
  createPlan: (body) => platformRequest(`${ADMIN}/plans`, { method: 'POST', body }).then(unwrap),
  updatePlan: (id, body) => platformRequest(`${ADMIN}/plans/${id}`, { method: 'PATCH', body }).then(unwrap),
  deletePlan: (id) => platformRequest(`${ADMIN}/plans/${id}`, { method: 'DELETE' }),

  listSubscriptions: (query) => platformRequest(`${ADMIN}/subscriptions`, { query }),
  subscriptionDetail: (customerId) => platformRequest(`${ADMIN}/subscriptions/${customerId}`).then(unwrap),
  setSubscription: (customerId, body) =>
    platformRequest(`${ADMIN}/subscriptions/${customerId}`, { method: 'PUT', body }).then(unwrap),
  recordPayment: (customerId, body) =>
    platformRequest(`${ADMIN}/subscriptions/${customerId}/payments`, { method: 'POST', body }).then(unwrap),
  voidPayment: (customerId, paymentId) =>
    platformRequest(`${ADMIN}/subscriptions/${customerId}/payments/${paymentId}`, { method: 'DELETE' }).then(unwrap),
}
