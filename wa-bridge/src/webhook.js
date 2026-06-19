const axios = require('axios')

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://backend:8000'
const TOKEN = process.env.FASTAPI_WEBHOOK_TOKEN || ''

/**
 * Parse a raw Baileys message into a structured payload for FastAPI.
 * Returns null if the message should be ignored.
 */
function parseMessage(baileysMsg) {
  const { key, message, messageTimestamp } = baileysMsg
  if (!message || key.fromMe) return null

  const phone = key.remoteJid.replace('@s.whatsapp.net', '')
  const wa_message_id = key.id

  // Detect type and extract text
  let message_type = 'text'
  let content = null

  if (message.conversation) {
    content = message.conversation
  } else if (message.extendedTextMessage?.text) {
    content = message.extendedTextMessage.text
  } else if (message.imageMessage) {
    message_type = 'image'
    content = message.imageMessage.caption || null
  } else if (message.documentMessage) {
    message_type = 'document'
    content = message.documentMessage.caption || null
  } else if (message.audioMessage) {
    message_type = 'audio'
  } else if (message.videoMessage) {
    message_type = 'video'
    content = message.videoMessage.caption || null
  } else {
    // Unsupported type — skip
    return null
  }

  return { phone, wa_message_id, message_type, content }
}

async function sendWebhook(event, baileysMsg) {
  const data = parseMessage(baileysMsg)
  if (!data) return

  try {
    await axios.post(
      `${FASTAPI_URL}/internal/wa-webhook`,
      { event, data },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 5000,
      }
    )
  } catch (err) {
    console.error('[WA Bridge] Webhook delivery failed:', err.message)
  }
}

module.exports = { sendWebhook }
