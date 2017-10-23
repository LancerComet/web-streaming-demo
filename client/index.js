const RTCSessionDescription = window.RTCSessionDescription
const RTCIceCandidate = window.RTCIceCandidate
const RTCPeerConnection = window.RTCPeerConnection

const localCamera = document.getElementById('local-camera')
const remoteCamera = document.getElementById('remote-camera')

/**
 * Local stream reference.
 *
 * @type {MediaStream}
 */
let localStream = null

/**
 * Local sdp reference.
 */
let localSdp = null

// PeerConnection.
let localPeerConnection = new RTCPeerConnection(null)
let remotePeerConnection = new RTCPeerConnection(null)

window.addEventListener('DOMContentLoaded', async () => {
  await getLocalCameraStream()
  await connectToServer()
})

/**
 * Get video stream from local camera.
 */
async function getLocalCameraStream () {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true, audio: true
  })

  localStream = stream  // Keep reference.
  setVideoStream(stream, localCamera)  // Set local stream to video element.
  console.log('[Local] Local stream is captured.')
}

/**
 * Connet to server.
 */
async function connectToServer () {
  const socket = io()

  // OnOffer.
  socket.on('offer', async ({ sdp }) => {
    console.log('[Remote] on offer:', sdp)

    remotePeerConnection.onicecandidate = event => {
      const candidate = event.candidate
      if (candidate) {
        socket.emit('ice', { candidate })
      }
    }

    const offer = new RTCSessionDescription(sdp)

    try {
      await remotePeerConnection.setRemoteDescription(offer)
      const answerSdp = await remotePeerConnection.createAnswer()
      await remotePeerConnection.setLocalDescription(answerSdp)
      socket.emit('answer', { sdp: answerSdp })
    } catch (error) {
      console.error('Error occured in socket.on("offer"): ', error)
    }
  })

  socket.on('answer', data => {
    localPeerConnection.setRemoteDescription(
      new RTCSessionDescription(data.sdp)
    )
  })

  socket.on('ice', data => {
    localPeerConnection.addIceCandidate(
      new RTCIceCandidate(data.candidate)
    )
  })

  socket.on('hangup', () => {
    localPeerConnection.close()
    remotePeerConnection.close()
  })

  remotePeerConnection.onaddstream = function (event) {
    remoteCamera.srcObject = event.stream
  }

  // Create offer and send it to STUN Sercer.
  console.log('[Local] Going to connect to STUN server...')
  try {
    const option = {
      'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
      }
    }

    // Set local stream to localPeerConnection.
    localPeerConnection.addStream(localStream)

    // Create offer and get sdp.
    const sdp = await localPeerConnection.createOffer(option)

    // Keep local sdp reference.
    localSdp = sdp

    // Set local description.
    await localPeerConnection.setLocalDescription(sdp)

    // Send sdp to remote server.
    socket.emit('offer', { sdp })
    console.log('[Local] STUN server is connected and sdp is sent in success.')
  } catch (error) {
    console.error('Create offer error: ', error)
  }
}

/**
 * Set video strea.
 *
 * @param {MediaStream} stream
 * @param {HTMLVideoElement} videoElement
 */
function setVideoStream (stream, videoElement) {
  videoElement.srcObject = stream
}

/**
 * Local stream recording.
 */
async function recordLocalStream () {
  console.log('[Recorder] Start recording.')
  const recorder = new MediaRecorder(localStream)

  recorder.ondataavailable = function (event) {
    console.log('[Recorder] onDataAvailable: ', event)
    const blob = event.data
    download(blob)
  }

  recorder.start()
  await wait(10000)
  recorder.stop()
}

function wait (time = 1000) {
  return new Promise(resolve => {
    setTimeout(resolve, time)
  })
}

function download (blob) {
  const a = document.createElement('a')
  const url = URL.createObjectURL(blob)
  a.href = url
  a.download = 'record'
  document.body.appendChild(a)
  a.click()
}
