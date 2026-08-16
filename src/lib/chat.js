const WELCOME_MESSAGES = [
  'Hello. Connect a provider, select a model, and start chatting.',
  'Halo. Hubungkan provider, pilih model, lalu mulai chat.',
  'Halo! Saya **Chatty**',
]

const isWelcomeMessage = (message) => message.role === 'assistant'
  && WELCOME_MESSAGES.some((welcome) => message.content?.startsWith(welcome))

const messageContent = (message) => {
  const content = String(message.content || '').trim()
  const quote = String(message.quote || '').trim()
  return quote ? `Context quote:\n${quote}\n\nMessage:\n${content}` : content
}

export function buildChatContext(messages) {
  const normalized = []

  messages
    .filter((message) => (message.role === 'user' || message.role === 'assistant') && !isWelcomeMessage(message))
    .map((message) => ({ role: message.role, content: messageContent(message) }))
    .filter((message) => message.content)
    .forEach((message) => {
      if (!normalized.length && message.role === 'assistant') return

      const previous = normalized.at(-1)
      if (previous?.role === message.role) {
        if (message.role === 'user') previous.content += `\n\n${message.content}`
        return
      }

      normalized.push({ ...message })
    })

  return normalized
}
