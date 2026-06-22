let _socket = null

function setSocket(sock) { _socket = sock }
function getSocket() { return _socket }

module.exports = { setSocket, getSocket }
