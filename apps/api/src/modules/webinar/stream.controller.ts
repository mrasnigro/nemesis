import type { Request, Response } from 'express'
import { openViewer, receiveChunk, streamStateFor } from './stream.service.js'
import type { Actor } from './webinar.service.js'

function actor(req: Request): Actor {
  const user = req.user!
  return {
    customerId: user.customerId,
    userId: user.id,
    name: user.name,
    isManager: user.profile === 'customer_admin',
    ip: req.ip,
  }
}

export async function chunkController(req: Request, res: Response) {
  // `header=1` marks the first chunk of a recording (the WebM header); see StreamHub.push.
  await receiveChunk(actor(req), String(req.params.webinarId), req.body, req.query.header === '1')
  res.status(204).end()
}

export async function streamStateController(req: Request, res: Response) {
  res.json({ data: await streamStateFor(actor(req), String(req.params.webinarId)) })
}

/** Keeps the response open and feeds it from the hub until the visitor leaves or the broadcast ends. */
export async function watchController(req: Request, res: Response) {
  let leave: (() => void) | undefined
  let ended = false
  let opened = false

  const finish = () => {
    if (ended) return
    ended = true
    leave?.()
    if (!res.writableEnded) res.end()
  }

  const open = () => {
    if (opened) return
    opened = true
    res.status(200)
    res.setHeader('Content-Type', 'video/webm')
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Accel-Buffering', 'no') // tell reverse proxies not to hold the stream back
    res.flushHeaders()
    req.socket.setNoDelay(true)
    req.socket.setTimeout(0)
  }

  leave = await openViewer(String(req.params.leadId), {
    write(data) {
      if (ended) return 0
      open()
      res.write(data)
      return res.writableLength
    },
    close: finish,
  })
  // Open the response even when no bytes have arrived yet, so the player waits instead of failing.
  open()
  res.on('close', finish)
  res.on('error', finish)
}
