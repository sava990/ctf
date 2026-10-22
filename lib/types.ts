export type Role = 'user' | 'admin'

export type Rombel = {
  id: string
  code: string
  team_name: string | null
  created_at: string
}

export type Profile = {
  id: string
  name: string
  rombel_id: string | null
  ktm_path: string | null
  role: Role
  is_banned: boolean
  ban_reason: string | null
  banned_at: string | null
  created_at: string
}

export type Settings = {
  id: number
  event_name: string
  start_at: string | null
  end_at: string | null
  max_attempts: number
  cooldown_seconds: number
  updated_at: string
}

export type Challenge = {
  id: string
  title: string
  category: string
  description: string
  hint: string | null
  attachment_url: string | null
  points: number
  is_visible: boolean
  created_at: string
}

export type Solve = {
  id: string
  challenge_id: string
  rombel_id: string
  user_id: string | null
  points: number
  created_at: string
}

export type AttemptState = {
  user_id: string
  challenge_id: string
  fail_count: number
  lockout_count: number
  locked_until: string | null
}

export type LeaderboardRow = {
  rombel_id: string
  code: string
  team_name: string | null
  score: number
  solve_count: number
  member_count: number
  last_solve_at: string | null
}

export type SubmitResult =
  | { status: 'correct'; points: number }
  | { status: 'incorrect'; remaining: number }
  | { status: 'locked'; locked_until: string }
  | {
      status:
        | 'already_solved'
        | 'not_started'
        | 'ended'
        | 'not_found'
        | 'invalid'
        | 'banned'
        | 'no_team'
        | 'unauthenticated'
        | 'error'
    }

export type CompetitionStatus = 'pending' | 'running' | 'ended'
