export type Priority = 'Low' | 'Medium' | 'High';
export type RecurringInterval = 'none' | 'daily' | 'weekly' | 'monthly';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  theme: 'light' | 'dark' | 'system';
  autoArchive7Days?: boolean;
  notificationPreferences: {
    emailAlerts: boolean;
    dueDateReminders: boolean;
    dailySummary: boolean;
  };
  createdAt: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string; // Tailwind color or hex
  icon?: string;
  isSystem?: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  isPinned: boolean;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
  completed: boolean;
  completedAt?: string; // ISO string when completed
  priority: Priority;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string;
  categoryId?: string;
  reminderDateTime?: string; // ISO string
  recurringInterval?: RecurringInterval;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyGoal {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  streak: number;
  lastCompletedDate?: string; // YYYY-MM-DD
  createdAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  dateTime: string; // ISO string
  taskId?: string;
  noteId?: string;
  completed: boolean;
  createdAt: string;
}

export interface FinancialTransaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string; // YYYY-MM-DD
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'upi' | 'other';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetGoal {
  id: string;
  userId: string;
  category: string;
  monthlyLimit: number;
  month?: string; // YYYY-MM or 'all'
  createdAt: string;
  updatedAt: string;
}

export type ActiveTab = 'dashboard' | 'trends' | 'notes' | 'tasks' | 'group_tasks' | 'expenses' | 'archive' | 'calendar' | 'reminders' | 'categories' | 'settings';

export interface GroupWorkspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  ownerEmail: string;
  ownerName?: string;
  inviteCode: string;
  createdAt: string;
}

export interface GroupMember {
  id: string;
  workspaceId: string;
  userId: string;
  userEmail: string;
  displayName: string;
  role: 'owner' | 'member';
  status: 'pending' | 'accepted' | 'rejected';
  joinedAt: string;
}

export interface ChatAttachment {
  name: string;
  url: string; // base64 or data URL
  type: 'image' | 'file' | 'audio';
  size?: string;
}

export interface TaskAuditLogEntry {
  id: string;
  action: string;
  userName: string;
  timestamp: string;
  details?: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  text: string;
  createdAt: string;
  isEdited?: boolean;
  editedAt?: string;
}

export interface GroupTaskItem {
  id: string;
  workspaceId: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  dueTime?: string;
  assigneeId?: string;
  assigneeEmail?: string;
  assigneeName?: string;
  acceptanceStatus: 'pending' | 'accepted' | 'declined';
  completed: boolean;
  completedAt?: string;
  subtasks?: { id: string; title: string; completed: boolean }[];
  attachments?: ChatAttachment[];
  auditLog?: TaskAuditLogEntry[];
  comments?: TaskComment[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
  updatedByName?: string;
}

export interface GroupNoteItem {
  id: string;
  workspaceId: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface GroupChatMessage {
  id: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  text: string;
  attachment?: ChatAttachment;
  reactions?: { [emoji: string]: string[] };
  audioDuration?: number;
  isEdited?: boolean;
  editedAt?: string;
  createdAt: string;
}

export interface GroupActivityItem {
  id: string;
  workspaceId: string;
  type: 'join' | 'task_create' | 'task_complete' | 'message' | 'note_create';
  actorName: string;
  details: string;
  createdAt: string;
}

export interface GroupCallSession {
  id: string;
  workspaceId: string;
  workspaceName?: string;
  callerId: string;
  callerName: string;
  callType: 'video' | 'audio' | 'screen';
  status: 'ringing' | 'active' | 'ended';
  participants: string[];
  declinedBy?: string[];
  screenSharerUserId?: string | null;
  screenSharerName?: string | null;
  startedAt: string;
  endedAt?: string;
}

export interface SearchResult {
  type: 'note' | 'task' | 'category';
  id: string;
  title: string;
  description?: string;
  categoryName?: string;
  date?: string;
  completed?: boolean;
  item: Note | Task | Category;
}
