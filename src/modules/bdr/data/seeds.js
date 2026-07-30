/**
 * Seed datasets mirroring live CRM IMP constants (u0, YN, rw, gp).
 * Campaign selection does NOT filter dialPool (live rule).
 */

import { objectionCategorySummaries } from './objections.js'

export const SEED_CAMPAIGNS = [
  {
    id: '1',
    name: 'Campanha Padrão',
    status: 'active',
    leads: 245,
    completed: 89,
    progress: 36,
  },
  {
    id: '2',
    name: 'Prospecção Fria - Região Sul',
    status: 'active',
    leads: 512,
    completed: 234,
    progress: 46,
  },
  {
    id: '3',
    name: 'Follow-up Clientes',
    status: 'paused',
    leads: 156,
    completed: 156,
    progress: 100,
  },
]

/** Live dial pool YN — random with replacement */
export const SEED_DIAL_POOL = [
  {
    id: '1',
    phone: '(11) 4308-5075',
    name: 'Renata Fernandes Almada Francesa Morel',
    company: 'MAXBARRAMENTOS INDUSTRIA E COMERCIO LTDA',
    email: 'contato@maxbarramentos.com.br',
    address: 'Rua Industrial 100',
    city: 'Diadema',
    state: 'SP',
    cep: '09900-000',
    cnpj: '11.222.333/0001-44',
    protocol: '20260709232300232871',
    partnerName: 'Renata Fernandes Almada Francesa Morel',
    partnerCpf: '305.917.078-94',
    identifier: 'MAXBARRAMENTOS INDUSTRIA E COMERCIO LTDA',
    socialReason: 'MAXBARRAMENTOS INDUSTRIA E COMERCIO LTDA',
  },
  {
    id: '2',
    phone: '(11) 99975-9506',
    name: 'João Silva Santos',
    company: 'MAURICAR AUTOMOVEIS LTDA',
    email: 'contato@mauricar.com.br',
    address: 'Avenida Paulista 1000',
    city: 'São Paulo',
    state: 'SP',
    cep: '01310-100',
    cnpj: '12.345.678/0001-90',
    protocol: '20260709232300232872',
    partnerName: 'João Silva Santos',
    partnerCpf: '305.917.078-96',
    identifier: 'MAURICAR AUTOMOVEIS LTDA',
    socialReason: 'MAURICAR AUTOMOVEIS LTDA',
  },
  {
    id: '3',
    phone: '(21) 3333-4444',
    name: 'Maria Oliveira Costa',
    company: 'TECH SOLUTIONS BRASIL LTDA',
    email: 'contato@techsolutions.com.br',
    address: 'Rua das Flores 500',
    city: 'Rio de Janeiro',
    state: 'RJ',
    cep: '20000-000',
    cnpj: '98.765.432/0001-10',
    protocol: '20260709232300232873',
    partnerName: 'Maria Oliveira Costa',
    partnerCpf: '305.917.078-96',
    identifier: 'TECH SOLUTIONS BRASIL LTDA',
    socialReason: 'TECH SOLUTIONS BRASIL LTDA',
  },
]

export const SEED_METRICS = {
  totalCalls: 156,
  callsToday: 23,
  averageDurationLabel: '3m 45s',
  meetingsScheduled: 4,
  callsGoal: 30,
  meetingsGoal: 10,
  weekDeltaPercent: 12,
}

export const SEED_HISTORY = [
  {
    id: 'h1',
    phone: '(11) 98765-4321',
    company: 'TECH SOLUTIONS LTDA',
    leadName: 'João Silva',
    qualification: 'Interessado',
    qualificationId: 'interested',
    duration: 225,
    method: 'Telefone Fixo',
    timestamp: '2024-07-09 14:30',
    notes: 'Cliente interessado, agendou para próxima semana',
    diagnosis: {},
    campaignId: '1',
    mode: 'automatic',
    callStatus: 'Atendida',
    clientStatus: 'Interessado',
    recordingUrl: 'https://example.com/recordings/call-001.mp3',
    protocol: '20260709232300232871',
  },
  {
    id: 'h2',
    phone: '(21) 99876-5432',
    company: 'CONSULTORIA ABC LTDA',
    leadName: 'Maria Santos',
    qualification: 'Sem Interesse',
    qualificationId: 'no_interest',
    duration: 140,
    method: 'Telefone Fixo',
    timestamp: '2024-07-09 14:15',
    notes: 'Cliente não tem necessidade no momento',
    diagnosis: {},
    campaignId: '1',
    mode: 'automatic',
    callStatus: 'Não atendida',
    clientStatus: 'Sem Interesse',
    recordingUrl: 'https://example.com/recordings/call-002.mp3',
    protocol: '20260709232300232872',
  },
  {
    id: 'h3',
    phone: '(31) 97654-3210',
    company: 'INDUSTRIA XYZ',
    leadName: 'Carlos Oliveira',
    qualification: 'Agendado',
    qualificationId: 'callback',
    duration: 310,
    method: 'WhatsApp',
    timestamp: '2024-07-09 13:45',
    notes: 'Reunião agendada',
    diagnosis: {},
    campaignId: '2',
    mode: 'manual',
    callStatus: 'Atendida',
    clientStatus: 'Agendado',
    recordingUrl: 'https://example.com/recordings/call-003.mp3',
    protocol: '20260709232300232873',
  },
]

export const SEED_MEETINGS = [
  {
    id: 'm1',
    leadName: 'João Silva Santos',
    company: 'MAURICAR AUTOMOVEIS LTDA',
    phone: '(11) 99975-9506',
    date: '2026-07-30',
    time: '10:00',
    protocol: '20260709232300232872',
    createdAt: '2026-07-09T23:23:00.000Z',
  },
  {
    id: 'm2',
    leadName: 'Maria Santos',
    company: 'TECH SOLUTIONS LTDA',
    phone: '(11) 98765-4321',
    date: '2026-07-31',
    time: '14:30',
    protocol: '20260709232300232873',
    createdAt: '2026-07-09T23:23:00.000Z',
  },
]

export const SEED_OBJECTION_CATEGORIES = objectionCategorySummaries()

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
