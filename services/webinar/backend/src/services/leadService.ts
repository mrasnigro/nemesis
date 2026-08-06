import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

let pool: any = null;

function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return pool;
}

interface Lead {
  id?: number;
  client_id: number;
  name: string;
  email: string;
  phone?: string;
  webinar_id?: number;
  session_id?: number;
  status?: string;
  registered_at?: string;
}

export const leadService = {
  /**
   * Registrar um novo lead para um webinar
   */
  async registerLead(lead: Lead): Promise<number> {
    const connection = await getPool().getConnection();
    try {
      const query = `
        INSERT INTO leads (client_id, name, email, phone, webinar_id, session_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'registered')
      `;
      const [result]: any = await connection.execute(query, [
        lead.client_id,
        lead.name,
        lead.email,
        lead.phone || null,
        lead.webinar_id || null,
        lead.session_id || null,
      ]);
      return result.insertId;
    } finally {
      connection.release();
    }
  },

  /**
   * Obter leads de um cliente
   */
  async getLeadsByClient(
    clientId: number,
    filters?: { webinar_id?: number; status?: string }
  ): Promise<Lead[]> {
    const connection = await getPool().getConnection();
    try {
      let query = 'SELECT * FROM leads WHERE client_id = ?';
      const params: any[] = [clientId];

      if (filters?.webinar_id) {
        query += ' AND webinar_id = ?';
        params.push(filters.webinar_id);
      }

      if (filters?.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      query += ' ORDER BY registered_at DESC';

      const [rows]: any = await connection.execute(query, params);
      return rows;
    } finally {
      connection.release();
    }
  },

  /**
   * Obter leads de uma sessão específica
   */
  async getLeadsBySession(sessionId: number): Promise<Lead[]> {
    const connection = await getPool().getConnection();
    try {
      const query = `
        SELECT * FROM leads 
        WHERE session_id = ? 
        ORDER BY registered_at DESC
      `;
      const [rows]: any = await connection.execute(query, [sessionId]);
      return rows;
    } finally {
      connection.release();
    }
  },

  /**
   * Obter estatísticas de leads
   */
  async getLeadsStats(clientId: number): Promise<any> {
    const connection = await getPool().getConnection();
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'registered' THEN 1 ELSE 0 END) as registered,
          SUM(CASE WHEN status = 'attended' THEN 1 ELSE 0 END) as attended,
          SUM(CASE WHEN attended_at IS NOT NULL THEN 1 ELSE 0 END) as attended_count
        FROM leads 
        WHERE client_id = ?
      `;
      const [rows]: any = await connection.execute(query, [clientId]);
      return rows[0];
    } finally {
      connection.release();
    }
  },

  /**
   * Atualizar status do lead
   */
  async updateLeadStatus(leadId: number, status: string): Promise<boolean> {
    const connection = await getPool().getConnection();
    try {
      const query = `
        UPDATE leads 
        SET status = ? 
        WHERE id = ?
      `;
      const [result]: any = await connection.execute(query, [status, leadId]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  },

  /**
   * Marcar lead como presente
   */
  async markLeadAsAttended(leadId: number): Promise<boolean> {
    const connection = await getPool().getConnection();
    try {
      const query = `
        UPDATE leads 
        SET status = 'attended', attended_at = NOW() 
        WHERE id = ?
      `;
      const [result]: any = await connection.execute(query, [leadId]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  },

  /**
   * Deletar lead
   */
  async deleteLead(leadId: number): Promise<boolean> {
    const connection = await getPool().getConnection();
    try {
      const query = 'DELETE FROM leads WHERE id = ?';
      const [result]: any = await connection.execute(query, [leadId]);
      return result.affectedRows > 0;
    } finally {
      connection.release();
    }
  },

  /**
   * Verificar se lead já existe para uma sessão
   */
  async leadExists(clientId: number, email: string, sessionId: number): Promise<boolean> {
    const connection = await getPool().getConnection();
    try {
      const query = `
        SELECT id FROM leads 
        WHERE client_id = ? AND email = ? AND session_id = ?
        LIMIT 1
      `;
      const [rows]: any = await connection.execute(query, [clientId, email, sessionId]);
      return rows.length > 0;
    } finally {
      connection.release();
    }
  },
};
