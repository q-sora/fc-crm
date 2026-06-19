const axios = require('axios')

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://backend:8000'
const TOKEN = process.env.FASTAPI_WEBHOOK_TOKEN || ''

async function sendWebhook(event, data) {
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
