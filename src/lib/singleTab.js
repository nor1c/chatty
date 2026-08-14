const LOCK_NAME = 'shinkuchat-single-tab'
const ELECTION_DELAY_MS = 200

function claimWithWebLocks() {
  let releaseLock
  const holdLock = new Promise((resolve) => { releaseLock = resolve })

  return new Promise((resolve) => {
    navigator.locks.request(LOCK_NAME, { ifAvailable: true }, async (lock) => {
      if (!lock) {
        resolve({ acquired: false, release: () => {} })
        return
      }

      resolve({ acquired: true, release: releaseLock })
      await holdLock
    }).catch(() => resolve(null))
  })
}

function claimWithBroadcastChannel() {
  const channel = new BroadcastChannel(LOCK_NAME)
  const tabId = crypto.randomUUID()
  const candidates = new Set([tabId])
  let occupied = false
  let active = false
  let released = false

  channel.onmessage = ({ data }) => {
    if (!data || data.sender === tabId) return

    if (data.type === 'probe' && active) {
      channel.postMessage({ type: 'occupied', sender: tabId, target: data.sender })
    } else if (data.type === 'occupied' && data.target === tabId) {
      occupied = true
    } else if (data.type === 'candidate' && !active) {
      candidates.add(data.sender)
    }
  }

  channel.postMessage({ type: 'probe', sender: tabId })
  channel.postMessage({ type: 'candidate', sender: tabId })

  return new Promise((resolve) => {
    window.setTimeout(() => {
      active = !occupied && [...candidates].sort()[0] === tabId
      if (!active) channel.close()

      resolve({
        acquired: active,
        release: () => {
          if (released) return
          released = true
          active = false
          channel.close()
        },
      })
    }, ELECTION_DELAY_MS)
  })
}

export async function claimSingleTab() {
  if ('locks' in navigator) {
    const webLock = await claimWithWebLocks()
    if (webLock) return webLock
  }

  if ('BroadcastChannel' in window) return claimWithBroadcastChannel()

  // Very old browsers cannot provide a reliable cross-tab lifetime lock.
  // Fail closed so they cannot silently corrupt synchronized storage.
  return { acquired: false, release: () => {} }
}
