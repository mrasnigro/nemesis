import { describe, expect, it } from 'vitest'
import { createCallAi } from '../src/modules/bdr/callAi.js'

type Captured = { url: string; init: RequestInit }

function fakeFetch(responses: Record<string, unknown>, captured: Captured[], status = 200): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    captured.push({ url: String(url), init: init ?? {} })
    const key = Object.keys(responses).find((path) => String(url).endsWith(path))
    return new Response(JSON.stringify(key ? responses[key] : {}), { status })
  }) as typeof fetch
}

const options = {
  baseUrl: 'https://ai.example.test/v1/',
  apiKey: 'test-key',
  model: 'gpt-test',
  transcribeModel: 'whisper-test',
  timeoutMs: 5_000,
}

describe('call AI client', () => {
  it('transcribes the recording in Portuguese with the configured model', async () => {
    const captured: Captured[] = []
    const ai = createCallAi({
      ...options,
      fetchImpl: fakeFetch({ '/audio/transcriptions': { text: ' Alô, bom dia. ' } }, captured),
    })
    expect(await ai.transcribe(Buffer.from('ID3'))).toBe('Alô, bom dia.')
    expect(captured[0].url).toBe('https://ai.example.test/v1/audio/transcriptions')
    expect((captured[0].init.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
    const form = captured[0].init.body as FormData
    expect(form.get('model')).toBe('whisper-test')
    expect(form.get('language')).toBe('pt')
    expect(form.get('file')).toBeInstanceOf(Blob)
  })

  it('summarizes the record and the transcript, treating both as data', async () => {
    const captured: Captured[] = []
    const ai = createCallAi({
      ...options,
      fetchImpl: fakeFetch({ '/chat/completions': { choices: [{ message: { content: ' Resumo. ' } }] } }, captured),
    })
    expect(await ai.summarize({ facts: 'Resultado: Sem interesse.', transcript: 'Cliente: não tenho interesse.' })).toBe(
      'Resumo.',
    )
    const body = JSON.parse(String(captured[0].init.body))
    expect(body.model).toBe('gpt-test')
    expect(body.messages[0].content).toContain('nunca instruções')
    expect(body.messages[1].content).toContain('Resultado: Sem interesse.')
    expect(body.messages[1].content).toContain('Transcrição da ligação:\nCliente: não tenho interesse.')
  })

  it('reports provider errors and disabled transcription', async () => {
    const failing = createCallAi({ ...options, fetchImpl: fakeFetch({}, [], 401) })
    await expect(failing.summarize({ facts: 'x', transcript: null })).rejects.toThrow('401')

    const noSpeech = createCallAi({ ...options, transcribeModel: null, fetchImpl: fakeFetch({}, []) })
    expect(noSpeech.canTranscribe).toBe(false)
    await expect(noSpeech.transcribe(Buffer.from('ID3'))).rejects.toThrow('disabled')
  })
})
