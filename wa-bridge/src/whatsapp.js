const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const path = require('path')
const { sendWebhook } = require('./webhook')

let waSocket = null

async function startWhatsApp() {
  const sessionDir = path.resolve('.baileys_session')
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
  })

  waSocket = sock

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
      if (shouldReconnect) {
        setTimeout(startWhatsApp, 3000)
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      await sendWebhook('message', msg)
    }
  })
}

function getSocket() {
  return waSocket
}

module.exports = { startWhatsApp, getSocket }
