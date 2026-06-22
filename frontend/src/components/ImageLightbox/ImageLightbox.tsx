import { useEffect } from 'react'
import IconClose from '@/components/icons/IconClose'
import styles from './ImageLightbox.module.css'

interface Props {
  src: string
  alt?: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button className={styles.closeBtn} onClick={onClose} title="Закрыть">
        <IconClose size={24} />
      </button>
      <img
        className={styles.image}
        src={src}
        alt={alt ?? ''}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
