import type { ExternalMessage } from '@/types'
import styles from './MessageBubble.module.css'

interface Props {
  message: ExternalMessage
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
}

function fileIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼'
  if (mime.startsWith('audio/')) return '🎵'
  if (mime.startsWith('video/')) return '🎬'
  return '📄'
}

export default function MessageBubble({ message }: Props) {
  const isOut = message.direction === 'out'
  const { file, content, messageType, sentAt } = message

  return (
    <div className={`${styles.wrapper} ${isOut ? styles.out : styles.in}`}>
      <div className={styles.bubble}>
        {file && messageType === 'image' && (
          <img
            className={styles.image}
            src={file.url}
            alt={file.originalName}
            onClick={() => window.open(file.url, '_blank')}
          />
        )}

        {file && messageType !== 'image' && (
          <div className={styles.fileAttachment}>
            <span className={styles.fileIcon}>{fileIcon(file.mimeType)}</span>
            <div className={styles.fileInfo}>
              <span className={styles.fileName}>{file.originalName}</span>
              <a
                className={styles.fileDownload}
                href={file.url}
                target="_blank"
                rel="noreferrer"
                download={file.originalName}
              >
                Скачать
              </a>
            </div>
          </div>
        )}

        {content && <div className={styles.content}>{content}</div>}

        <div className={styles.time}>
          {formatTime(sentAt)}
          {isOut && <span className={styles.checkmark}>✓✓</span>}
        </div>
      </div>
    </div>
  )
}
