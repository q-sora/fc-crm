import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getQuickPhrases, createQuickPhrase, deleteQuickPhrase } from '@/api/quickPhrases'
import IconBolt from '@/components/icons/IconBolt'
import IconPlus from '@/components/icons/IconPlus'
import IconClose from '@/components/icons/IconClose'
import styles from './QuickPhrasesList.module.css'

interface Props {
  onSelect: (body: string) => void
  onClose: () => void
}

export default function QuickPhrasesList({ onSelect, onClose }: Props) {
  const qc = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: phrases = [] } = useQuery({
    queryKey: ['quick-phrases'],
    queryFn: getQuickPhrases,
  })

  const createMutation = useMutation({
    mutationFn: () => createQuickPhrase({ title: title.trim(), body: body.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quick-phrases'] })
      setTitle('')
      setBody('')
      setShowAdd(false)
      setError(null)
    },
    onError: () => setError('Ошибка сохранения'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteQuickPhrase,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quick-phrases'] }),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) { setError('Заполните оба поля'); return }
    setError(null)
    createMutation.mutate()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>
          <IconBolt size={14} />
          Шаблонные фразы
        </span>
        <div className={styles.headerActions}>
          <button
            className={styles.addToggleBtn}
            onClick={() => setShowAdd((v) => !v)}
            title="Добавить фразу"
          >
            {showAdd ? <IconClose size={14} /> : <IconPlus size={14} />}
          </button>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
      </div>

      {showAdd && (
        <form className={styles.addForm} onSubmit={handleCreate}>
          <input
            className={styles.addInput}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название (напр. «Приветствие»)"
          />
          <textarea
            className={styles.addTextarea}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Текст фразы..."
            rows={3}
          />
          {error && <div className={styles.addError}>{error}</div>}
          <div className={styles.addActions}>
            <button type="button" className={styles.cancelBtn} onClick={() => { setShowAdd(false); setError(null) }}>
              Отмена
            </button>
            <button type="submit" className={styles.saveBtn} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      )}

      <div className={styles.list}>
        {phrases.length === 0 && (
          <div className={styles.empty}>Нет шаблонных фраз</div>
        )}
        {phrases.map((phrase) => (
          <div key={phrase.id} className={styles.item}>
            <button className={styles.itemContent} onClick={() => onSelect(phrase.body)}>
              <span className={styles.itemTitle}>{phrase.title}</span>
              <span className={styles.itemBody}>{phrase.body}</span>
            </button>
            <button
              className={styles.deleteBtn}
              onClick={() => deleteMutation.mutate(phrase.id)}
              disabled={deleteMutation.isPending}
              title="Удалить"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
