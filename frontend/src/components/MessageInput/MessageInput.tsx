import { useRef, useState, type KeyboardEvent } from 'react'
import { uploadFile } from '@/api/files'
import QuickPhrasesList from '@/components/QuickPhrases/QuickPhrasesList'
import styles from './MessageInput.module.css'

interface Props {
  chatId: number
  onSend: (content: string, fileId?: number) => Promise<void>
}

export default function MessageInput({ chatId, onSend }: Props) {
  const [text, setText] = useState('')
  const [fileId, setFileId] = useState<number | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showPhrases, setShowPhrases] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const uploaded = await uploadFile(file)
      setFileId(uploaded.id)
      setFileName(file.name)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSend() {
    if ((!text.trim() && !fileId) || sending) return
    setSending(true)
    try {
      await onSend(text.trim(), fileId ?? undefined)
      setText('')
      setFileId(null)
      setFileName(null)
      setShowPhrases(false)
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handlePhraseSelect(body: string) {
    setText(body)
    setShowPhrases(false)
    textareaRef.current?.focus()
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const canSend = (text.trim().length > 0 || fileId !== null) && !sending && !uploading

  return (
    <div className={styles.container}>
      {fileId && fileName && (
        <div className={styles.filePreview}>
          <span>📎</span>
          <span className={styles.filePreviewName}>{fileName}</span>
          <button className={styles.removeFile} onClick={() => { setFileId(null); setFileName(null) }}>✕</button>
        </div>
      )}

      {showPhrases && (
        <div className={styles.phrasesPanel}>
          <QuickPhrasesList onSelect={handlePhraseSelect} onClose={() => setShowPhrases(false)} />
        </div>
      )}

      <div className={styles.row}>
        <button
          className={styles.iconBtn}
          onClick={() => fileInputRef.current?.click()}
          title="Прикрепить файл"
          disabled={uploading}
        >
          {uploading ? '⏳' : '📎'}
        </button>

        <input
          ref={fileInputRef}
          className={styles.fileInput}
          type="file"
          onChange={handleFileChange}
        />

        <div className={styles.inputWrapper}>
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            rows={1}
            placeholder="Введите сообщение..."
            value={text}
            onChange={autoResize}
            onKeyDown={handleKeyDown}
          />
          <button
            className={styles.phrasesToggle}
            onClick={() => setShowPhrases((v) => !v)}
            title="Шаблонные фразы"
            type="button"
          >
            ⚡
          </button>
        </div>

        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!canSend}
          title="Отправить"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
