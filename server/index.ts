import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import * as Socket from 'socket.io'

const HOST = '0.0.0.0'
const PORT = 3000

const httpServer = http.createServer((request, response) => {
  switch (request.url) {
    case '/client/index.js':
      response.writeHead(200, {
        'Content-Type': 'application/javascript'
      })

      response.write(
        fs.readFileSync(path.resolve(__dirname, '../client/index.js'))
      )
      break

    case '/':
      response.writeHead(200, {
        'Content-Type': 'text/html'
      })
      response.write(
        fs.readFileSync(path.resolve(__dirname, '../index.html'))
      )
      break

    default:
      response.statusCode = 404
      break
  }

  response.end()
})

httpServer.listen(PORT, HOST, () => {
  console.log(`Server is on at port ${PORT}.`)
})

// Setup socket.io.
const io = Socket.listen(httpServer)

// Allow unsecure source.
io.origins('*:*')

// New client is on.
let userCount = 0

io.sockets.on('connection', socket => {
  userCount++
  console.log('A new user is online, total user: ', userCount)

  socket.on('offer', data => {
    const sdp = data.sdp
    socket.broadcast.emit('offer', { sdp })
  })

  socket.on('answer', data => {
    socket.broadcast.emit('answer', { sdp: data.sdp })
  })

  socket.on('ice', data => {
    socket.broadcast.emit('ice', { candidate: data.candidate })
  })

  socket.on('hangup', () => {
    socket.broadcast.emit('hangup')
    userCount--
    console.log('A user has left, current user: ', userCount)
  })
})
