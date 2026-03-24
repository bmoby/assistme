import type { Session } from '@assistme/core';

let seq = 0;

export function resetSeq(): void {
  seq = 0;
}

export function createSession(overrides: Partial<Session> = {}): Session {
  const id = seq++;
  return {
    id: `session-${id}`,
    session_number: id,
    module: 1,
    title: `Test Session ${id}`,
    description: null,
    pre_session_video_url: null,
    replay_url: null,
    exercise_title: null,
    exercise_description: null,
    expected_deliverables: null,
    exercise_tips: null,
    deadline: null,
    discord_thread_id: null,
    live_at: null,
    live_url: null,
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}
