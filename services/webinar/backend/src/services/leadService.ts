import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import { pool } from '../db/index.js'

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

async function select<T>(sql: string, args: unknown[]): Promise<T[]> {
  const [rows] = await pool.query<RowDataPacket[]>(sql, args)
  return rows as unknown as T[]
}

async function write(sql: string, args: unknown[]): Promise<ResultSetHeader> {
  const [result] = await pool.query<ResultSetHeader>(sql, args)
  return result
}

export const leadService = {
  async registerLead(lead: Lead): Promise<number> {
    const result = await write(
      `INSERT INTO leads (client_id, name, email, phone, webinar_id, session_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'registered')`,
      [
        lead.client_id,
        lead.name,
        lead.email,
        lead.phone || null,
        lead.webinar_id || null,
        lead.session_id || null,
      ],
    )
    return result.insertId
  },

  async getLeadsByClient(
    clientId: number,
    filters?: { webinar_id?: number; status?: string },
  ): Promise<Lead[]> {
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

    return select<Lead>(sql, args)
  },

  async getLeadsBySession(sessionId: number): Promise<Lead[]> {
    return select<Lead>('SELECT * FROM leads WHERE session_id = ? ORDER BY registered_at DESC', [
      sessionId,
    ])
  },

  async getLeadsStats(clientId: number): Promise<Record<string, number>> {
    const [row = {}] = await select<Record<string, number | string | null>>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) AS registered,
         SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) AS attended,
         SUM(CASE WHEN attended_at IS NOT NULL THEN 1 ELSE 0 END) AS attended_count
       FROM leads
       WHERE client_id = ?`,
      [clientId],
    )
    const total = Number(row.total || 0)
    const registered = Number(row.registered || 0)
    const attended = Number(row.attended || 0)
    return {
      total,
      registered,
      attended,
      attended_count: Number(row.attended_count || 0),
      no_show: Math.max(0, total - attended - registered),
    }
  },

  async updateLeadStatus(leadId: number, status: string): Promise<boolean> {
    const result = await write('UPDATE leads SET status = ? WHERE id = ?', [status, leadId])
    return result.affectedRows > 0
  },

  async markLeadAsAttended(leadId: number): Promise<boolean> {
    const result = await write(
      "UPDATE leads SET status = 'attended', attended_at = CURRENT_TIMESTAMP WHERE id = ?",
      [leadId],
    )
    return result.affectedRows > 0
  },

  async deleteLead(leadId: number): Promise<boolean> {
    const result = await write('DELETE FROM leads WHERE id = ?', [leadId])
    return result.affectedRows > 0
  },

  async leadExists(clientId: number, email: string, sessionId: number): Promise<boolean> {
    const rows = await select<{ id: number }>(
      'SELECT id FROM leads WHERE client_id = ? AND email = ? AND session_id = ? LIMIT 1',
      [clientId, email, sessionId],
    )
    return rows.length > 0
  },
}
