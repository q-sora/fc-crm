const lidToPhoneMap = {}

function upsertContacts(contacts) {
  for (const c of contacts) {
    if (c.id && c.lid) {
      if (c.id.endsWith('@s.whatsapp.net') && c.lid.endsWith('@lid')) {
        lidToPhoneMap[c.lid] = c.id
      } else if (c.id.endsWith('@lid') && c.lid.endsWith('@s.whatsapp.net')) {
        lidToPhoneMap[c.id] = c.lid
      }
    }
  }
}

function resolveJid(jid) {
  if (!jid || !jid.endsWith('@lid')) return jid
  return lidToPhoneMap[jid] || jid
}

module.exports = { upsertContacts, resolveJid }
