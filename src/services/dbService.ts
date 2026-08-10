import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Note, Task, Category, Reminder, UserProfile, DailyGoal, GroupWorkspace, GroupMember, GroupTaskItem, GroupNoteItem, GroupChatMessage, GroupActivityItem, GroupCallSession, FinancialTransaction, BudgetGoal } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Utility function to recursively strip undefined properties so Firestore addDoc/updateDoc never fail
export function cleanFirestoreData<T extends Record<string, any>>(data: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        cleaned[key] = cleanFirestoreData(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map((item) =>
          item !== null && typeof item === 'object' ? cleanFirestoreData(item) : item
        );
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned;
}

// Default system categories to seed for new users
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'userId' | 'createdAt'>[] = [
  { name: 'Personal', color: 'emerald', icon: 'User', isSystem: true },
  { name: 'Work', color: 'blue', icon: 'Briefcase', isSystem: true },
  { name: 'Study', color: 'purple', icon: 'BookOpen', isSystem: true },
  { name: 'Important', color: 'rose', icon: 'Star', isSystem: true },
  { name: 'Other', color: 'amber', icon: 'Folder', isSystem: true },
];

// --- User Profile ---
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function createUserProfile(profile: UserProfile): Promise<void> {
  try {
    const docRef = doc(db, 'users', profile.uid);
    await setDoc(docRef, profile, { merge: true });
  } catch (error) {
    console.error('Error creating user profile:', error);
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  try {
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, updates, { merge: true });
  } catch (error) {
    console.error('Error updating user profile:', error);
  }
}

// --- Categories ---
export function subscribeCategories(userId: string, callback: (categories: Category[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'categories'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    async (snapshot) => {
      const categories: Category[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Category[];

      // If user has 0 categories, seed default categories automatically
      if (categories.length === 0) {
        await seedDefaultCategories(userId);
      } else {
        callback(categories);
      }
    },
    (error) => {
      console.error('Categories snapshot error:', error);
    }
  );
}

export async function seedDefaultCategories(userId: string): Promise<Category[]> {
  const createdCats: Category[] = [];
  const now = new Date().toISOString();

  for (const cat of DEFAULT_CATEGORIES) {
    try {
      const docRef = await addDoc(collection(db, 'categories'), {
        ...cat,
        userId,
        createdAt: now,
      });
      createdCats.push({
        id: docRef.id,
        userId,
        ...cat,
        createdAt: now,
      });
    } catch (e) {
      console.error('Failed to seed category:', cat.name, e);
    }
  }
  return createdCats;
}

export async function addCategory(userId: string, category: Omit<Category, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    ...category,
    userId,
    createdAt: now,
  });
  const docRef = await addDoc(collection(db, 'categories'), payload);
  return docRef.id;
}

export async function updateCategory(categoryId: string, updates: Partial<Category>): Promise<void> {
  const docRef = doc(db, 'categories', categoryId);
  await updateDoc(docRef, cleanFirestoreData(updates));
}

export async function deleteCategory(categoryId: string): Promise<void> {
  const docRef = doc(db, 'categories', categoryId);
  await deleteDoc(docRef);
}

// --- Notes ---
export function subscribeNotes(userId: string, callback: (notes: Note[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'notes'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notes: Note[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Note[];

      // Sort client-side by updated/pinned to avoid composite index requirements
      notes.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });

      callback(notes);
    },
    (error) => {
      console.error('Notes snapshot error:', error);
    }
  );
}

export async function addNote(userId: string, noteData: Omit<Note, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    ...noteData,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  const docRef = await addDoc(collection(db, 'notes'), payload);
  return docRef.id;
}

export async function updateNote(noteId: string, updates: Partial<Note>): Promise<void> {
  const docRef = doc(db, 'notes', noteId);
  const payload = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, payload);
}

export async function deleteNote(noteId: string): Promise<void> {
  const docRef = doc(db, 'notes', noteId);
  await deleteDoc(docRef);
}

// --- Tasks ---
export function subscribeTasks(userId: string, callback: (tasks: Task[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'tasks'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const tasks: Task[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Task[];

      // Sort client side
      tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      callback(tasks);
    },
    (error) => {
      console.error('Tasks snapshot error:', error);
    }
  );
}

export async function addTask(userId: string, taskData: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    ...taskData,
    userId,
    createdAt: now,
    updatedAt: now,
  });
  const docRef = await addDoc(collection(db, 'tasks'), payload);
  return docRef.id;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
  const docRef = doc(db, 'tasks', taskId);
  const payload = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, payload);
}

export async function deleteTask(taskId: string): Promise<void> {
  const docRef = doc(db, 'tasks', taskId);
  await deleteDoc(docRef);
}

// --- Daily Goals ---
export function subscribeDailyGoals(userId: string, callback: (goals: DailyGoal[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'daily_goals'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const goals: DailyGoal[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as DailyGoal[];

      goals.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(goals);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'daily_goals');
    }
  );
}

export async function addDailyGoal(userId: string, title: string): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'daily_goals'), {
    title,
    userId,
    completed: false,
    streak: 0,
    createdAt: now,
  });
  return docRef.id;
}

export async function updateDailyGoal(goalId: string, updates: Partial<DailyGoal>): Promise<void> {
  const docRef = doc(db, 'daily_goals', goalId);
  await updateDoc(docRef, updates);
}

export async function deleteDailyGoal(goalId: string): Promise<void> {
  const docRef = doc(db, 'daily_goals', goalId);
  await deleteDoc(docRef);
}

export function subscribeReminders(userId: string, callback: (reminders: Reminder[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'reminders'),
    where('userId', '==', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const reminders: Reminder[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Reminder[];

      reminders.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

      callback(reminders);
    },
    (error) => {
      console.error('Reminders snapshot error:', error);
    }
  );
}

export async function addReminder(userId: string, reminderData: Omit<Reminder, 'id' | 'userId' | 'createdAt'>): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(collection(db, 'reminders'), {
    ...reminderData,
    userId,
    createdAt: now,
  });
  return docRef.id;
}

export async function updateReminder(reminderId: string, updates: Partial<Reminder>): Promise<void> {
  const docRef = doc(db, 'reminders', reminderId);
  await updateDoc(docRef, updates);
}

export async function deleteReminder(reminderId: string): Promise<void> {
  const docRef = doc(db, 'reminders', reminderId);
  await deleteDoc(docRef);
}

// --- Group Workspaces & Collaboration ---

export function subscribeWorkspaces(userId: string, callback: (workspaces: GroupWorkspace[]) => void): Unsubscribe {
  // We subscribe to all group_workspaces and filter client-side for workspaces
  // where the user is owner OR a member
  const qWorkspaces = query(collection(db, 'group_workspaces'));
  const qMembers = query(collection(db, 'group_members'), where('userId', '==', userId));

  let currentMemberships: GroupMember[] = [];
  let currentWorkspaces: GroupWorkspace[] = [];

  const updateAndEmit = () => {
    const validWorkspaceIds = new Set(
      currentMemberships
        .filter((m) => m.status === 'accepted' || m.status === 'pending')
        .map((m) => m.workspaceId)
    );

    const userWorkspaces = currentWorkspaces.filter(
      (w) => w.ownerId === userId || validWorkspaceIds.has(w.id)
    );

    userWorkspaces.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(userWorkspaces);
  };

  const unsubMembers = onSnapshot(qMembers, (snap) => {
    currentMemberships = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupMember[];
    updateAndEmit();
  }, (err) => console.error('Error fetching group members:', err));

  const unsubWorkspaces = onSnapshot(qWorkspaces, (snap) => {
    currentWorkspaces = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupWorkspace[];
    updateAndEmit();
  }, (err) => console.error('Error fetching group workspaces:', err));

  return () => {
    unsubMembers();
    unsubWorkspaces();
  };
}

export async function createGroupWorkspace(
  userId: string,
  userEmail: string,
  userName: string,
  name: string,
  description?: string
): Promise<string> {
  const now = new Date().toISOString();
  // Generate random 6 character uppercase invite code (e.g. GRP92X)
  const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
  const inviteCode = `GRP${randomChars}`;

  const wsRef = await addDoc(collection(db, 'group_workspaces'), {
    name,
    description: description || '',
    ownerId: userId,
    ownerEmail: userEmail,
    ownerName: userName,
    inviteCode,
    createdAt: now,
  });

  // Automatically add owner as accepted member
  await addDoc(collection(db, 'group_members'), {
    workspaceId: wsRef.id,
    userId,
    userEmail,
    displayName: userName || userEmail.split('@')[0],
    role: 'owner',
    status: 'accepted',
    joinedAt: now,
  });

  return wsRef.id;
}

export async function joinGroupWorkspaceByCode(
  userId: string,
  userEmail: string,
  displayName: string,
  inviteCode: string
): Promise<{ success: boolean; message: string; workspaceId?: string }> {
  try {
    const cleanCode = inviteCode.trim().toUpperCase();
    const q = query(collection(db, 'group_workspaces'), where('inviteCode', '==', cleanCode));
    const snap = await getDocs(q);

    if (snap.empty) {
      return { success: false, message: 'Invalid invite code. Please check and try again.' };
    }

    const wsDoc = snap.docs[0];
    const workspaceId = wsDoc.id;
    const wsData = wsDoc.data() as GroupWorkspace;

    // Check if user is already owner
    if (wsData.ownerId === userId) {
      return { success: true, message: 'You are the owner of this Group Task space!', workspaceId };
    }

    // Check existing membership
    const qMem = query(
      collection(db, 'group_members'),
      where('workspaceId', '==', workspaceId),
      where('userId', '==', userId)
    );
    const memSnap = await getDocs(qMem);

    if (!memSnap.empty) {
      const existingStatus = memSnap.docs[0].data().status;
      if (existingStatus === 'accepted') {
        return { success: true, message: 'You are already an accepted member of this group!', workspaceId };
      }
      if (existingStatus === 'pending') {
        return { success: true, message: 'Your join request is currently pending admin acceptance.', workspaceId };
      }
      if (existingStatus === 'rejected') {
        return { success: false, message: 'Your join request for this group was previously declined.' };
      }
    }

    // Submit join request with pending status
    const now = new Date().toISOString();
    await addDoc(collection(db, 'group_members'), {
      workspaceId,
      userId,
      userEmail,
      displayName: displayName || userEmail.split('@')[0],
      role: 'member',
      status: 'pending',
      joinedAt: now,
    });

    return {
      success: true,
      message: 'Join request submitted! Awaiting workspace host acceptance.',
      workspaceId,
    };
  } catch (error) {
    console.error('Error joining group workspace:', error);
    return { success: false, message: 'An error occurred while joining. Please try again.' };
  }
}

export function subscribeGroupMembers(workspaceId: string, callback: (members: GroupMember[]) => void): Unsubscribe {
  const q = query(collection(db, 'group_members'), where('workspaceId', '==', workspaceId));
  return onSnapshot(
    q,
    (snap) => {
      const members: GroupMember[] = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupMember[];
      members.sort((a, b) => (a.role === 'owner' ? -1 : 1));
      callback(members);
    },
    (err) => console.error('Error in subscribeGroupMembers:', err)
  );
}

export async function acceptGroupMember(memberId: string): Promise<void> {
  const docRef = doc(db, 'group_members', memberId);
  await updateDoc(docRef, { status: 'accepted' });
}

export async function rejectGroupMember(memberId: string): Promise<void> {
  const docRef = doc(db, 'group_members', memberId);
  await updateDoc(docRef, { status: 'rejected' });
}

export async function removeGroupMember(memberId: string): Promise<void> {
  const docRef = doc(db, 'group_members', memberId);
  await deleteDoc(docRef);
}

export async function deleteGroupWorkspace(workspaceId: string): Promise<void> {
  const docRef = doc(db, 'group_workspaces', workspaceId);
  await deleteDoc(docRef);
}

// --- Group Tasks ---

export function subscribeGroupTasks(workspaceId: string, callback: (tasks: GroupTaskItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'group_tasks'), where('workspaceId', '==', workspaceId));
  return onSnapshot(
    q,
    (snap) => {
      const tasks: GroupTaskItem[] = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupTaskItem[];
      tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(tasks);
    },
    (err) => console.error('Error in subscribeGroupTasks:', err)
  );
}

export async function addGroupTask(
  workspaceId: string,
  taskData: Omit<GroupTaskItem, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt' | 'acceptanceStatus'>
): Promise<string> {
  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    ...taskData,
    workspaceId,
    acceptanceStatus: taskData.assigneeId ? 'pending' : 'accepted',
    createdAt: now,
    updatedAt: now,
  });
  const docRef = await addDoc(collection(db, 'group_tasks'), payload);
  return docRef.id;
}

export async function updateGroupTask(taskId: string, updates: Partial<GroupTaskItem>): Promise<void> {
  const docRef = doc(db, 'group_tasks', taskId);
  const payload = cleanFirestoreData({
    ...updates,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, payload);
}

export async function deleteGroupTask(taskId: string): Promise<void> {
  const docRef = doc(db, 'group_tasks', taskId);
  await deleteDoc(docRef);
}

// --- Group Notes ---

export function subscribeGroupNotes(workspaceId: string, callback: (notes: GroupNoteItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'group_notes'), where('workspaceId', '==', workspaceId));
  return onSnapshot(
    q,
    (snap) => {
      const notes: GroupNoteItem[] = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupNoteItem[];
      notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(notes);
    },
    (err) => console.error('Error in subscribeGroupNotes:', err)
  );
}

export async function addGroupNote(
  workspaceId: string,
  noteData: Omit<GroupNoteItem, 'id' | 'workspaceId' | 'createdAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    ...noteData,
    workspaceId,
    createdAt: now,
  });
  const docRef = await addDoc(collection(db, 'group_notes'), payload);
  return docRef.id;
}

export async function deleteGroupNote(noteId: string): Promise<void> {
  const docRef = doc(db, 'group_notes', noteId);
  await deleteDoc(docRef);
}

// --- Group Chat Messages ---

export function subscribeGroupChat(workspaceId: string, callback: (messages: GroupChatMessage[]) => void): Unsubscribe {
  const q = query(collection(db, 'group_chat'), where('workspaceId', '==', workspaceId));
  return onSnapshot(
    q,
    (snap) => {
      const messages: GroupChatMessage[] = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupChatMessage[];
      messages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(messages);
    },
    (err) => console.error('Error in subscribeGroupChat:', err)
  );
}

export async function sendGroupChatMessage(
  workspaceId: string,
  msgData: Omit<GroupChatMessage, 'id' | 'workspaceId' | 'createdAt'>
): Promise<string> {
  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    ...msgData,
    workspaceId,
    createdAt: now,
  });
  const docRef = await addDoc(collection(db, 'group_chat'), payload);

  // Log activity
  await logGroupActivity(workspaceId, {
    type: 'message',
    actorName: msgData.senderName,
    details: `Sent a message in group chat`,
  });

  return docRef.id;
}

export async function toggleGroupChatMessageReaction(
  messageId: string,
  emoji: string,
  userId: string,
  currentReactions: { [emoji: string]: string[] } = {}
): Promise<void> {
  const docRef = doc(db, 'group_chat', messageId);
  const updatedReactions = { ...currentReactions };
  const userList = updatedReactions[emoji] ? [...updatedReactions[emoji]] : [];
  
  if (userList.includes(userId)) {
    // Remove reaction
    const filtered = userList.filter((u) => u !== userId);
    if (filtered.length === 0) {
      delete updatedReactions[emoji];
    } else {
      updatedReactions[emoji] = filtered;
    }
  } else {
    // Add reaction
    updatedReactions[emoji] = [...userList, userId];
  }

  await updateDoc(docRef, cleanFirestoreData({ reactions: updatedReactions }));
}

export async function deleteGroupChatMessage(messageId: string): Promise<void> {
  const docRef = doc(db, 'group_chat', messageId);
  await deleteDoc(docRef);
}

export async function updateGroupChatMessage(
  messageId: string,
  data: Partial<GroupChatMessage>
): Promise<void> {
  const docRef = doc(db, 'group_chat', messageId);
  await updateDoc(
    docRef,
    cleanFirestoreData({ ...data, isEdited: true, editedAt: new Date().toISOString() })
  );
}

export async function clearAllGroupChatMessages(workspaceId: string): Promise<void> {
  const q = query(collection(db, 'group_chat'), where('workspaceId', '==', workspaceId));
  const snap = await getDocs(q);
  const deletePromises = snap.docs.map((docSnap) => deleteDoc(doc(db, 'group_chat', docSnap.id)));
  await Promise.all(deletePromises);
}

// --- Group Activity Log ---

export function subscribeGroupActivity(workspaceId: string, callback: (activities: GroupActivityItem[]) => void): Unsubscribe {
  const q = query(collection(db, 'group_activities'), where('workspaceId', '==', workspaceId));
  return onSnapshot(
    q,
    (snap) => {
      const activities: GroupActivityItem[] = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as GroupActivityItem[];
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      callback(activities);
    },
    (err) => console.error('Error in subscribeGroupActivity:', err)
  );
}

export async function logGroupActivity(
  workspaceId: string,
  actData: Omit<GroupActivityItem, 'id' | 'workspaceId' | 'createdAt'>
): Promise<void> {
  try {
    const now = new Date().toISOString();
    const payload = cleanFirestoreData({
      ...actData,
      workspaceId,
      createdAt: now,
    });
    await addDoc(collection(db, 'group_activities'), payload);
  } catch (err) {
    console.error('Failed to log group activity:', err);
  }
}

// --- Group Real-time Calling & Ringing Signaling ---

export async function startGroupCallSession(
  workspaceId: string,
  workspaceName: string,
  callerId: string,
  callerName: string,
  callType: 'video' | 'audio' | 'screen'
): Promise<string> {
  const now = new Date().toISOString();
  const payload = cleanFirestoreData({
    workspaceId,
    workspaceName,
    callerId,
    callerName,
    callType,
    status: 'ringing',
    participants: [callerId],
    declinedBy: [],
    startedAt: now,
  });

  try {
    const docRef = await addDoc(collection(db, 'group_calls'), payload);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'group_calls');
    throw error;
  }
}

export function subscribeActiveGroupCalls(
  workspaceId: string,
  callback: (calls: GroupCallSession[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'group_calls'),
    where('workspaceId', '==', workspaceId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const calls: GroupCallSession[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as GroupCallSession[];
      // Filter active or ringing calls
      const activeCalls = calls.filter((c) => c.status === 'ringing' || c.status === 'active');
      callback(activeCalls);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, 'group_calls');
    }
  );
}

export async function acceptGroupCallSession(callId: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'group_calls', callId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as GroupCallSession;
    const currentParts = data.participants || [];
    if (!currentParts.includes(userId)) {
      const updatedParts = [...currentParts, userId];
      await updateDoc(docRef, cleanFirestoreData({
        participants: updatedParts,
        status: 'active',
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `group_calls/${callId}`);
  }
}

export async function declineGroupCallSession(callId: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'group_calls', callId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return;

    const data = snap.data() as GroupCallSession;
    const declinedBy = data.declinedBy || [];
    if (!declinedBy.includes(userId)) {
      await updateDoc(docRef, cleanFirestoreData({
        declinedBy: [...declinedBy, userId],
      }));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `group_calls/${callId}`);
  }
}

export async function endGroupCallSession(callId: string): Promise<void> {
  try {
    const docRef = doc(db, 'group_calls', callId);
    await updateDoc(docRef, cleanFirestoreData({
      status: 'ended',
      endedAt: new Date().toISOString(),
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `group_calls/${callId}`);
  }
}

// WebRTC Signaling Helpers for Group Calls
export async function sendGroupCallSignal(
  callId: string,
  signal: {
    senderId: string;
    receiverId: string;
    type: 'offer' | 'answer' | 'candidate' | 'screen_status';
    sdp?: string;
    candidate?: string;
    isScreen?: boolean;
  }
): Promise<void> {
  try {
    const signalsRef = collection(db, 'group_calls', callId, 'signals');
    await addDoc(signalsRef, {
      ...signal,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `group_calls/${callId}/signals`);
  }
}

export function subscribeGroupCallSignals(
  callId: string,
  currentUserId: string,
  callback: (signal: any) => void
): Unsubscribe {
  const signalsRef = collection(db, 'group_calls', callId, 'signals');
  const q = query(signalsRef, where('receiverId', '==', currentUserId));

  return onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          callback({ id: change.doc.id, ...change.doc.data() });
        }
      });
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `group_calls/${callId}/signals`);
    }
  );
}

export async function updateGroupCallScreenSharer(
  callId: string,
  screenSharerUserId: string | null,
  screenSharerName?: string | null
): Promise<void> {
  try {
    const docRef = doc(db, 'group_calls', callId);
    await updateDoc(docRef, cleanFirestoreData({
      screenSharerUserId,
      screenSharerName,
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `group_calls/${callId}`);
  }
}

// --- Financial Transactions (Expenses & Income) ---
export function subscribeTransactions(
  userId: string,
  callback: (transactions: FinancialTransaction[]) => void
): Unsubscribe {
  const colRef = collection(db, 'transactions');
  const q = query(colRef, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as FinancialTransaction)
      );
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    }
  );
}

export async function addTransaction(
  userId: string,
  data: Omit<FinancialTransaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string | null> {
  try {
    const colRef = collection(db, 'transactions');
    const now = new Date().toISOString();
    const docRef = await addDoc(
      colRef,
      cleanFirestoreData({
        ...data,
        userId,
        createdAt: now,
        updatedAt: now,
      })
    );
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'transactions');
    return null;
  }
}

export async function updateTransaction(
  id: string,
  updates: Partial<FinancialTransaction>
): Promise<void> {
  try {
    const docRef = doc(db, 'transactions', id);
    await updateDoc(
      docRef,
      cleanFirestoreData({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `transactions/${id}`);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'transactions', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `transactions/${id}`);
  }
}

// --- Budget Goals ---
export function subscribeBudgets(
  userId: string,
  callback: (budgets: BudgetGoal[]) => void
): Unsubscribe {
  const colRef = collection(db, 'budgets');
  const q = query(colRef, where('userId', '==', userId));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as BudgetGoal)
      );
      callback(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'budgets');
    }
  );
}

export async function setBudgetGoal(
  userId: string,
  category: string,
  monthlyLimit: number,
  existingBudgetId?: string
): Promise<void> {
  try {
    const now = new Date().toISOString();
    if (existingBudgetId) {
      const docRef = doc(db, 'budgets', existingBudgetId);
      await updateDoc(
        docRef,
        cleanFirestoreData({
          category,
          monthlyLimit,
          updatedAt: now,
        })
      );
    } else {
      const colRef = collection(db, 'budgets');
      await addDoc(
        colRef,
        cleanFirestoreData({
          userId,
          category,
          monthlyLimit,
          month: 'all',
          createdAt: now,
          updatedAt: now,
        })
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'budgets');
  }
}

export async function deleteBudgetGoal(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'budgets', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `budgets/${id}`);
  }
}
