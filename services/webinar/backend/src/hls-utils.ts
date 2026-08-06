import fs from 'fs';
import { EventEmitter } from 'events';

export interface HLSSegment {
  index: number;
  data: Buffer;
  duration: number;
}

export class HLSManager extends EventEmitter {
  private segments: Map<string, HLSSegment[]> = new Map();
  private segmentDuration = 2; // segundos
  private tempDir = '/tmp/hls-segments';

  constructor() {
    super();
    // Criar diretório temporário
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Adiciona um chunk e emite um evento para os ouvintes
   */
  addChunk(webinarId: string, chunkData: Buffer) {
    if (!this.segments.has(webinarId)) {
      this.segments.set(webinarId, []);
    }

    const segments = this.segments.get(webinarId)!;
    const segmentIndex = segments.length;

    const segment: HLSSegment = {
      index: segmentIndex,
      data: chunkData,
      duration: this.segmentDuration
    };

    segments.push(segment);
    
    // Emitir evento para conexões pendentes
    this.emit(`chunk:${webinarId}`, segment);
    
    console.log(`[HLS] Segmento ${segmentIndex} adicionado para webinar ${webinarId} (${chunkData.length} bytes)`);
  }

  /**
   * Retorna os segmentos iniciais para o player começar (Cabeçalho + Últimos 3)
   */
  getInitialData(webinarId: string, windowSize: number = 3): Buffer {
    const segments = this.segments.get(webinarId) || [];
    if (segments.length === 0) return Buffer.alloc(0);
    
    const firstSegment = segments[0];
    const startIdx = Math.max(1, segments.length - windowSize);
    const recentSegments = segments.slice(startIdx);
    
    return Buffer.concat([firstSegment.data, ...recentSegments.map(s => s.data)]);
  }

  clearSegments(webinarId: string) {
    this.segments.delete(webinarId);
    this.emit(`reset:${webinarId}`);
    console.log(`[HLS] Segmentos limpos para webinar ${webinarId}`);
  }

  getSegmentCount(webinarId: string): number {
    return this.segments.get(webinarId)?.length || 0;
  }
}

export const hlsManager = new HLSManager();
