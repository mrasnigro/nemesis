import { useEffect, useMemo, useState } from 'react'
import OutlineIcon from './OutlineIcon.jsx'
import { AVATAR_PAGE_SIZE, STOCK_AVATARS } from '../data/stockAvatars.js'
import { sampleTextFor, VOICE_OPTIONS } from '../utils/voiceSession.js'
import { speakVoiceSample, stopVoiceSample } from '../services/avatar/browserAvatarProvider.js'

/**
 * Escolher Avatar modal — stock gallery, local upload, and voice pick (+ preview).
 */
export default function AvatarPickerModal({
  open,
  avatarData,
  voiceRef,
  language = 'pt-BR',
  onClose,
  onSave,
}) {
  const [draftAvatar, setDraftAvatar] = useState(avatarData || '')
  const [draftVoice, setDraftVoice] = useState(voiceRef || 'borges')
  const [page, setPage] = useState(1)
  const [panel, setPanel] = useState('hub') // hub | gallery | voice

  useEffect(() => {
    if (!open) return
    setDraftAvatar(avatarData || '')
    setDraftVoice(voiceRef || 'borges')
    setPage(1)
    setPanel('hub')
  }, [open, avatarData, voiceRef])

  const voiceGroups = useMemo(() => {
    const order = [
      { id: 'pt-f', title: 'Português · feminina', lang: 'pt', gender: 'f' },
      { id: 'pt-m', title: 'Português · masculina', lang: 'pt', gender: 'm' },
      { id: 'es-f', title: 'Espanhol · feminina', lang: 'es', gender: 'f' },
      { id: 'es-m', title: 'Espanhol · masculina', lang: 'es', gender: 'm' },
      { id: 'en-f', title: 'Inglês · feminina', lang: 'en', gender: 'f' },
      { id: 'en-m', title: 'Inglês · masculina', lang: 'en', gender: 'm' },
    ]
    const preferred = String(language || 'pt-BR').slice(0, 2).toLowerCase()
    const ranked = [...order].sort((a, b) => Number(b.lang === preferred) - Number(a.lang === preferred))
    return ranked
      .map((group) => ({
        ...group,
        items: VOICE_OPTIONS.filter(
          (item) => item.lang.toLowerCase().startsWith(group.lang) && item.gender === group.gender && !item.id.startsWith('voice_'),
        ),
      }))
      .filter((group) => group.items.length)
  }, [language])

  useEffect(() => {
    if (!open) {
      stopVoiceSample()
      return undefined
    }
    window.speechSynthesis?.getVoices?.()
    const refresh = () => window.speechSynthesis?.getVoices?.()
    window.speechSynthesis?.addEventListener?.('voiceschanged', refresh)
    return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', refresh)
  }, [open])
  const totalPages = Math.max(1, Math.ceil(STOCK_AVATARS.length / AVATAR_PAGE_SIZE))
  const pageAvatars = STOCK_AVATARS.slice((page - 1) * AVATAR_PAGE_SIZE, page * AVATAR_PAGE_SIZE)

  if (!open) return null

  function handleUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const size = 256
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        const scale = Math.max(size / img.width, size / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
        setDraftAvatar(canvas.toDataURL('image/jpeg', 0.72))
        setPanel('gallery')
      }
      img.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  function previewVoice(id) {
    const option = VOICE_OPTIONS.find((item) => item.id === id)
    speakVoiceSample({
      voiceRef: id,
      text: sampleTextFor(option?.lang || language),
    })
  }

  return (
    <div className="training-ai__avatar-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-modal-title">
      <button type="button" className="training-ai__avatar-modal-backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="training-ai__avatar-modal-panel">
        <header className={`training-ai__avatar-modal-head${panel === 'hub' ? ' is-hub' : ''}`}>
          {panel !== 'hub' ? (
            <button type="button" className="training-ai__avatar-modal-back" onClick={() => setPanel('hub')} aria-label="Voltar">
              <OutlineIcon name="chevronLeft" size={16} />
            </button>
          ) : null}
          <h3 id="avatar-modal-title">Escolher Avatar</h3>
          <button type="button" className="training-ai__avatar-modal-x" onClick={onClose} aria-label="Fechar">
            <OutlineIcon name="x" size={16} />
          </button>
        </header>

        {panel === 'hub' ? (
          <div className="training-ai__avatar-hub">
            <p>Escolha uma das opções disponíveis para representar sua persona.</p>
            <div className="training-ai__avatar-hub-grid">
              <button type="button" className="training-ai__avatar-hub-card" onClick={() => setPanel('gallery')}>
                <span className="training-ai__avatar-hub-icon">
                  <OutlineIcon name="user" size={22} />
                </span>
                <strong>AVATARES</strong>
                <span>Escolha um dos avatares disponíveis.</span>
              </button>
              <label className="training-ai__avatar-hub-card">
                <span className="training-ai__avatar-hub-icon">
                  <OutlineIcon name="plus" size={22} />
                </span>
                <strong>ENVIAR IMAGEM</strong>
                <span>Envie uma imagem do seu computador.</span>
                <input type="file" accept="image/*" hidden onChange={handleUpload} />
              </label>
            </div>
            <p>Escolha uma voz para representar sua persona.</p>
            <button type="button" className="training-ai__avatar-hub-card training-ai__avatar-hub-card--wide" onClick={() => setPanel('voice')}>
              <span className="training-ai__avatar-hub-icon">
                <OutlineIcon name="volume" size={22} />
              </span>
              <strong>VOZES</strong>
              <span>Escolha uma das vozes disponíveis.</span>
            </button>
          </div>
        ) : null}

        {panel === 'gallery' ? (
          <div className="training-ai__avatar-gallery">
            <p>Escolha um dos avatares disponíveis para representar sua persona.</p>
            <div className="training-ai__avatar-gallery-row">
              <div className="training-ai__avatar-gallery-preview">
                {draftAvatar ? (
                  <img src={draftAvatar} alt="" />
                ) : (
                  <span className="training-ai__avatar-gallery-empty">
                    <OutlineIcon name="user" size={36} />
                  </span>
                )}
              </div>
              <div className="training-ai__avatar-gallery-grid" aria-label="Avatares disponíveis">
                {pageAvatars.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`training-ai__avatar-gallery-item${draftAvatar === item.src ? ' is-selected' : ''}`}
                    onClick={() => setDraftAvatar(item.src)}
                    aria-label={`Avatar ${item.id}`}
                  >
                    <img src={item.src} alt="" />
                  </button>
                ))}
              </div>
            </div>
            <div className="training-ai__avatar-gallery-pager">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="Anterior">
                ‹
              </button>
              <span>
                {page} DE {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Próxima"
              >
                ›
              </button>
            </div>
            <div className="training-ai__avatar-voice-block">
              <p>Escolha uma voz para representar sua persona.</p>
              <button type="button" className="training-ai__avatar-hub-card training-ai__avatar-hub-card--wide" onClick={() => setPanel('voice')}>
                <span className="training-ai__avatar-hub-icon">
                  <OutlineIcon name="volume" size={22} />
                </span>
                <strong>VOZES</strong>
                <span>Escolha uma das vozes disponíveis.</span>
              </button>
            </div>
          </div>
        ) : null}

        {panel === 'voice' ? (
          <div className="training-ai__avatar-voice-panel">
            <p>Escolha uma das vozes disponíveis para representar sua persona.</p>
            <div className="training-ai__avatar-voice-list">
              {voiceGroups.map((group) => (
                <section key={group.id} className="training-ai__avatar-voice-group">
                  <h4>{group.title}</h4>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          className={`training-ai__avatar-voice-option${draftVoice === item.id ? ' is-selected' : ''}`}
                          onClick={() => setDraftVoice(item.id)}
                        >
                          <span>{item.label}</span>
                          <span
                            className="training-ai__avatar-voice-play"
                            role="button"
                            tabIndex={0}
                            aria-label={`Ouvir ${item.label}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              previewVoice(item.id)
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                event.stopPropagation()
                                previewVoice(item.id)
                              }
                            }}
                          >
                            <OutlineIcon name="play" size={14} />
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        ) : null}

        <footer className="training-ai__avatar-modal-footer">
          <button type="button" className="imp-btn training-ai__btn-cancel" onClick={onClose}>
            <OutlineIcon name="x" size={14} />
            Cancelar
          </button>
          <button
            type="button"
            className="imp-btn imp-btn--primary"
            onClick={() => {
              onSave({ avatarData: draftAvatar, voiceRef: draftVoice })
              onClose()
            }}
          >
            Salvar
          </button>
        </footer>
      </div>
    </div>
  )
}
