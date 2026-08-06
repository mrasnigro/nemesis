import fs from 'fs';
import path from 'path';

/**
 * Gerenciador de Replay Simulado
 * Responsável por:
 * 1. Gravar o vídeo completo quando a transmissão termina
 * 2. Persistir interações (chat, enquetes, CTAs) com timestamps
 * 3. Servir vídeos gravados para replay
 * 4. Sincronizar interações durante o replay
 */

export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  role: 'admin' | 'client';
  timeOffset: number; // Tempo em relação ao início da transmissão (em segundos)
}

export interface ReplayMetadata {
  webinarId: string;
  title: string;
  startTime: string;
  endTime?: string;
  duration: number; // em segundos
  videoFile: string; // caminho do arquivo de vídeo
  chatMessages: ChatMessage[];
  createdAt: string;
  status: 'recording' | 'completed' | 'scheduled';
  scheduledReplays: Array<{
    date: string;
    time: string;
  }>;
}

export class ReplayManager {
  private recordingsDir = '/tmp/webinar-recordings';
  private metadataDir = '/tmp/webinar-metadata';
  private replayMetadata: Map<string, ReplayMetadata> = new Map();

  constructor() {
    // Criar diretórios necessários
    [this.recordingsDir, this.metadataDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[ReplayManager] Diretório criado: ${dir}`);
      }
    });

    // Carregar metadados existentes
    this.loadAllMetadata();
  }

  /**
   * Inicia uma gravação de webinar
   */
  startRecording(webinarId: string, title: string): void {
    const metadata: ReplayMetadata = {
      webinarId,
      title,
      startTime: new Date().toISOString(),
      duration: 0,
      videoFile: path.join(this.recordingsDir, `${webinarId}.webm`),
      chatMessages: [],
      createdAt: new Date().toISOString(),
      status: 'recording',
      scheduledReplays: []
    };

    this.replayMetadata.set(webinarId, metadata);
    this.saveMetadata(webinarId);
    console.log(`[ReplayManager] Gravação iniciada para webinar ${webinarId}`);
  }

  /**
   * Finaliza a gravação e salva o arquivo de vídeo
   */
  finishRecording(webinarId: string, videoChunks: Uint8Array[]): boolean {
    const metadata = this.replayMetadata.get(webinarId);
    if (!metadata) {
      console.error(`[ReplayManager] Metadados não encontrados para webinar ${webinarId}`);
      return false;
    }

    try {
      // Concatenar todos os chunks em um único arquivo
      const videoBuffer = Buffer.concat(videoChunks.map(chunk => Buffer.from(chunk)));
      
      // Salvar arquivo de vídeo
      fs.writeFileSync(metadata.videoFile, videoBuffer);
      console.log(`[ReplayManager] Vídeo gravado: ${metadata.videoFile} (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

      // Atualizar metadados
      metadata.endTime = new Date().toISOString();
      metadata.status = 'completed';
      
      // Calcular duração (aproximadamente 1 segundo por chunk)
      metadata.duration = videoChunks.length;

      this.saveMetadata(webinarId);
      console.log(`[ReplayManager] Gravação finalizada para webinar ${webinarId}`);
      return true;
    } catch (err) {
      console.error(`[ReplayManager] Erro ao salvar vídeo: ${err}`);
      return false;
    }
  }

  /**
   * Adiciona uma mensagem de chat ao replay
   */
  addChatMessage(webinarId: string, message: ChatMessage): void {
    const metadata = this.replayMetadata.get(webinarId);
    if (!metadata) {
      console.warn(`[ReplayManager] Metadados não encontrados para webinar ${webinarId}`);
      return;
    }

    metadata.chatMessages.push(message);
    this.saveMetadata(webinarId);
  }

  /**
   * Obtém o arquivo de vídeo gravado
   */
  getRecordedVideo(webinarId: string): Buffer | null {
    const metadata = this.replayMetadata.get(webinarId);
    if (!metadata || metadata.status !== 'completed') {
      console.warn(`[ReplayManager] Vídeo não encontrado ou não concluído para webinar ${webinarId}`);
      return null;
    }

    try {
      return fs.readFileSync(metadata.videoFile);
    } catch (err) {
      console.error(`[ReplayManager] Erro ao ler vídeo: ${err}`);
      return null;
    }
  }

  /**
   * Obtém o tamanho do arquivo de vídeo gravado
   */
  getRecordedVideoSize(webinarId: string): number {
    const metadata = this.replayMetadata.get(webinarId);
    if (!metadata || metadata.status !== 'completed') {
      return 0;
    }

    try {
      const stats = fs.statSync(metadata.videoFile);
      return stats.size;
    } catch (err) {
      console.error(`[ReplayManager] Erro ao obter tamanho do vídeo: ${err}`);
      return 0;
    }
  }

  /**
   * Obtém os metadados de um webinar (incluindo chat)
   */
  getMetadata(webinarId: string): ReplayMetadata | null {
    return this.replayMetadata.get(webinarId) || null;
  }

  /**
   * Obtém as mensagens de chat para um webinar
   */
  getChatMessages(webinarId: string): ChatMessage[] {
    const metadata = this.replayMetadata.get(webinarId);
    return metadata?.chatMessages || [];
  }

  /**
   * Agenda um replay para uma data/hora específica
   */
  scheduleReplay(webinarId: string, date: string, time: string): boolean {
    const metadata = this.replayMetadata.get(webinarId);
    if (!metadata) {
      console.error(`[ReplayManager] Metadados não encontrados para webinar ${webinarId}`);
      return false;
    }

    metadata.scheduledReplays.push({ date, time });
    this.saveMetadata(webinarId);
    console.log(`[ReplayManager] Replay agendado para ${date} às ${time}`);
    return true;
  }

  /**
   * Obtém todos os replays agendados
   */
  getScheduledReplays(webinarId: string): Array<{ date: string; time: string }> {
    const metadata = this.replayMetadata.get(webinarId);
    return metadata?.scheduledReplays || [];
  }

  /**
   * Lista todos os webinars com replay disponível
   */
  listAvailableReplays(): ReplayMetadata[] {
    const replays: ReplayMetadata[] = [];
    this.replayMetadata.forEach(metadata => {
      if (metadata.status === 'completed') {
        replays.push(metadata);
      }
    });
    return replays;
  }

  /**
   * Salva os metadados de um webinar em arquivo JSON
   */
  private saveMetadata(webinarId: string): void {
    const metadata = this.replayMetadata.get(webinarId);
    if (!metadata) return;

    try {
      const metadataFile = path.join(this.metadataDir, `${webinarId}-metadata.json`);
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));
      console.log(`[ReplayManager] Metadados salvos: ${metadataFile}`);
    } catch (err) {
      console.error(`[ReplayManager] Erro ao salvar metadados: ${err}`);
    }
  }

  /**
   * Carrega todos os metadados existentes
   */
  private loadAllMetadata(): void {
    try {
      if (!fs.existsSync(this.metadataDir)) return;

      const files = fs.readdirSync(this.metadataDir);
      files.forEach(file => {
        if (file.endsWith('-metadata.json')) {
          try {
            const filePath = path.join(this.metadataDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const metadata: ReplayMetadata = JSON.parse(content);
            this.replayMetadata.set(metadata.webinarId, metadata);
            console.log(`[ReplayManager] Metadados carregados: ${metadata.webinarId}`);
          } catch (err) {
            console.error(`[ReplayManager] Erro ao carregar ${file}: ${err}`);
          }
        }
      });
    } catch (err) {
      console.error(`[ReplayManager] Erro ao carregar metadados: ${err}`);
    }
  }

  /**
   * Limpa os arquivos de gravação de um webinar
   */
  clearRecording(webinarId: string): boolean {
    try {
      const metadata = this.replayMetadata.get(webinarId);
      if (metadata && fs.existsSync(metadata.videoFile)) {
        fs.unlinkSync(metadata.videoFile);
        console.log(`[ReplayManager] Arquivo de vídeo deletado: ${metadata.videoFile}`);
      }

      const metadataFile = path.join(this.metadataDir, `${webinarId}-metadata.json`);
      if (fs.existsSync(metadataFile)) {
        fs.unlinkSync(metadataFile);
        console.log(`[ReplayManager] Arquivo de metadados deletado: ${metadataFile}`);
      }

      this.replayMetadata.delete(webinarId);
      return true;
    } catch (err) {
      console.error(`[ReplayManager] Erro ao limpar gravação: ${err}`);
      return false;
    }
  }
}

// Exportar instância singleton
export const replayManager = new ReplayManager();
