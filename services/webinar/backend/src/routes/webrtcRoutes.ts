import { Router, Request, Response } from 'express';
import { hlsManager, HLSSegment } from '../hls-utils.js';

const router = Router();

/**
 * 1. Receber chunk do apresentador
 */
router.post('/:webinarId/stream/chunk', async (req: Request, res: Response) => {
  try {
    const { webinarId } = req.params;
    const chunkData = req.body as Buffer;

    if (!chunkData || chunkData.length === 0) {
      return res.status(400).json({ error: 'Dados do chunk vazios' });
    }

    hlsManager.addChunk(webinarId, chunkData);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[WebRTC] Erro ao receber chunk:', error);
    res.status(500).json({ error: 'Erro interno ao processar chunk' });
  }
});

/**
 * 2. Servir o vídeo ao vivo como INFINITE STREAM (M102.47)
 */
router.get('/:webinarId/stream/live', (req: Request, res: Response) => {
  const { webinarId } = req.params;

  console.log(`[Stream] Nova conexão de lead para webinar ${webinarId}`);

  // Configurar headers para streaming infinito
  res.setHeader('Content-Type', 'video/webm');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Transfer-Encoding', 'chunked');

  // 1. Enviar dados iniciais (Cabeçalho + Últimos chunks)
  // M102.53: Enviando 10 chunks de 1s (aprox 10s) para estabilidade total no início
  const initialData = hlsManager.getInitialData(webinarId, 10);
  if (initialData.length > 0) {
    res.write(initialData);
  }

  // 2. Ouvinte para novos chunks
  const onNewChunk = (segment: HLSSegment) => {
    try {
      res.write(segment.data);
    } catch (err) {
      console.error(`[Stream] Erro ao enviar chunk para lead no webinar ${webinarId}`);
      cleanup();
    }
  };

  // 3. Ouvinte para reset
  const onReset = () => {
    console.log(`[Stream] Webinar ${webinarId} resetado, fechando conexão do lead.`);
    res.end();
    cleanup();
  };

  const cleanup = () => {
    hlsManager.off(`chunk:${webinarId}`, onNewChunk);
    hlsManager.off(`reset:${webinarId}`, onReset);
  };

  hlsManager.on(`chunk:${webinarId}`, onNewChunk);
  hlsManager.on(`reset:${webinarId}`, onReset);

  // Se o cliente desconectar, limpar ouvintes
  req.on('close', () => {
    console.log(`[Stream] Lead desconectou do webinar ${webinarId}`);
    cleanup();
  });
});

/**
 * 3. Resetar chunks
 */
router.post('/:webinarId/stream/reset', (req: Request, res: Response) => {
  const { webinarId } = req.params;
  hlsManager.clearSegments(webinarId);
  res.status(200).json({ success: true });
});

export default router;
