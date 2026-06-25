import { useLangStore } from '@/store/langStore'

export type Translations = {
  nav_clients: string
  nav_team: string
  nav_archive: string
  nav_admin: string
  nav_logout: string

  login_subtitle: string
  login_password: string
  login_submit: string
  login_loading: string
  login_error: string

  search_placeholder: string
  chats_not_found: string
  no_chats: string
  select_chat: string
  no_messages: string
  unread_separator: string

  external_chats_title: string
  archive_title: string

  internal_chats_title: string
  new_chat: string
  select_internal_chat: string

  role_admin: string
  role_employee: string
  you_label: string

  members_title: string
  cancel: string
  save: string
  saving: string

  delete_chat: string
  delete_chat_confirm: string

  forwarded_label: string
  forward_message: string
  forward_team: string
  forward_clients: string
  no_internal_chats: string
  no_external_chats: string
  forward_sent: (name: string) => string
  download_hint: string

  client_profile: string
  archive_chat: string
  unarchive_chat: string

  profile_title: string
  field_fullname: string
  field_iin: string
  field_org: string
  field_phone: string
  field_telegram: string
  field_first_contact: string
  not_specified: string
  not_specified_m: string
  not_specified_f: string
  org_change: string
  org_set: string
  org_search_placeholder: string
  org_not_set: string
  org_not_found: string

  new_chat_title: string
  mode_direct: string
  mode_group: string
  group_name_placeholder: string
  search_by_name: string
  no_colleagues: string
  no_one_found: string
  select_participant: string
  enter_group_name: string
  create_error: string
  create_btn: string
  creating: string

  drop_file_hint: string
  drop_release_hint: string
  attach_file: string
  quick_phrases: string
  message_placeholder: string
  upload_error: string
}

const ru: Translations = {
  nav_clients: 'Клиенты',
  nav_team: 'Команда',
  nav_archive: 'Архив',
  nav_admin: 'Админ',
  nav_logout: 'Выйти',

  login_subtitle: 'Корпоративная система коммуникаций',
  login_password: 'Пароль',
  login_submit: 'Войти',
  login_loading: 'Вход...',
  login_error: 'Неверный email или пароль',

  search_placeholder: 'Поиск...',
  chats_not_found: 'Чаты не найдены',
  no_chats: 'Нет чатов',
  select_chat: 'Выберите чат для начала работы',
  no_messages: 'Нет сообщений',
  unread_separator: 'Непрочитанные',

  external_chats_title: 'Чаты с клиентами',
  archive_title: 'Архив',

  internal_chats_title: 'Команда',
  new_chat: 'Новый чат',
  select_internal_chat: 'Выберите чат',

  role_admin: 'Администратор',
  role_employee: 'Сотрудник',
  you_label: '(Вы)',

  members_title: 'Участники:',
  cancel: 'Отмена',
  save: 'Сохранить',
  saving: 'Сохранение...',

  delete_chat: 'Удалить чат',
  delete_chat_confirm: 'Удалить чат? Все сообщения будут удалены.',

  forwarded_label: 'Переслано',
  forward_message: 'Переслать сообщение',
  forward_team: 'Команда',
  forward_clients: 'Клиенты',
  no_internal_chats: 'Нет внутренних чатов',
  no_external_chats: 'Нет доступных клиентских чатов',
  forward_sent: (name) => `Отправлено в «${name}»`,
  download_hint: 'Скачать',

  client_profile: 'Профиль клиента',
  archive_chat: 'Архивировать',
  unarchive_chat: 'Разархивировать',

  profile_title: 'Профиль клиента',
  field_fullname: 'ФИО',
  field_iin: 'ИИН',
  field_org: 'Организация',
  field_phone: 'Телефон',
  field_telegram: 'Telegram',
  field_first_contact: 'Первое обращение',
  not_specified: 'Не указано',
  not_specified_m: 'Не указан',
  not_specified_f: 'Не указана',
  org_change: 'Изменить',
  org_set: 'Указать',
  org_search_placeholder: 'Поиск организации...',
  org_not_set: '— Не указана —',
  org_not_found: 'Не найдено',

  new_chat_title: 'Новый чат',
  mode_direct: 'Личный',
  mode_group: 'Группа',
  group_name_placeholder: 'Название группы',
  search_by_name: 'Поиск по имени...',
  no_colleagues: 'Нет других сотрудников',
  no_one_found: 'Никого не найдено',
  select_participant: 'Выберите участника',
  enter_group_name: 'Введите название группы',
  create_error: 'Ошибка создания чата',
  create_btn: 'Создать',
  creating: 'Создание...',

  drop_file_hint: 'Перетащите файл для отправки',
  drop_release_hint: 'Отпустите файл для загрузки',
  attach_file: 'Прикрепить файл',
  quick_phrases: 'Шаблонные фразы',
  message_placeholder: 'Введите сообщение...',
  upload_error: 'Не удалось загрузить файл. Проверьте размер (макс. 100 МБ).',
}

const kz: Translations = {
  nav_clients: 'Клиенттер',
  nav_team: 'Топ',
  nav_archive: 'Мұрағат',
  nav_admin: 'Әкімші',
  nav_logout: 'Шығу',

  login_subtitle: 'Корпоративтік коммуникация жүйесі',
  login_password: 'Құпиясөз',
  login_submit: 'Кіру',
  login_loading: 'Кіру...',
  login_error: 'Қате email немесе құпиясөз',

  search_placeholder: 'Іздеу...',
  chats_not_found: 'Чаттар табылмады',
  no_chats: 'Чаттар жоқ',
  select_chat: 'Жұмысты бастау үшін чатты таңдаңыз',
  no_messages: 'Хабарлар жоқ',
  unread_separator: 'Оқылмаған',

  external_chats_title: 'Клиенттермен чаттар',
  archive_title: 'Мұрағат',

  internal_chats_title: 'Топ',
  new_chat: 'Жаңа чат',
  select_internal_chat: 'Чатты таңдаңыз',

  role_admin: 'Әкімші',
  role_employee: 'Қызметкер',
  you_label: '(Сіз)',

  members_title: 'Қатысушылар:',
  cancel: 'Болдырмау',
  save: 'Сақтау',
  saving: 'Сақталуда...',

  delete_chat: 'Чатты жою',
  delete_chat_confirm: 'Чатты жою керек пе? Барлық хабарлар жойылады.',

  forwarded_label: 'Қайта жіберілді',
  forward_message: 'Хабарды қайта жіберу',
  forward_team: 'Топ',
  forward_clients: 'Клиенттер',
  no_internal_chats: 'Ішкі чаттар жоқ',
  no_external_chats: 'Қолжетімді клиент чаттары жоқ',
  forward_sent: (name) => `«${name}» чатқа жіберілді`,
  download_hint: 'Жүктеу',

  client_profile: 'Клиент профилі',
  archive_chat: 'Мұрағатқа жіберу',
  unarchive_chat: 'Мұрағаттан шығару',

  profile_title: 'Клиент профилі',
  field_fullname: 'ТАӘ',
  field_iin: 'ЖСН',
  field_org: 'Ұйым',
  field_phone: 'Телефон',
  field_telegram: 'Telegram',
  field_first_contact: 'Алғашқы жүгіну',
  not_specified: 'Көрсетілмеген',
  not_specified_m: 'Көрсетілмеген',
  not_specified_f: 'Көрсетілмеген',
  org_change: 'Өзгерту',
  org_set: 'Көрсету',
  org_search_placeholder: 'Ұйым іздеу...',
  org_not_set: '— Көрсетілмеген —',
  org_not_found: 'Табылмады',

  new_chat_title: 'Жаңа чат',
  mode_direct: 'Жеке',
  mode_group: 'Топтық',
  group_name_placeholder: 'Топ атауы',
  search_by_name: 'Атау бойынша іздеу...',
  no_colleagues: 'Басқа қызметкерлер жоқ',
  no_one_found: 'Ешкім табылмады',
  select_participant: 'Қатысушыны таңдаңыз',
  enter_group_name: 'Топ атауын енгізіңіз',
  create_error: 'Чат жасау қатесі',
  create_btn: 'Жасау',
  creating: 'Жасалуда...',

  drop_file_hint: 'Файлды жіберу үшін апарып тастаңыз',
  drop_release_hint: 'Файлды жүктеу үшін жіберіңіз',
  attach_file: 'Файл тіркеу',
  quick_phrases: 'Үлгі фразалар',
  message_placeholder: 'Хабар енгізіңіз...',
  upload_error: 'Файлды жүктеу мүмкін болмады. Өлшемін тексеріңіз (макс. 100 МБ).',
}

const translations = { ru, kz } as const

export function useT(): Translations {
  const lang = useLangStore((s) => s.lang)
  return translations[lang]
}
