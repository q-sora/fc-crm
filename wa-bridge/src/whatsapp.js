const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode-terminal')
const path = require('path')
const { sendWebhook } = require('./webhook')
const { upsertContacts } = require('./store')
const { setSocket } = require('./socket')

const logger = pino({ level: 'warn' })

async function startWhatsApp() {
  const sessionDir = path.resolve('.baileys_session')
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)

  let version
  try {
    const result = await fetchLatestBaileysVersion()
    version = result.version
  } catch {
    version = [2, 3000, 1015901307]
  }

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: undefined,
    keepAliveIntervalMs: 15_000,
    retryRequestDelayMs: 2_000,
  })

  setSocket(sock)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n[WA Bridge] Scan QR code to connect WhatsApp:\n')
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'open') {
      console.log('[WA Bridge] WhatsApp connected')
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = code !== DisconnectReason.loggedOut
      console.log('[WA Bridge] Connection closed, reconnect:', shouldReconnect)
      if (shouldReconnect) setTimeout(startWhatsApp, 3000)
    }
  })

  sock.ev.on('contacts.upsert', upsertContacts)
  sock.ev.on('contacts.update', upsertContacts)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      await sendWebhook('message', msg)
    }
  })
}

module.exports = { startWhatsApp }
