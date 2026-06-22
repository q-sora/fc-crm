const express = require('express')
const { startWhatsApp } = require('./whatsapp')

const app = express()
app.use(express.json())

// Command endpoint: FastAPI → wa-bridge → WhatsApp
app.post('/send', async (req, res) => {
  const authToken = req.headers['authtoken']  // Express lowercases all header names
  if (authToken !== process.env.FASTAPI_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const { phone, message, fileUrl, mimeType, fileName } = req.body
  try {
    const { sendMessage } = require('./sender')
    await sendMessage({ phone, message, fileUrl, mimeType, fileName })
    res.json({ ok: true })
  } catch (err) {
    console.error('Send error:', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`WA Bridge listening on port ${PORT}`))

startWhatsApp()
