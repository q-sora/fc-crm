const axios = require('axios')
const { downloadMediaMessage } = require('@whiskeysockets/baileys')
const { getSocket } = require('./socket')
const { resolveJid } = require('./store')

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://backend:8000'
const TOKEN = process.env.FASTAPI_WEBHOOK_TOKEN || ''

const MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'application/pdf': '.pdf',
}

function cleanMime(raw) {
  return (raw || 'application/octet-stream').split(';')[0].trim()
}

function defaultName(mime, docName) {
  if (docName) return docName
  const ext = MIME_TO_EXT[mime] || ''
  if (mime.startsWith('image/')) return `photo${ext}`
  if (mime.startsWith('audio/')) return `audio${ext}`
  if (mime.startsWith('video/')) return `video${ext}`
  return `file${ext}`
}

async function uploadMedia(baileysMsg, rawMime, docName) {
  const sock = getSocket()
  if (!sock) return null
  try {
    const buffer = await downloadMediaMessage(baileysMsg, 'buffer', {}, {
      reuploadRequest: sock.updateMediaMessage,
    })
    if (!buffer || buffer.length === 0) return null

    const mime = cleanMime(rawMime)
    const filename = defaultName(mime, docName)

    const resp = await axios.post(
      `${FASTAPI_URL}/internal/files/upload`,
      buffer,
      {
        params: { filename, mime_type: mime },
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': mime,
        },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    )
    return resp.data.file_id
  } catch (err) {
    console.error('[WA Bridge] Media upload failed:', err.message)
    return null
  }
}

async function parseMessage(baileysMsg) {
  const { key, message } = baileysMsg
  if (!message || key.fromMe) return null

  const phone = resolveJid(key.remoteJid)
  const wa_message_id = key.id

  let message_type = 'text'
  let content = null
  let file_id = null

  if (message.conversation) {
    content = message.conversation
  } else if (message.extendedTextMessage?.text) {
    content = message.extendedTextMessage.text
  } else if (message.imageMessage) {
    message_type = 'image'
    content = message.imageMessage.caption || null
    file_id = await uploadMedia(baileysMsg, message.imageMessage.mimetype, null)
  } else if (message.documentMessage) {
    message_type = 'document'
    content = message.documentMessage.caption || null
    file_id = await uploadMedia(baileysMsg, message.documentMessage.mimetype, message.documentMessage.fileName)
  } else if (message.documentWithCaptionMessage) {
    const doc = message.documentWithCaptionMessage.message?.documentMessage
    if (!doc) return null
    message_type = 'document'
    content = doc.caption || null
    file_id = await uploadMedia(baileysMsg, doc.mimetype, doc.fileName)
  } else if (message.audioMessage) {
    message_type = 'audio'
    file_id = await uploadMedia(baileysMsg, message.audioMessage.mimetype, null)
  } else if (message.videoMessage) {
    message_type = 'video'
    content = message.videoMessage.caption || null
    file_id = await uploadMedia(baileysMsg, message.videoMessage.mimetype, null)
  } else {
    return null
  }

  return { phone, wa_message_id, message_type, content, file_id }
}

async function sendWebhook(event, baileysMsg) {
  const data = await parseMessage(baileysMsg)
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
        timeout: 15000,
      }
    )
  } catch (err) {
    console.error('[WA Bridge] Webhook delivery failed:', err.message)
  }
}

module.exports = { sendWebhook }
