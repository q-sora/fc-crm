const { getSocket } = require('./socket')
const axios = require('axios')

async function sendMessage({ phone, message, fileUrl, mimeType, fileName }) {
  const sock = getSocket()
  if (!sock) throw new Error('WhatsApp not connected')

  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`

  if (fileUrl) {
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data)

    const isImage = mimeType?.startsWith('image/')
    const isAudio = mimeType?.startsWith('audio/')

    if (isImage) {
      await sock.sendMessage(jid, { image: buffer, caption: message || '' })
    } else if (isAudio) {
      await sock.sendMessage(jid, { audio: buffer, mimetype: mimeType, ptt: false })
    } else {
      await sock.sendMessage(jid, {
        document: buffer,
        mimetype: mimeType || 'application/octet-stream',
        fileName: fileName || 'file',
        caption: message || '',
      })
    }
  } else {
    await sock.sendMessage(jid, { text: message })
  }
}

module.exports = { sendMessage }
