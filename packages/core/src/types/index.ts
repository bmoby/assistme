import type Anthropic from '@anthropic-ai/sdk';

// ============================================
// Task Types
// ============================================

export type TaskCategory = 'client' | 'student' | 'content' | 'personal' | 'dev' | 'team';
export type TaskPriority = 'urgent' | 'important' | 'normal' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done' | 'cancelled';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number | null;
  completed_at: string | null;
  source: string;
  related_id: string | null;
  related_type: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewTask = Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>;

// ============================================
// Daily Plan Types
// ============================================

export interface DailyPlanTask {
  task_id: string;
  title: string;
  category: TaskCategory;
  priority: TaskPriority;
  estimated_minutes: number | null;
  time_slot: 'urgent' | 'important' | 'optional';
  order: number;
}

export interface DailyPlan {
  id: string;
  date: string;
  plan: DailyPlanTask[];
  status: 'generated' | 'active' | 'completed';
  review: string | null;
  productivity_score: number | null;
  created_at: string;
}

// ============================================
// Student Types
// ============================================

export type StudentStatus = 'interested' | 'registered' | 'paid' | 'active' | 'completed' | 'dropped';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface Student {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  telegram_id: string | null;
  discord_id: string | null;
  session: number;
  status: StudentStatus;
  payment_status: PaymentStatus;
  payment_amount: number | null;
  payment_method: string | null;
  payment_details: Record<string, unknown> | null;
  pod_id: number | null;
  mentor_id: string | null;
  enrolled_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewStudent = Omit<Student, 'id' | 'created_at' | 'updated_at'>;

// ============================================
// Exercise Types
// ============================================

export type ExerciseStatus = 'submitted' | 'ai_reviewed' | 'reviewed' | 'approved' | 'revision_needed';
export type NewStudentExercise = Omit<StudentExercise, 'id' | 'created_at' | 'submitted_at' | 'ai_review' | 'manual_review' | 'reviewed_at' | 'feedback'>;

export interface StudentExercise {
  id: string;
  student_id: string;
  module: number;
  exercise_number: number;
  submission_url: string | null;
  submission_type: string;
  submitted_at: string;
  ai_review: Record<string, unknown> | null;
  manual_review: string | null;
  status: ExerciseStatus;
  reviewed_at: string | null;
  feedback: string | null;
  session_id: string | null;
  submission_count: number;
  review_history: ReviewHistoryEntry[];
  notification_message_id: string | null;
  created_at: string;
}

export interface ReviewHistoryEntry {
  reviewed_at: string;
  status: string;
  feedback: string | null;
  ai_review: Record<string, unknown> | null;
  submission_count: number;
}

// ============================================
// Client Types
// ============================================

export type ClientStatus = 'lead' | 'qualified' | 'proposal_sent' | 'accepted' | 'in_progress' | 'delivered' | 'paid';

export interface Client {
  id: string;
  name: string;
  phone: string | null;
  source: string;
  business_type: string | null;
  need: string | null;
  budget_range: string | null;
  status: ClientStatus;
  qualification_data: Record<string, unknown> | null;
  proposal_url: string | null;
  assigned_to: string | null;
  project_deadline: string | null;
  amount: number | null;
  commission_amount: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type NewClient = Omit<Client, 'id' | 'created_at' | 'updated_at'>;

// ============================================
// Team Member Types
// ============================================

export interface TeamMember {
  id: string;
  name: string;
  discord_id: string | null;
  telegram_id: string | null;
  phone: string | null;
  skills: Record<string, unknown> | null;
  availability: 'available' | 'busy' | 'unavailable';
  current_project_id: string | null;
  total_projects: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// Message Log Types
// ============================================

export type MessageCategory = 'client' | 'student' | 'social' | 'technical' | 'vip' | 'unknown';
export type Platform = 'instagram' | 'tiktok' | 'telegram' | 'whatsapp' | 'discord';

export interface MessageLog {
  id: string;
  platform: Platform;
  sender_name: string | null;
  sender_id: string | null;
  message_text: string;
  category: MessageCategory | null;
  auto_response: string | null;
  requires_manual: boolean;
  handled: boolean;
  handled_at: string | null;
  created_at: string;
}

// ============================================
// Content Types
// ============================================

export type ContentStatus = 'idea' | 'researched' | 'scripted' | 'filmed' | 'published';

export interface ContentIdea {
  id: string;
  title: string;
  topic: string | null;
  angle: string | null;
  type: 'educational' | 'demo' | 'storytelling' | 'tutorial';
  platform: 'instagram' | 'tiktok' | 'both';
  key_points: string[] | null;
  status: ContentStatus;
  published_at: string | null;
  published_url: string | null;
  engagement: Record<string, unknown> | null;
  created_at: string;
}

// ============================================
// Habit Types
// ============================================

export interface Habit {
  id: string;
  date: string;
  wake_up_time: string | null;
  sleep_time: string | null;
  work_start: string | null;
  work_end: string | null;
  sport_done: boolean;
  sport_duration: number | null;
  tasks_completed: number;
  tasks_total: number;
  mood: number | null;
  notes: string | null;
  created_at: string;
}

// ============================================
// Memory Tier Types
// ============================================

export type MemoryTier = 'core' | 'working' | 'archival';

// ============================================
// Reminder Types
// ============================================

export type RepeatType = 'once' | 'daily' | 'weekly' | 'custom';

export interface Reminder {
  id: string;
  message: string;
  trigger_at: string;
  repeat: RepeatType;
  repeat_config: Record<string, unknown> | null;
  channel: 'telegram' | 'discord';
  status: 'active' | 'sent' | 'cancelled';
  task_id: string | null;
  created_at: string;
}

// ============================================
// Public Knowledge Types
// ============================================

export type PublicKnowledgeCategory = 'formation' | 'services' | 'faq' | 'free_courses' | 'general';

export interface PublicKnowledge {
  id: string;
  category: PublicKnowledgeCategory;
  key: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// FAQ Entry Types (Formation)
// ============================================

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  times_used: number;
  created_by: string;
  created_at: string;
}

// ============================================
// Formation Event Types (Inter-bot communication)
// ============================================

export type FormationEventType =
  | 'exercise_submitted'
  | 'exercise_reviewed'
  | 'student_alert'
  | 'announcement'
  | 'daily_exercise_digest';

// ============================================
// Session Types (Formation)
// ============================================

export type SessionStatus = 'draft' | 'published' | 'completed';

export interface Session {
  id: string;
  session_number: number;
  module: number;
  title: string;
  description: string | null;
  pre_session_video_url: string | null;
  replay_url: string | null;
  exercise_title: string | null;
  exercise_description: string | null;
  expected_deliverables: string | null;
  exercise_tips: string | null;
  deadline: string | null;
  discord_thread_id: string | null;
  live_at: string | null;
  live_url: string | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

// ============================================
// Submission Attachment Types
// ============================================

export type AttachmentType = 'url' | 'file' | 'text' | 'image';

export interface SubmissionAttachment {
  id: string;
  exercise_id: string;
  type: AttachmentType;
  url: string | null;
  storage_path: string | null;
  original_filename: string | null;
  mime_type: string | null;
  file_size: number | null;
  text_content: string | null;
  created_at: string;
}

export interface FormationEvent {
  id: string;
  type: string;
  source: string;
  target: string | null;
  data: Record<string, unknown>;
  processed: boolean;
  created_at: string;
}

// ============================================
// Formation Knowledge Types
// ============================================

export type FormationKnowledgeContentType =
  | 'lesson_plan'
  | 'concept'
  | 'exercise'
  | 'research'
  | 'pedagogical_note'
  | 'setup_guide';

export interface FormationKnowledge {
  id: string;
  session_number: number | null;
  module: number;
  content_type: FormationKnowledgeContentType;
  title: string;
  content: string;
  tags: string[];
  source_file: string;
  created_at: string;
  updated_at: string;
}

// ============================================
// Tsarag Agent Types
// ============================================

export interface AdminConversationMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.Messages.ContentBlockParam[];
}

export interface DiscordActionCallbacks {
  sendAnnouncement: (text: string, mentionStudents: boolean) => Promise<void>;
  sendToSessionsForum: (sessionNumber: number, title: string, content: string, module: number) => Promise<string | null>;
  dmStudent: (discordId: string, message: string) => Promise<boolean>;
  archiveForumThread: (threadId: string) => Promise<void>;
  unarchiveForumThread: (threadId: string) => Promise<void>;
}

export interface PendingAction {
  type: string;
  params: Record<string, unknown>;
  summary: string;
  id: string;
}

export interface TsaragAgentContext {
  messages: AdminConversationMessage[];
  attachmentsInfo?: string;
  discordActions: DiscordActionCallbacks;
  pendingAction: PendingAction | null;
  executedActionIds: Set<string>;
}

export interface TsaragAgentResponse {
  text: string;
  actionsPerformed: string[];
  /** New action proposed by the agent — store in conversation state */
  proposedAction: PendingAction | null;
  /** Whether the existing pending action was consumed (executed) */
  pendingConsumed: boolean;
  /** Full conversation messages from this turn (tool_use + tool_result + final text) */
  turnMessages: AdminConversationMessage[];
  /** ID of the action executed this turn (for idempotency tracking) */
  executedActionId: string | null;
}
