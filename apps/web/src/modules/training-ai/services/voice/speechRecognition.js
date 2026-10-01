/**
 * Dictation for voice practice, using the browser's speech recognition (Chrome, Edge, Safari).
 * Where it is missing the trainee types; nothing else changes.
 */

export function getSpeechRecognitionClass(scope = globalThis) {
  return scope?.SpeechRecognition || scope?.webkitSpeechRecognition || null
}

export function isSpeechRecognitionSupported(scope = globalThis) {
  return Boolean(getSpeechRecognitionClass(scope))
}

const ERROR_MESSAGES = {
  'not-allowed': 'O navegador bloqueou o microfone. Libere o acesso para ditar a resposta.',
  'service-not-allowed': 'O navegador bloqueou o reconhecimento de voz.',
  'audio-capture': 'Nenhum microfone foi encontrado.',
  network: 'O reconhecimento de voz precisa de conexão com a internet.',
}

/**
 * @param {{
 *   lang?: string,
 *   onText: (text: string) => void,
 *   onEnd?: () => void,
 *   onError?: (message: string) => void,
 *   Recognition?: new () => any,
 * }} options
 * `onText` receives the whole utterance so far (final + interim), so the caller can replace the draft.
 */
export function createSpeechRecognizer({ lang = 'pt-BR', onText, onEnd, onError, Recognition } = {}) {
  const Impl = Recognition || getSpeechRecognitionClass()
  if (!Impl) return null

  const recognition = new Impl()
  recognition.lang = lang
  recognition.continuous = true
  recognition.interimResults = true

  let committed = ''
  let running = false

  recognition.onresult = (event) => {
    let interim = ''
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index]
      const piece = result[0]?.transcript || ''
      if (result.isFinal) committed += `${committed ? ' ' : ''}${piece.trim()}`
      else interim += piece
    }
    onText?.(`${committed}${interim ? `${committed ? ' ' : ''}${interim.trim()}` : ''}`.trim())
  }
  recognition.onerror = (event) => {
    // "no-speech" and "aborted" are normal ways for a turn to end.
    if (event?.error && event.error !== 'no-speech' && event.error !== 'aborted') {
      onError?.(ERROR_MESSAGES[event.error] || 'Não foi possível usar o microfone.')
    }
  }
  recognition.onend = () => {
    running = false
    onEnd?.()
  }

  return {
    start(initialText = '') {
      if (running) return
      committed = String(initialText || '').trim()
      running = true
      try {
        recognition.start()
      } catch {
        running = false
      }
    },
    stop() {
      if (!running) return
      try {
        recognition.stop()
      } catch {
        // already stopped
      }
    },
    abort() {
      running = false
      try {
        recognition.abort()
      } catch {
        // already stopped
      }
    },
  }
}
