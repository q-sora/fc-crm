import { useQuery } from '@tanstack/react-query'
import { getQuickPhrases } from '@/api/quickPhrases'
import styles from './QuickPhrasesList.module.css'

interface Props {
  onSelect: (body: string) => void
  onClose: () => void
}

export default function QuickPhrasesList({ onSelect, onClose }: Props) {
  const { data: phrases = [] } = useQuery({
    queryKey: ['quick-phrases'],
    queryFn: getQuickPhrases,
  })

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>⚡ Шаблонные фразы</span>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>
      <div className={styles.list}>
        {phrases.length === 0 && (
          <div className={styles.empty}>Нет шаблонных фраз</div>
        )}
        {phrases.map((phrase) => (
          <button
            key={phrase.id}
            className={styles.item}
            onClick={() => onSelect(phrase.body)}
          >
            <span className={styles.itemTitle}>{phrase.title}</span>
            <span className={styles.itemBody}>{phrase.body}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
