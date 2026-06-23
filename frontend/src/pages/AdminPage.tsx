import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deactivateUser, activateUser, deleteUser } from '@/api/users'
import { getOrganizations, createOrganization, deleteOrganization } from '@/api/organizations'
import { getClients, updateClient, deleteClient } from '@/api/clients'
import type { User, UserRole, Organization, ClientProfile } from '@/types'
import IconSearch from '@/components/icons/IconSearch'
import styles from './AdminPage.module.css'

type Tab = 'users' | 'orgs' | 'clients'

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Администрирование</h1>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'users' ? styles.active : ''}`}
            onClick={() => setTab('users')}
          >
            Пользователи
          </button>
          <button
            className={`${styles.tab} ${tab === 'orgs' ? styles.active : ''}`}
            onClick={() => setTab('orgs')}
          >
            Организации
          </button>
          <button
            className={`${styles.tab} ${tab === 'clients' ? styles.active : ''}`}
            onClick={() => setTab('clients')}
          >
            Клиенты
          </button>
        </div>
      </div>
      <div className={styles.content}>
        {tab === 'users' && <UsersTab />}
        {tab === 'orgs' && <OrgsTab />}
        {tab === 'clients' && <ClientsTab />}
      </div>
    </div>
  )
}

// ── Users tab ──────────────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [search, setSearch] = useState('')

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const { data: orgs = [] } = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations })

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return users
    return users.filter((u) =>
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const deactivateMutation = useMutation({ mutationFn: deactivateUser, onSuccess: invalidate })
  const activateMutation = useMutation({ mutationFn: activateUser, onSuccess: invalidate })
  const deleteMutation = useMutation({ mutationFn: deleteUser, onSuccess: invalidate })

  function handleDelete(u: User) {
    if (!confirm(`Удалить пользователя «${u.name}»? Это действие необратимо.`)) return
    deleteMutation.mutate(u.id)
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div className={styles.searchGroup}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><IconSearch size={14} /></span>
            <input
              className={styles.searchInput}
              placeholder="Поиск по имени или email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className={styles.count}>{filtered.length} из {users.length} пользователей</span>
        </div>
        <button className={styles.addBtn} onClick={() => { setShowCreate(true); setEditUser(null) }}>
          + Добавить
        </button>
      </div>

      {showCreate && (
        <CreateUserForm
          orgs={orgs}
          onClose={() => setShowCreate(false)}
          onCreated={() => { invalidate(); setShowCreate(false) }}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          orgs={orgs}
          onClose={() => setEditUser(null)}
          onSaved={() => { invalidate(); setEditUser(null) }}
        />
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ФИО</th>
            <th>Email</th>
            <th>Роль</th>
            <th>Организации</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.id} className={!u.isActive ? styles.inactive : ''}>
              <td>{u.name}</td>
              <td className={styles.email}>{u.email}</td>
              <td>
                <span className={`${styles.badge} ${u.role === 'admin' ? styles.badgeAdmin : styles.badgeEmployee}`}>
                  {u.role === 'admin' ? 'Администратор' : 'Сотрудник'}
                </span>
              </td>
              <td>
                {u.organizations.length === 0
                  ? <span className={styles.muted}>—</span>
                  : u.organizations.map(o => o.name).join(', ')}
              </td>
              <td>
                <span className={u.isActive ? styles.statusActive : styles.statusInactive}>
                  {u.isActive ? 'Активен' : 'Деактивирован'}
                </span>
              </td>
              <td className={styles.actions}>
                <button className={styles.editBtn} onClick={() => setEditUser(u)}>
                  Изменить
                </button>
                {u.isActive ? (
                  <button
                    className={styles.warnBtn}
                    onClick={() => deactivateMutation.mutate(u.id)}
                    disabled={deactivateMutation.isPending}
                  >
                    Деактивировать
                  </button>
                ) : (
                  <button
                    className={styles.successBtn}
                    onClick={() => activateMutation.mutate(u.id)}
                    disabled={activateMutation.isPending}
                  >
                    Активировать
                  </button>
                )}
                <button
                  className={styles.dangerBtn}
                  onClick={() => handleDelete(u)}
                  disabled={deleteMutation.isPending}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Create user form ───────────────────────────────────────────────────────────

interface CreateProps {
  orgs: Organization[]
  onClose: () => void
  onCreated: () => void
}

function CreateUserForm({ orgs, onClose, onCreated }: CreateProps) {
  const [form, setForm] = useState({
    email: '', password: '', name: '', role: 'employee' as UserRole,
  })
  const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)
  const [orgSearch, setOrgSearch] = useState('')
  const filteredOrgs = useMemo(() => {
    const q = orgSearch.toLowerCase().trim()
    return q ? orgs.filter((o) => o.name.toLowerCase().includes(q)) : orgs
  }, [orgs, orgSearch])

  const mutation = useMutation({
    mutationFn: () => createUser({
      email: form.email, name: form.name, password: form.password,
      role: form.role, organizationIds: selectedOrgIds,
    }),
    onSuccess: onCreated,
    onError: () => setError('Email уже занят или ошибка сервера'),
  })

  function toggleOrg(id: number) {
    setSelectedOrgIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.email || !form.password || !form.name) { setError('Заполните все поля'); return }
    setError(null)
    mutation.mutate()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.formTitle}>Новый пользователь</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>ФИО *</label>
              <input className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Иванов Иван" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email *</label>
              <input className={styles.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@company.com" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Пароль *</label>
              <input className={styles.input} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Минимум 8 символов" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Роль</label>
              <select className={styles.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="employee">Сотрудник</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
          </div>

          {orgs.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Организации</label>
              <input
                className={styles.orgSearch}
                placeholder="Поиск организации..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
              />
              <div className={styles.orgCheckboxes}>
                {filteredOrgs.map((o) => (
                  <label key={o.id} className={styles.orgCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedOrgIds.includes(o.id)}
                      onChange={() => toggleOrg(o.id)}
                    />
                    {o.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={styles.submitBtn} disabled={mutation.isPending}>
              {mutation.isPending ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit user modal ────────────────────────────────────────────────────────────

interface EditProps {
  user: User
  orgs: Organization[]
  onClose: () => void
  onSaved: () => void
}

function EditUserModal({ user, orgs, onClose, onSaved }: EditProps) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
  })
  const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>(user.organizations.map((o) => o.id))
  const [error, setError] = useState<string | null>(null)
  const [orgSearch, setOrgSearch] = useState('')
  const filteredOrgs = useMemo(() => {
    const q = orgSearch.toLowerCase().trim()
    return q ? orgs.filter((o) => o.name.toLowerCase().includes(q)) : orgs
  }, [orgs, orgSearch])

  const mutation = useMutation({
    mutationFn: () => updateUser(user.id, {
      name: form.name,
      email: form.email,
      password: form.password || undefined,
      role: form.role,
      organizationIds: selectedOrgIds,
    }),
    onSuccess: onSaved,
    onError: () => setError('Ошибка сохранения'),
  })

  function toggleOrg(id: number) {
    setSelectedOrgIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email) { setError('ФИО и Email обязательны'); return }
    setError(null)
    mutation.mutate()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.formTitle}>Редактировать: {user.name}</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>ФИО *</label>
              <input className={styles.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Email *</label>
              <input className={styles.input} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Новый пароль</label>
              <input className={styles.input} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Оставьте пустым для сохранения" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Роль</label>
              <select className={styles.input} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                <option value="employee">Сотрудник</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
          </div>

          {orgs.length > 0 && (
            <div className={styles.field}>
              <label className={styles.label}>Организации</label>
              <input
                className={styles.orgSearch}
                placeholder="Поиск организации..."
                value={orgSearch}
                onChange={(e) => setOrgSearch(e.target.value)}
              />
              <div className={styles.orgCheckboxes}>
                {filteredOrgs.map((o) => (
                  <label key={o.id} className={styles.orgCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedOrgIds.includes(o.id)}
                      onChange={() => toggleOrg(o.id)}
                    />
                    {o.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={styles.submitBtn} disabled={mutation.isPending}>
              {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Clients tab ───────────────────────────────────────────────────────────────

function ClientsTab() {
  const qc = useQueryClient()
  const [editClient, setEditClient] = useState<ClientProfile | null>(null)
  const [search, setSearch] = useState('')
  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: getClients })
  const { data: orgs = [] } = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations })

  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return clients
    return clients.filter((c) =>
      c.fullName?.toLowerCase().includes(q) ||
      c.iin?.includes(q) ||
      c.organization?.name.toLowerCase().includes(q) ||
      c.whatsappPhone?.includes(q) ||
      c.telegramUsername?.toLowerCase().includes(q)
    )
  }, [clients, search])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['clients'] })
  const deleteMutation = useMutation({ mutationFn: deleteClient, onSuccess: invalidate })

  function handleDelete(c: ClientProfile) {
    const name = c.fullName ?? c.whatsappPhone ?? c.telegramUsername ?? `клиент #${c.id}`
    if (!confirm(`Удалить клиента «${name}»?\n\nВсе переписки и файлы этого клиента будут удалены. Это действие необратимо.`)) return
    deleteMutation.mutate(c.id)
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div className={styles.searchGroup}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><IconSearch size={14} /></span>
            <input
              className={styles.searchInput}
              placeholder="Поиск по имени, ИИН, организации..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className={styles.count}>{filteredClients.length} из {clients.length} клиентов</span>
        </div>
      </div>

      {editClient && (
        <EditClientModal
          client={editClient}
          orgs={orgs}
          onClose={() => setEditClient(null)}
          onSaved={() => { invalidate(); setEditClient(null) }}
        />
      )}

      <table className={styles.table}>
        <thead>
          <tr>
            <th>ФИО</th>
            <th>ИИН</th>
            <th>Контакт</th>
            <th>Канал</th>
            <th>Организация</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {filteredClients.map((c) => (
            <tr key={c.id}>
              <td>{c.fullName ?? <span className={styles.muted}>—</span>}</td>
              <td className={styles.muted}>{c.iin ?? '—'}</td>
              <td className={styles.muted}>{c.whatsappPhone ?? c.telegramUsername ?? (c.telegramUserId ? `tg:${c.telegramUserId}` : '—')}</td>
              <td>
                <span className={`${styles.badge} ${c.channel === 'whatsapp' ? styles.badgeWa : styles.badgeTg}`}>
                  {c.channel === 'whatsapp' ? 'WhatsApp' : 'Telegram'}
                </span>
              </td>
              <td>{c.organization?.name ?? <span className={styles.muted}>—</span>}</td>
              <td className={styles.actions}>
                <button className={styles.editBtn} onClick={() => setEditClient(c)}>Изменить</button>
                <button
                  className={styles.dangerBtn}
                  onClick={() => handleDelete(c)}
                  disabled={deleteMutation.isPending}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

interface EditClientProps {
  client: ClientProfile
  orgs: Organization[]
  onClose: () => void
  onSaved: () => void
}

function EditClientModal({ client, orgs, onClose, onSaved }: EditClientProps) {
  const [form, setForm] = useState({
    fullName: client.fullName ?? '',
    iin: client.iin ?? '',
    organizationId: client.organization?.id ?? null as number | null,
  })
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => updateClient(client.id, {
      full_name: form.fullName || null,
      iin: form.iin || null,
      organization_id: form.organizationId,
    }),
    onSuccess: onSaved,
    onError: () => setError('Ошибка сохранения'),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    mutation.mutate()
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.formTitle}>Редактировать клиента</span>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label className={styles.label}>ФИО</label>
              <input
                className={styles.input}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="Иванов Иван"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>ИИН</label>
              <input
                className={styles.input}
                value={form.iin}
                onChange={(e) => setForm({ ...form, iin: e.target.value })}
                placeholder="000000000000"
                maxLength={12}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Организация</label>
              <select
                className={styles.input}
                value={form.organizationId ?? ''}
                onChange={(e) => setForm({ ...form, organizationId: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="">— Не указана —</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.formActions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>Отмена</button>
            <button type="submit" className={styles.submitBtn} disabled={mutation.isPending}>
              {mutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Organizations tab ──────────────────────────────────────────────────────────

function OrgsTab() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const { data: orgs = [] } = useQuery({ queryKey: ['organizations'], queryFn: getOrganizations })

  const filteredOrgs = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return orgs
    return orgs.filter((o) =>
      o.name.toLowerCase().includes(q) ||
      o.aliases?.some((a) => a.toLowerCase().includes(q))
    )
  }, [orgs, search])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['organizations'] })

  const createMutation = useMutation({
    mutationFn: () => createOrganization(name.trim()),
    onSuccess: () => { invalidate(); setName(''); setError(null) },
    onError: () => setError('Организация с таким названием уже существует'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteOrganization,
    onSuccess: invalidate,
    onError: () => setError('Нельзя удалить организацию с активными клиентами'),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Введите название'); return }
    setError(null)
    createMutation.mutate()
  }

  function handleDelete(o: { id: number; name: string }) {
    if (!confirm(`Удалить организацию «${o.name}»?`)) return
    deleteMutation.mutate(o.id)
  }

  return (
    <div>
      <div className={styles.sectionHeader}>
        <div className={styles.searchGroup}>
          <div className={styles.searchWrapper}>
            <span className={styles.searchIcon}><IconSearch size={14} /></span>
            <input
              className={styles.searchInput}
              placeholder="Поиск по названию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className={styles.count}>{filteredOrgs.length} из {orgs.length} организаций</span>
        </div>
      </div>
      <form onSubmit={handleCreate} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название | альтернативное | ещё одно"
            style={{ flex: 1 }}
          />
          <button className={styles.addBtn} type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? '...' : '+ Добавить'}
          </button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Альтернативные названия указываются через <strong>|</strong> — они помогут боту распознать организацию
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </form>
      <table className={styles.table}>
        <thead>
          <tr><th>ID</th><th>Название</th><th>Создана</th><th></th></tr>
        </thead>
        <tbody>
          {filteredOrgs.map((o) => (
            <tr key={o.id}>
              <td className={styles.muted}>{o.id}</td>
              <td>
                <div>{o.name}</div>
                {o.aliases?.map((alias, i) => (
                  <div key={i} className={styles.muted} style={{ fontSize: 12, marginTop: 2 }}>{alias}</div>
                ))}
              </td>
              <td className={styles.muted}>{new Date(o.createdAt).toLocaleDateString('ru')}</td>
              <td className={styles.actions}>
                <button
                  className={styles.dangerBtn}
                  onClick={() => handleDelete(o)}
                  disabled={deleteMutation.isPending}
                >
                  Удалить
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
