import fs from 'fs';
import path from 'path';

/**
 * Tipos de regras de automação
 */
export type AutomationRuleType = 'fixed' | 'recurring' | 'jit';

/**
 * Interface para uma regra de automação
 */
export interface AutomationRule {
  id: string;
  webinar_id: string;
  type: AutomationRuleType;
  config: any; // JSON com configuração específica do tipo
  active: boolean;
  created_at: string;
}

/**
 * Interface para uma sessão de webinar
 */
export interface WebinarSession {
  id: string;
  master_webinar_id: string;
  scheduled_at: string; // ISO 8601 UTC
  status: 'scheduled' | 'live' | 'finished';
  participants_count: number;
  created_at: string;
}

/**
 * Scheduler Manager - Gerencia agendamento automático de replays
 */
class SchedulerManager {
  private automationRules: Map<string, AutomationRule> = new Map();
  private webinarSessions: Map<string, WebinarSession[]> = new Map();
  private cronInterval: NodeJS.Timeout | null = null;
  private dataDir = '/tmp/webinar-scheduler';

  constructor() {
    this.ensureDataDir();
    this.loadFromDisk();
    this.startCron();
  }

  /**
   * Garante que o diretório de dados existe
   */
  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Carrega regras e sessões do disco
   */
  private loadFromDisk(): void {
    try {
      const rulesFile = path.join(this.dataDir, 'automation-rules.json');
      if (fs.existsSync(rulesFile)) {
        const rulesData = JSON.parse(fs.readFileSync(rulesFile, 'utf-8'));
        rulesData.forEach((rule: AutomationRule) => {
          this.automationRules.set(rule.id, rule);
        });
      }

      const sessionsFile = path.join(this.dataDir, 'webinar-sessions.json');
      if (fs.existsSync(sessionsFile)) {
        const sessionsData = JSON.parse(fs.readFileSync(sessionsFile, 'utf-8'));
        sessionsData.forEach((session: WebinarSession) => {
          if (!this.webinarSessions.has(session.master_webinar_id)) {
            this.webinarSessions.set(session.master_webinar_id, []);
          }
          this.webinarSessions.get(session.master_webinar_id)!.push(session);
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados do scheduler:', error);
    }
  }

  /**
   * Salva regras e sessões no disco
   */
  private saveToDisk(): void {
    try {
      const rulesFile = path.join(this.dataDir, 'automation-rules.json');
      fs.writeFileSync(rulesFile, JSON.stringify(Array.from(this.automationRules.values()), null, 2));

      const sessionsFile = path.join(this.dataDir, 'webinar-sessions.json');
      const allSessions = Array.from(this.webinarSessions.values()).flat();
      fs.writeFileSync(sessionsFile, JSON.stringify(allSessions, null, 2));
    } catch (error) {
      console.error('Erro ao salvar dados do scheduler:', error);
    }
  }

  /**
   * Inicia o cron leve para verificar sessões agendadas
   */
  private startCron(): void {
    this.cronInterval = setInterval(() => {
      this.checkAndUpdateSessions();
    }, 60000); // A cada minuto
  }

  /**
   * Verifica e atualiza o status de sessões agendadas
   */
  private checkAndUpdateSessions(): void {
    const now = new Date();

    this.webinarSessions.forEach((sessions, _webinarId) => {
      sessions.forEach((session) => {
        const scheduledTime = new Date(session.scheduled_at);

        // Se a sessão está agendada e o horário chegou, muda para live
        if (session.status === 'scheduled' && now >= scheduledTime) {
          session.status = 'live';
          console.log(`✅ Sessão ${session.id} agora está LIVE`);
        }

        // Se a sessão está live e passou 2 horas, muda para finished
        if (session.status === 'live') {
          const twoHoursAfter = new Date(scheduledTime.getTime() + 2 * 60 * 60 * 1000);
          if (now >= twoHoursAfter) {
            session.status = 'finished';
            console.log(`✅ Sessão ${session.id} agora está FINISHED`);
          }
        }
      });
    });

    this.saveToDisk();
  }

  /**
   * Cria uma nova regra de automação
   */
  createAutomationRule(webinarId: string, type: AutomationRuleType, config: any): AutomationRule {
    const rule: AutomationRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      webinar_id: webinarId,
      type,
      config,
      active: true,
      created_at: new Date().toISOString(),
    };

    this.automationRules.set(rule.id, rule);
    this.saveToDisk();
    return rule;
  }

  /**
   * Obtém uma regra de automação
   */
  getAutomationRule(ruleId: string): AutomationRule | undefined {
    return this.automationRules.get(ruleId);
  }

  /**
   * Lista todas as regras de automação para um webinar
   */
  listAutomationRules(webinarId: string): AutomationRule[] {
    return Array.from(this.automationRules.values()).filter((rule) => rule.webinar_id === webinarId);
  }

  /**
   * Atualiza uma regra de automação
   */
  updateAutomationRule(ruleId: string, updates: Partial<AutomationRule>): AutomationRule | undefined {
    const rule = this.automationRules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.automationRules.set(ruleId, rule);
      this.saveToDisk();
    }
    return rule;
  }

  /**
   * Deleta uma regra de automação
   */
  deleteAutomationRule(ruleId: string): boolean {
    const deleted = this.automationRules.delete(ruleId);
    if (deleted) {
      this.saveToDisk();
    }
    return deleted;
  }

  /**
   * Gera próximas sessões baseadas em uma regra (JIT - Just-in-Time)
   */
  generateNextSessions(ruleId: string, count: number = 3): WebinarSession[] {
    const rule = this.automationRules.get(ruleId);
    if (!rule || !rule.active) {
      return [];
    }

    const sessions: WebinarSession[] = [];
    const now = new Date();

    if (rule.type === 'fixed') {
      // Tipo fixo: datas específicas no formato [{ date: '2026-07-15', time: '19:00' }, ...]
      const fixedDates = rule.config.dates || [];
      fixedDates.slice(0, count).forEach((dateConfig: any) => {
        const [year, month, day] = dateConfig.date.split('-');
        const [hours, minutes] = dateConfig.time.split(':');
        const sessionTime = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes)));

        if (sessionTime > now) {
          sessions.push(this.createSession(rule.webinar_id, sessionTime));
        }
      });
    } else if (rule.type === 'recurring') {
      // Tipo recorrente: dias da semana e horários no formato { days: [1, 3, 5], times: ['10:00', '20:00'] }
      const days = rule.config.days || []; // 0=domingo, 1=segunda, ..., 6=sábado
      const times = rule.config.times || [];

      let sessionCount = 0;
      let checkDate = new Date(now);

      while (sessionCount < count) {
        const dayOfWeek = checkDate.getUTCDay();

        if (days.includes(dayOfWeek)) {
          times.forEach((time: string) => {
            if (sessionCount < count) {
              const [hours, minutes] = time.split(':');
              const sessionTime = new Date(checkDate);
              sessionTime.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0);

              if (sessionTime > now) {
                sessions.push(this.createSession(rule.webinar_id, sessionTime));
                sessionCount++;
              }
            }
          });
        }

        checkDate.setUTCDate(checkDate.getUTCDate() + 1);
      }
    } else if (rule.type === 'jit') {
      // Tipo just-in-time: próxima sessão em X minutos no formato { interval_minutes: 30 }
      const intervalMinutes = rule.config.interval_minutes || 30;

      for (let i = 0; i < count; i++) {
        const sessionTime = new Date(now.getTime() + intervalMinutes * 60 * 1000 * (i + 1));
        sessions.push(this.createSession(rule.webinar_id, sessionTime));
      }
    }

    return sessions;
  }

  /**
   * Cria uma nova sessão de webinar
   */
  private createSession(masterWebinarId: string, scheduledTime: Date): WebinarSession {
    const session: WebinarSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      master_webinar_id: masterWebinarId,
      scheduled_at: scheduledTime.toISOString(),
      status: 'scheduled',
      participants_count: 0,
      created_at: new Date().toISOString(),
    };

    if (!this.webinarSessions.has(masterWebinarId)) {
      this.webinarSessions.set(masterWebinarId, []);
    }

    this.webinarSessions.get(masterWebinarId)!.push(session);
    this.saveToDisk();

    return session;
  }

  /**
   * Obtém uma sessão específica
   */
  getSession(sessionId: string): WebinarSession | undefined {
    for (const sessions of this.webinarSessions.values()) {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) return session;
    }
    return undefined;
  }

  /**
   * Lista todas as sessões de um webinar mestre
   */
  listSessions(masterWebinarId: string): WebinarSession[] {
    return this.webinarSessions.get(masterWebinarId) || [];
  }

  /**
   * Lista próximas sessões (não finalizadas) de um webinar
   */
  listUpcomingSessions(masterWebinarId: string): WebinarSession[] {
    const sessions = this.webinarSessions.get(masterWebinarId) || [];
    const now = new Date();
    return sessions
      .filter((s) => s.status !== 'finished' && new Date(s.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }

  /**
   * Incrementa o contador de participantes de uma sessão
   */
  incrementSessionParticipants(sessionId: string): WebinarSession | undefined {
    for (const sessions of this.webinarSessions.values()) {
      const session = sessions.find((s) => s.id === sessionId);
      if (session) {
        session.participants_count++;
        this.saveToDisk();
        return session;
      }
    }
    return undefined;
  }

  /**
   * Para o cron ao desligar
   */
  shutdown(): void {
    if (this.cronInterval) {
      clearInterval(this.cronInterval);
    }
  }
}

// Exporta uma instância singleton
export const schedulerManager = new SchedulerManager();
