import { getLibsqlClient } from '../db/index.js'

interface Lead {
  id?: number
  client_id: number
  name: string
  email: string
  phone?: string
  webinar_id?: number
  session_id?: number
  status?: string
  registered_at?: string
}

export const leadService = {
  async registerLead(lead: Lead): Promise<number> {
    const client = getLibsqlClient()
    const result = await client.execute({
      sql: `
        INSERT INTO leads (client_id, name, email, phone, webinar_id, session_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'registered')
      `,
      args: [
        lead.client_id,
        lead.name,
        lead.email,
        lead.phone || null,
        lead.webinar_id || null,
        lead.session_id || null,
      ],
    })
    return Number(result.lastInsertRowid || 0)
  },

  async getLeadsByClient(
    clientId: number,
    filters?: { webinar_id?: number; status?: string },
  ): Promise<Lead[]> {
    const client = getLibsqlClient()
    let sql = 'SELECT * FROM leads WHERE client_id = ?'
    const args: (string | number)[] = [clientId]

    if (filters?.webinar_id) {
      sql += ' AND webinar_id = ?'
      args.push(filters.webinar_id)
    }
    if (filters?.status) {
      sql += ' AND status = ?'
      args.push(filters.status)
    }
    sql += ' ORDER BY registered_at DESC'

    const result = await client.execute({ sql, args })
    return result.rows.map((row) => row as unknown as Lead)
  },

  async getLeadsBySession(sessionId: number): Promise<Lead[]> {
    const client = getLibsqlClient()
    const result = await client.execute({
      sql: `
        SELECT * FROM leads
        WHERE session_id = ?
        ORDER BY registered_at DESC
      `,
      args: [sessionId],
    })
    return result.rows.map((row) => row as unknown as Lead)
  },

  async getLeadsStats(clientId: number): Promise<Record<string, number>> {
    const client = getLibsqlClient()
    const result = await client.execute({
      sql: `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) as registered,
          SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
          SUM(CASE WHEN attended_at IS NOT NULL THEN 1 ELSE 0 END) as attended_count
        FROM leads
        WHERE client_id = ?
      `,
      args: [clientId],
    })
    const row = (result.rows[0] || {}) as Record<string, number>
    return {
      total: Number(row.total || 0),
      registered: Number(row.registered || 0),
      attended: Number(row.attended || 0),
      attended_count: Number(row.attended_count || 0),
      no_show: Math.max(0, Number(row.total || 0) - Number(row.attended || 0) - Number(row.registered || 0)),
    }
  },

  async updateLeadStatus(leadId: number, status: string): Promise<boolean> {
    const client = getLibsqlClient()
    const result = await client.execute({
      sql: `UPDATE leads SET status = ? WHERE id = ?`,
      args: [status, leadId],
    })
    return Number(result.rowsAffected || 0) > 0
  },

  async markLeadAsAttended(leadId: number): Promise<boolean> {
    const client = getLibsqlClient()
    const result = await client.execute({
      sql: `
        UPDATE leads
        SET status = 'attended', attended_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [leadId],
    })
    return Number(result.rowsAffected || 0) > 0
  },

  async deleteLead(leadId: number): Promise<boolean> {
    const client = getLibsqlClient()
    const result = await client.execute({
      sql: 'DELETE FROM leads WHERE id = ?',
      args: [leadId],
    })
    return Number(result.rowsAffected || 0) > 0
  },

  async leadExists(clientId: number, email: string, sessionId: number): Promise<boolean> {
    const client = getLibsqlClient()
    const result = await client.execute({
      sql: `
        SELECT id FROM leads
        WHERE client_id = ? AND email = ? AND session_id = ?
        LIMIT 1
      `,
      args: [clientId, email, sessionId],
    })
    return result.rows.length > 0
  },
}
