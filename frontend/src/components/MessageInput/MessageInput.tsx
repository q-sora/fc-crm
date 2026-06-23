import { forwardRef, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react'
import { uploadFile } from '@/api/files'
import QuickPhrasesList from '@/components/QuickPhrases/QuickPhrasesList'
import IconAttach from '@/components/icons/IconAttach'
import IconBolt from '@/components/icons/IconBolt'
import IconSend from '@/components/icons/IconSend'
import styles from './MessageInput.module.css'

export interface MessageInputHandle {
  handleFileDrop: (file: File) => Promise<void>
}

interface Props {
  chatId: number
  onSend: (content: string, fileId?: number) => Promise<void>
  showDragOverlay?: boolean
}

const MessageInput = forwardRef<MessageInputHandle, Props>(
  ({ chatId, onSend, showDragOverlay = true }, ref) => {
    const [text, setText] = useState('')
    const [fileId, setFileId] = useState<number | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [sending, setSending] = useState(false)
    const [showPhrases, setShowPhrases] = useState(false)
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const dragCounterRef = useRef(0)

    async function uploadSingleFile(file: File) {
      setUploading(true)
      setUploadError(null)
      try {
        const uploaded = await uploadFile(file)
        setFileId(uploaded.id)
        setFileName(file.name)
      } catch {
        setUploadError('Не удалось загрузить файл. Проверьте размер (макс. 100 МБ).')
      } finally {
        setUploading(false)
      }
    }

    useImperativeHandle(ref, () => ({ handleFileDrop: uploadSingleFile }))

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      await uploadSingleFile(file)
      e.target.value = ''
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
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
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

    async function handlePhraseSelect(body: string) {
      setShowPhrases(false)
      setSending(true)
      try {
        await onSend(body, undefined)
      } finally {
        setSending(false)
      }
    }

    function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
      setText(e.target.value)
      e.target.style.height = 'auto'
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
    }

    function handleDragEnter(e: React.DragEvent) {
      e.preventDefault()
      dragCounterRef.current++
      if (dragCounterRef.current === 1) setIsDragOver(true)
    }

    function handleDragLeave() {
      dragCounterRef.current--
      if (dragCounterRef.current === 0) setIsDragOver(false)
    }

    function handleDragOver(e: React.DragEvent) {
      e.preventDefault()
    }

    async function handleDrop(e: React.DragEvent) {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (!file) return
      await uploadSingleFile(file)
    }

    const canSend = (text.trim().length > 0 || fileId !== null) && !sending && !uploading

    return (
      <div
        className={styles.container}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {isDragOver && showDragOverlay && (
          <div className={styles.dropOverlay}>
            <div className={styles.dropOverlayInner}>
              <IconAttach size={32} />
              <span>Отпустите файл для загрузки</span>
            </div>
          </div>
        )}

        {uploadError && (
          <div className={styles.uploadError}>{uploadError}</div>
        )}

        {fileId && fileName && (
          <div className={styles.filePreview}>
            <IconAttach size={14} />
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
            <IconAttach size={20} />
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
              <IconBolt size={18} />
            </button>
          </div>

          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!canSend}
            title="Отправить"
          >
            <IconSend size={18} />
          </button>
        </div>
      </div>
    )
  }
)

MessageInput.displayName = 'MessageInput'

export default MessageInput
