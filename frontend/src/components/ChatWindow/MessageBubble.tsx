import { useState } from 'react'
import type { ExternalMessage } from '@/types'
import IconAttach from '@/components/icons/IconAttach'
import IconFile from '@/components/icons/IconFile'
import IconForward from '@/components/icons/IconForward'
import ImageLightbox from '@/components/ImageLightbox/ImageLightbox'
import { useT } from '@/i18n'
import styles from './MessageBubble.module.css'

interface Props {
  message: ExternalMessage
  onForward?: (content: string | null, fileId: number | null) => void
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message, onForward }: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  const t = useT()
  const isOut = message.direction === 'out'
  const { file, content, messageType, sentAt, isForwarded } = message

  const isImage = file && (messageType === 'image' || file.mimeType.startsWith('image/'))
  const isVideo = file && !isImage && (messageType === 'video' || file.mimeType.startsWith('video/'))

  const forwardBtn = onForward && (
    <button
      className={`${styles.forwardBtn} ${isOut ? styles.forwardBtnOut : styles.forwardBtnIn}`}
      title={t.forwarded_label}
      onClick={() => onForward(content, file?.id ?? null)}
    >
      <IconForward size={14} />
    </button>
  )

  return (
    <>
      <div className={`${styles.wrapper} ${isOut ? styles.out : styles.in}`}>
        {isOut && forwardBtn}
        <div className={`${styles.bubble} ${isImage || isVideo ? styles.mediaBubble : ''}`}>
          {isForwarded && <div className={styles.forwardedLabel}>{t.forwarded_label}</div>}
          {isImage && (
            <img
              className={styles.image}
              src={file.url}
              alt={file.originalName}
              onClick={() => setLightboxSrc(file.url)}
            />
          )}
          {isVideo && (
            <video className={styles.video} src={file.url} controls />
          )}
          {(isImage || isVideo) && (
            <a className={styles.fileDownload} href={file!.url} download={file!.originalName}>
              <IconAttach size={12} />{file!.originalName}
            </a>
          )}
          {file && !isImage && !isVideo && (
            <a className={styles.fileAttachment} href={file.url} download={file.originalName}>
              <div className={styles.fileIconCircle}><IconFile size={28} /></div>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.originalName}</span>
                <span className={styles.fileDownloadHint}>{t.download_hint}</span>
              </div>
            </a>
          )}
          {content && <div className={styles.content}>{content}</div>}
          <div className={styles.time}>
            {formatTime(sentAt)}
            {isOut && <span className={styles.checkmark}>✓</span>}
          </div>
        </div>
        {!isOut && forwardBtn}
      </div>

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  )
}
