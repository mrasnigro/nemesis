import assert from 'node:assert/strict'
import { test } from 'node:test'
import { effectiveModuleIds, isModuleId } from './index.js'

test('effective modules are the intersection, in catalog order', () => {
  assert.deepEqual(effectiveModuleIds(['bdr', 'training-ai', 'vsl'], ['vsl', 'bdr', 'radar']), ['bdr', 'vsl'])
})

test('a user grant outside the customer contract gives no access', () => {
  assert.deepEqual(effectiveModuleIds([], ['bdr']), [])
})

test('isModuleId rejects unknown ids', () => {
  assert.equal(isModuleId('bdr'), true)
  assert.equal(isModuleId('crm'), false)
})
