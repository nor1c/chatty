const trimSlash = (value) => value.replace(/\/+$/, '')

export function providerHeaders(provider) {
  const headers = { 'Content-Type': 'application/json', ...provider.headers }
  if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`
  return headers
}

async function errorMessage(response) {
  const body = await response.text()
  try {
    const parsed = JSON.parse(body)
    return parsed.error?.message || parsed.message || `${response.status} ${response.statusText}`
  } catch {
    return body.slice(0, 300) || `${response.status} ${response.statusText}`
  }
}

export async function fetchModels(provider, signal) {
  if (!provider.baseUrl) throw new Error('Base URL is required.')
  const response = await fetch(`${trimSlash(provider.baseUrl)}/models`, { headers: providerHeaders(provider), signal })
  if (!response.ok) throw new Error(await errorMessage(response))
  const json = await response.json()
  const data = Array.isArray(json) ? json : json.data
  if (!Array.isArray(data)) throw new Error('Unrecognized model list format.')
  return data.map((item) => typeof item === 'string' ? item : item.id).filter(Boolean).sort()
}

export function completionText(payload) {
  const content = payload?.choices?.[0]?.delta?.content
    ?? payload?.choices?.[0]?.message?.content
    ?? payload?.choices?.[0]?.text
    ?? payload?.delta?.text
    ?? payload?.content
    ?? payload?.text
    ?? ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((part) => typeof part === 'string' ? part : part?.text ?? part?.content ?? '').join('')
  if (typeof content?.text === 'string') return content.text
  return ''
}

export async function streamCompletion({ provider, model, messages, settings, signal, onToken }) {
  const response = await fetch(`${trimSlash(provider.baseUrl)}/chat/completions`, {
    method: 'POST', headers: providerHeaders(provider), signal,
    body: JSON.stringify({ model, messages, stream: true, temperature: settings.temperature, max_tokens: settings.maxTokens }),
  })
  if (!response.ok) throw new Error(await errorMessage(response))
  if (!response.body) throw new Error('The provider did not return a response stream.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const processLine = (line) => {
    const data = line.trim().replace(/^data:\s*/, '')
    if (!data || data === '[DONE]') return
    try {
      const json = JSON.parse(data)
      const token = completionText(json)
      if (token) onToken(token)
    } catch { /* ignore keep-alive and non-JSON SSE frames */ }
  }
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    lines.forEach(processLine)
  }
  buffer += decoder.decode()
  if (buffer.trim()) processLine(buffer)
}
