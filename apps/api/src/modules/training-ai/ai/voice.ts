import { z } from 'zod'
import { config } from '../../../core/config.js'
import { AppError } from '../../../core/errors.js'
import { log } from '../../../core/logger.js'

export type SttOptions = { baseUrl: string; apiKey: string; model: string; timeoutMs: number; fetchImpl?: typeof fetch }
export type TtsOptions = {
  baseUrl: string
  apiKey: string
  model: string
  voiceFemale: string
  voiceMale: string
  speed: number
  timeoutMs: number
  fetchImpl?: typeof fetch
}

export type Gender = 'f' | 'm'

export interface VoiceClient {
  /** Speech to text. `language` is a BCP-47 tag such as pt-BR; Whisper takes its primary subtag. */
  transcribe(audio: Buffer, contentType: string, language: string): Promise<string>
  /** Text to speech. Returns an MP3. */
  synthesize(text: string, gender: Gender): Promise<Buffer>
}

export type VoiceStatus = { stt: boolean; tts: boolean; sttModel: string | null; ttsModel: string | null }

/** OpenAI's transcription endpoint refuses files above 25 MB. */
export const MAX_VOICE_AUDIO_BYTES = 10 * 1024 * 1024
export const MAX_SPEAK_CHARS = 2000

const transcriptionSchema = z.object({ text: z.string() })

function extensionOf(contentType: string) {
  const type = contentType.toLowerCase()
  if (type.includes('mp4') || type.includes('m4a') || type.includes('aac')) return 'm4a'
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3'
  if (type.includes('wav')) return 'wav'
  if (type.includes('ogg')) return 'ogg'
  return 'webm'
}

function providerError(stage: 'stt' | 'tts', status: number, detail: string) {
  log('warn', `training-ai ${stage} provider error`, { status, detail: detail.slice(0, 300) })
  return new AppError(
    502,
    'AI_PROVIDER_ERROR',
    stage === 'stt'
      ? 'O provedor de voz recusou a transcrição. Tente falar novamente.'
      : 'O provedor de voz não conseguiu gerar o áudio da resposta.',
  )
}

async function timedFetch(doFetch: typeof fetch, url: string, init: RequestInit, timeoutMs: number, stage: 'stt' | 'tts') {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await doFetch(url, { ...init, signal: controller.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppError(504, 'AI_PROVIDER_TIMEOUT', 'O provedor de voz demorou demais para responder.')
    }
    log('warn', `training-ai ${stage} request failed`, { message: error instanceof Error ? error.message : String(error) })
    throw new AppError(502, 'AI_PROVIDER_ERROR', 'Não foi possível falar com o provedor de voz.')
  } finally {
    clearTimeout(timer)
  }
}

export function createVoiceClient(options: { stt: SttOptions | null; tts: TtsOptions | null }): VoiceClient {
  return {
    async transcribe(audio, contentType, language) {
      const stt = options.stt
      if (!stt) throw new AppError(503, 'VOICE_NOT_CONFIGURED', 'A transcrição de voz não está configurada no servidor.')
      const doFetch = stt.fetchImpl ?? fetch
      const form = new FormData()
      form.append('file', new Blob([new Uint8Array(audio)], { type: contentType || 'audio/webm' }), `fala.${extensionOf(contentType)}`)
      form.append('model', stt.model)
      form.append('language', language.split('-')[0].toLowerCase() || 'pt')
      form.append('response_format', 'json')
      const response = await timedFetch(
        doFetch,
        `${stt.baseUrl.replace(/\/+$/, '')}/audio/transcriptions`,
        { method: 'POST', headers: { Authorization: `Bearer ${stt.apiKey}` }, body: form },
        stt.timeoutMs,
        'stt',
      )
      if (!response.ok) throw providerError('stt', response.status, await response.text().catch(() => ''))
      const parsed = transcriptionSchema.safeParse(await response.json().catch(() => null))
      if (!parsed.success) throw providerError('stt', 502, 'unexpected transcription payload')
      return parsed.data.text.trim()
    },

    async synthesize(text, gender) {
      const tts = options.tts
      if (!tts) throw new AppError(503, 'VOICE_NOT_CONFIGURED', 'A síntese de voz não está configurada no servidor.')
      const doFetch = tts.fetchImpl ?? fetch
      const response = await timedFetch(
        doFetch,
        `${tts.baseUrl.replace(/\/+$/, '')}/audio/speech`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${tts.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: tts.model,
            input: text,
            voice: gender === 'm' ? tts.voiceMale : tts.voiceFemale,
            response_format: 'mp3',
            speed: tts.speed,
          }),
        },
        tts.timeoutMs,
        'tts',
      )
      if (!response.ok) throw providerError('tts', response.status, await response.text().catch(() => ''))
      const audio = Buffer.from(await response.arrayBuffer())
      if (!audio.length) throw providerError('tts', 502, 'empty audio')
      return audio
    },
  }
}

let override: VoiceClient | null | undefined
let configured: VoiceClient | null | undefined

/** Tests inject a fake here. Pass undefined to go back to the configured one. */
export function overrideVoiceClient(client: VoiceClient | null | undefined) {
  override = client
}

/** Null when neither stage has a key: practice falls back to the browser's own recognition and voice. */
export function voiceClient(): VoiceClient | null {
  if (override !== undefined) return override
  if (configured === undefined) {
    configured = config.voice.stt || config.voice.tts ? createVoiceClient(config.voice) : null
  }
  return configured
}

export function voiceStatus(): VoiceStatus {
  if (override !== undefined) {
    return override
      ? { stt: true, tts: true, sttModel: 'override', ttsModel: 'override' }
      : { stt: false, tts: false, sttModel: null, ttsModel: null }
  }
  return {
    stt: Boolean(config.voice.stt),
    tts: Boolean(config.voice.tts),
    sttModel: config.voice.stt?.model ?? null,
    ttsModel: config.voice.tts?.model ?? null,
  }
}
