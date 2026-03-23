export interface SpeechProviderModel {
  id: string
  object?: string
  owned_by?: string
}

export interface SpeechProviderConfigInput {
  baseUrl: string
  token: string
}

const SPEECH_MODEL_PRIORITY_PATTERNS = [
  /gpt-4o-mini-transcribe/i,
  /gpt-4o-transcribe/i,
  /\bwhisper\b/i,
  /transcribe/i,
  /speech[-_ ]?to[-_ ]?text/i,
  /\bstt\b/i,
  /\basr\b/i,
]

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '')
}

function getSpeechModelPriority(modelId: string): number {
  const index = SPEECH_MODEL_PRIORITY_PATTERNS.findIndex((pattern) => pattern.test(modelId))
  return index === -1 ? SPEECH_MODEL_PRIORITY_PATTERNS.length : index
}

export async function listSpeechProviderModels(
  config: SpeechProviderConfigInput,
): Promise<SpeechProviderModel[]> {
  const baseUrl = normalizeBaseUrl(config.baseUrl)
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(body || `Model list request failed (${response.status})`)
  }

  const json = await response.json() as { data?: SpeechProviderModel[] }
  const models = Array.isArray(json.data) ? json.data : []

  return models
    .filter((model) => typeof model.id === 'string' && model.id.trim().length > 0)
    .sort((a, b) => {
      const priorityDiff = getSpeechModelPriority(a.id) - getSpeechModelPriority(b.id)
      if (priorityDiff !== 0) {
        return priorityDiff
      }

      return a.id.localeCompare(b.id)
    })
}
