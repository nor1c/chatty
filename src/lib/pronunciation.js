export const PRONUNCIATION_LANGUAGES = [
  ['es', 'Spanish', 'Spain', 'es'], ['fr', 'French', 'France', 'fr'], ['de', 'German', 'Germany', 'de'],
  ['it', 'Italian', 'Italy', 'it'], ['pt', 'Portuguese', 'Portugal', 'pt'], ['ja', 'Japanese', 'Japan', 'jp'],
  ['ko', 'Korean', 'South Korea', 'kr'], ['zh', 'Mandarin Chinese', 'China', 'cn'], ['ar', 'Arabic', 'Saudi Arabia', 'sa'],
  ['hi', 'Hindi', 'India', 'in'], ['id', 'Indonesian', 'Indonesia', 'id'], ['nl', 'Dutch', 'Netherlands', 'nl'],
  ['ru', 'Russian', 'Russia', 'ru'], ['tr', 'Turkish', 'Türkiye', 'tr'], ['vi', 'Vietnamese', 'Vietnam', 'vn'],
  ['th', 'Thai', 'Thailand', 'th'], ['pl', 'Polish', 'Poland', 'pl'], ['sv', 'Swedish', 'Sweden', 'se'],
  ['el', 'Greek', 'Greece', 'gr'], ['he', 'Hebrew', 'Israel', 'il'], ['uk', 'Ukrainian', 'Ukraine', 'ua'],
  ['en-us', 'English (US)', 'United States', 'us'], ['en-gb', 'English (UK)', 'United Kingdom', 'gb'],
].map(([code, name, country, countryCode]) => ({ code, name, country, countryCode }))

export const VOICE_PREVIEW_TEXT = {
  es: 'Hola, así suena esta voz.', fr: 'Bonjour, voici un exemple de cette voix.', de: 'Hallo, so klingt diese Stimme.',
  it: 'Ciao, ecco un esempio di questa voce.', pt: 'Olá, este é um exemplo desta voz.', ja: 'こんにちは、この声のサンプルです。',
  ko: '안녕하세요. 이 목소리의 예시입니다.', zh: '你好，这是这个声音的示例。', ar: 'مرحباً، هذا مثال على هذا الصوت.',
  hi: 'नमस्ते, यह इस आवाज़ का एक उदाहरण है।', id: 'Halo, ini adalah contoh suara ini.', nl: 'Hallo, zo klinkt deze stem.',
  ru: 'Здравствуйте, это пример этого голоса.', tr: 'Merhaba, bu sesin bir örneğidir.', vi: 'Xin chào, đây là ví dụ về giọng nói này.',
  th: 'สวัสดี นี่คือตัวอย่างของเสียงนี้', pl: 'Cześć, oto przykład tego głosu.', sv: 'Hej, så här låter den här rösten.',
  el: 'Γεια σας, αυτό είναι ένα δείγμα αυτής της φωνής.', he: 'שלום, זו דוגמה לקול הזה.', uk: 'Вітаю, це приклад цього голосу.',
  'en-us': 'Hello, this is a sample of this voice.', 'en-gb': 'Hello, this is a sample of this voice.',
}

export const LANGUAGE_LOCALES = {
  es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT', pt: 'pt-PT', ja: 'ja-JP',
  ko: 'ko-KR', zh: 'zh-CN', ar: 'ar-SA', hi: 'hi-IN', id: 'id-ID', nl: 'nl-NL',
  ru: 'ru-RU', tr: 'tr-TR', vi: 'vi-VN', th: 'th-TH', pl: 'pl-PL', sv: 'sv-SE',
  el: 'el-GR', he: 'he-IL', uk: 'uk-UA', 'en-us': 'en-US', 'en-gb': 'en-GB',
}

export function pronunciationLocale(languageCode) {
  return LANGUAGE_LOCALES[languageCode] || languageCode || 'en-US'
}

export function matchingVoices(voices, languageCode) {
  const locale = pronunciationLocale(languageCode).toLowerCase()
  const base = locale.split('-')[0]
  const exact = voices.filter((voice) => voice.lang.toLowerCase() === locale)
  return exact.length ? exact : voices.filter((voice) => voice.lang.toLowerCase().split('-')[0] === base)
}

export function speakWord({ text, languageCode, voiceURI, rate = 1, onStart, onEnd, onError }) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
    throw new Error('Pronunciation is not supported by this browser.')
  }
  const synthesis = window.speechSynthesis
  const utterance = new window.SpeechSynthesisUtterance(text)
  const voices = synthesis.getVoices()
  const available = matchingVoices(voices, languageCode)
  utterance.lang = pronunciationLocale(languageCode)
  utterance.rate = Math.min(2, Math.max(0.5, Number(rate) || 1))
  utterance.voice = voices.find((voice) => voice.voiceURI === voiceURI) || available[0] || null
  utterance.onstart = onStart
  utterance.onend = onEnd
  utterance.onerror = (event) => onError?.(new Error(event.error === 'canceled' ? 'Pronunciation stopped.' : 'Could not play this pronunciation.'))
  synthesis.cancel()
  synthesis.speak(utterance)
  return () => synthesis.cancel()
}
