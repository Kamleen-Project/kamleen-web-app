import { NextResponse } from "next/server"

import { getServerAuthSession } from "@/lib/auth"
import { notificationsEmitter, sseHeaders, writeSse, listNotifications } from "@/lib/notifications"

export const runtime = "nodejs"

export async function GET() {
  const session = await getServerAuthSession()
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder()
      let isClosed = false

      // Send initial snapshot
      const snapshot = await listNotifications(session.user.id, 10)
      controller.enqueue(encoder.encode(writeSse({ type: "snapshot", ...snapshot })))

      const safeEnqueue = (chunk: string) => {
        if (isClosed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // Controller already closed
          isClosed = true
        }
      }

      const onNotify = (data: unknown) => {
        safeEnqueue(writeSse({ type: "notification", data }))
      }
      const onRead = (data: unknown) => {
        safeEnqueue(writeSse({ type: "read", data }))
      }
      const onPing = () => {
        safeEnqueue(": ping\n\n")
      }

      const notifyKey = `notify:${session.user.id}`
      const readKey = `read:${session.user.id}`
      notificationsEmitter.on(notifyKey, onNotify)
      notificationsEmitter.on(readKey, onRead)

      const pingInterval = setInterval(onPing, 30000)

      // Cleanup
      const close = () => {
        clearInterval(pingInterval)
        notificationsEmitter.off(notifyKey, onNotify)
        notificationsEmitter.off(readKey, onRead)
        try {
          controller.close()
        } catch {}
        isClosed = true
      }

      // Attach cleanup via reader cancel if supported by fetch/Next runtime
      // We cannot access an AbortSignal easily here; rely on cancel and GC.
    },
    cancel() {
      // Reader cancelled; nothing else to do because we clean up timers/listeners in close
    },
  })

  return new NextResponse(stream, {
    headers: sseHeaders(),
  })
}


