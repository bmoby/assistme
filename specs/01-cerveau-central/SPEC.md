# SPEC : Cerveau Central (Core)

## Vue d'ensemble
Le Cerveau Central est le package `core` du monorepo. Il contient toute la logique partagee : connexion a la base de donnees, client Claude API, moteur de priorisation, systeme de rappels et cron jobs.

C'est le "cerveau" : il ne parle a personne directement. Les bots (Telegram, Discord, Instagram) l'utilisent comme librairie.

---

## 1. Module : Database (`core/src/db/`)

### 1.1 Client Supabase
- Initialisation du client Supabase avec service role key
- Export des fonctions typees pour chaque table

### 1.2 Fonctions CRUD principales

#### Tasks
```typescript
createTask(task: NewTask): Promise<Task>
getTask(id: string): Promise<Task>
updateTask(id: string, updates: Partial<Task>): Promise<Task>
deleteTask(id: string): Promise<void>
getTasksByStatus(status: TaskStatus): Promise<Task[]>
getTasksByCategory(category: TaskCategory): Promise<Task[]>
getTasksDueToday(): Promise<Task[]>
getOverdueTasks(): Promise<Task[]>
getNextTask(): Promise<Task | null>  // La plus prioritaire non faite
completeTask(id: string): Promise<Task>
```

#### Daily Plans
```typescript
generateDailyPlan(date: Date): Promise<DailyPlan>
getDailyPlan(date: Date): Promise<DailyPlan | null>
updateDailyPlan(id: string, updates: Partial<DailyPlan>): Promise<DailyPlan>
```

#### Students
```typescript
getStudent(id: string): Promise<Student>
getStudentsBySession(session: number): Promise<Student[]>
getStudentsByStatus(status: StudentStatus): Promise<Student[]>
updateStudentProgress(id: string, updates: Partial<Student>): Promise<Student>
getStudentsWithPendingExercises(): Promise<Student[]>
```

#### Clients
```typescript
createClient(client: NewClient): Promise<Client>
getClient(id: string): Promise<Client>
getClientsByStatus(status: ClientStatus): Promise<Client[]>
getClientPipeline(): Promise<Client[]>  // Tous les clients actifs, tries par statut
updateClientStatus(id: string, status: ClientStatus): Promise<Client>
assignClientToMember(clientId: string, memberId: string): Promise<void>
```

#### Team Members
```typescript
getAvailableMembers(): Promise<TeamMember[]>
getMemberWorkload(id: string): Promise<{ member: TeamMember, projects: Client[] }>
```

#### Messages
```typescript
logMessage(message: NewMessage): Promise<MessageLog>
getUnhandledMessages(): Promise<MessageLog[]>
markAsHandled(id: string): Promise<void>
```

#### Habits
```typescript
logHabit(habit: NewHabit): Promise<Habit>
getHabitsForWeek(startDate: Date): Promise<Habit[]>
getHabitStreak(habitType: string): Promise<number>
```

---

## 2. Module : AI (`core/src/ai/`)

### 2.1 Client Claude API
```typescript
// Client generique
askClaude(params: {
  prompt: string
  systemPrompt?: string
  model?: 'sonnet' | 'opus'
  maxTokens?: number
}): Promise<string>
```

### 2.2 Fonctions IA specialisees

#### Priorisation
```typescript
// Genere le plan du jour en analysant toutes les taches, deadlines, contexte
generateDailyPlan(params: {
  tasks: Task[]
  overdueTasks: Task[]
  clients: Client[]
  studentsNeedingAttention: Student[]
  habits: Habit[]
  dayOfWeek: string
}): Promise<DailyPlan>
```

**System prompt de priorisation :**
```
Tu es l'assistant personnel de Magomed. Tu connais sa situation :
- Fenetre productive : 10h-15h (proteger absolument)
- Il fonctionne avec des objectifs concrets et des victoires rapides
- Il est motive par la peur de perdre quelque chose
- Il est paralyse quand il a trop de choix
- Il a besoin qu'on decide pour lui quand il hesite

Regles de priorisation :
1. URGENT + avec deadline proche = en premier
2. Les taches qui debloquent d'autres personnes (equipe, clients, etudiants)
3. Maximum 3 taches "rouges" par jour (sinon paralysie)
4. Toujours commencer par une tache rapide (<15 min) pour lancer la dynamique
5. Apres 15h : taches legeres (reponses, review, planification)
6. Integrer le sport si pas fait depuis 3+ jours
```

#### Classification de messages
```typescript
classifyMessage(params: {
  text: string
  senderName: string
  platform: string
}): Promise<{
  category: 'client' | 'student' | 'social' | 'technical' | 'vip' | 'unknown'
  confidence: number
  suggestedResponse: string
  requiresManual: boolean
}>
```

#### Recherche metier client
```typescript
researchClientBusiness(params: {
  businessType: string
  clientNeed: string
  additionalContext?: string
}): Promise<{
  industryOverview: string
  competitors: string[]
  suggestedFeatures: string[]
  technicalRecommendations: string
  estimatedBudget: string
}>
```

#### Generation de proposition
```typescript
generateProposal(params: {
  client: Client
  research: BusinessResearch
  teamMember?: TeamMember
}): Promise<{
  proposalText: string
  features: string[]
  timeline: string
  budgetBreakdown: string
}>
```

#### Pre-review de code/projet
```typescript
reviewStudentProject(params: {
  projectUrl: string
  exerciseRequirements: string
  studentLevel: string
}): Promise<{
  structureOk: boolean
  mainIssues: string[]
  suggestions: string[]
  score: number
  summary: string
}>
```

#### FAQ automatique
```typescript
answerFAQ(params: {
  question: string
  context: 'pre_sale' | 'student' | 'technical'
  knowledgeBase: string[]  // Reponses precedentes similaires
}): Promise<{
  answer: string
  confidence: number
  shouldEscalate: boolean
}>
```

---

## 3. Module : Scheduler (`core/src/scheduler/`)

### 3.1 Cron Jobs

| Job | Horaire | Action |
|-----|---------|--------|
| `morning-plan` | 08:30 tous les jours | Generer le plan du jour, envoyer sur Telegram |
| `midnight-reminder` | 00:00 tous les jours | Rappel coucher sur Telegram |
| `anti-procrastination` | 11:00 tous les jours | Si aucune tache completee -> rappel Telegram |
| `afternoon-check` | 15:00 tous les jours | Bilan mi-journee + ajuster les priorites |
| `evening-review` | 19:00 tous les jours | Resume de la journee, planifier demain |
| `content-weekly` | Lundi 10:00 | Suggerer des idees de contenu |
| `overdue-check` | Toutes les 2h | Verifier les taches en retard, alerter |
| `client-followup` | Tous les jours 10:00 | Clients en attente de reponse > 24h |
| `student-check` | Tous les jours 10:00 | Etudiants bloques depuis > 48h |
| `family-reminder` | Configurable | Rappel pour appeler parents/enfants |
| `sport-reminder` | Si pas fait depuis 3j | Rappel sport |

### 3.2 Systeme de rappels
```typescript
createReminder(params: {
  message: string
  triggerAt: Date
  repeat?: RepeatConfig
  channel: 'telegram' | 'discord'
  taskId?: string
}): Promise<Reminder>

processReminders(): Promise<void>  // Appele toutes les minutes par un cron
```

### 3.3 Event Bus (interne)
Systeme simple d'evenements pour connecter les modules :
```typescript
// Evenements emis
'task:created' -> Mettre a jour le plan du jour si urgent
'task:completed' -> Feliciter + donner la tache suivante
'client:new_lead' -> Notifier sur Telegram
'client:status_changed' -> Mettre a jour le pipeline
'student:exercise_submitted' -> Lancer pre-review IA
'student:stuck' -> Alerter sur Telegram
'message:received' -> Classifier + router
'habit:sport_done' -> Feliciter
'habit:no_sport_3days' -> Rappeler
```

---

## 4. Module : Types (`core/src/types/`)

### 4.1 Types partages
Toutes les interfaces TypeScript correspondant aux tables Supabase + les types metier.

```typescript
// Exemples
type TaskCategory = 'client' | 'student' | 'content' | 'personal' | 'dev' | 'team'
type TaskPriority = 'urgent' | 'important' | 'normal' | 'low'
type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done' | 'cancelled'
type ClientStatus = 'lead' | 'qualified' | 'proposal_sent' | 'accepted' | 'in_progress' | 'delivered' | 'paid'
type StudentStatus = 'interested' | 'registered' | 'paid' | 'active' | 'completed' | 'dropped'
// ... etc
```

---

## 5. Dependances principales
```json
{
  "@supabase/supabase-js": "^2.x",
  "@anthropic-ai/sdk": "latest",
  "node-cron": "^3.x",
  "zod": "^3.x",
  "pino": "^8.x"
}
```
