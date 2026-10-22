import type { CompetitionStatus, Settings } from './types'

export function competitionStatus(
  settings: Pick<Settings, 'start_at' | 'end_at'>,
  now = Date.now(),
): CompetitionStatus {
  if (!settings.start_at || new Date(settings.start_at).getTime() > now) return 'pending'
  if (settings.end_at && new Date(settings.end_at).getTime() <= now) return 'ended'
  return 'running'
}
