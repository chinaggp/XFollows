import { Settings, UserTags, TaskState } from '../types';

const DEFAULT_SETTINGS: Settings = {
  intervalMinutes: 30,
  batchSize: 10,
  enabledTags: [],
  language: 'zh',
  autoRun: true,
  clickDelaySeconds: 2,
};

export async function getSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get('settings');
  return result.settings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ settings });
}

export async function getUserTags(userId: string): Promise<UserTags | null> {
  const result = await chrome.storage.local.get('userTags');
  const allTags = result.userTags || {};
  return allTags[userId] || null;
}

export async function saveUserTags(userTags: UserTags): Promise<void> {
  const result = await chrome.storage.local.get('userTags');
  const allTags = result.userTags || {};
  allTags[userTags.userId] = userTags;
  await chrome.storage.local.set({ userTags: allTags });
}

export async function getTaskState(): Promise<TaskState> {
  const result = await chrome.storage.local.get('taskState');
  return result.taskState || { running: false, nextRunTime: null, processedCount: 0 };
}

export async function saveTaskState(state: TaskState): Promise<void> {
  await chrome.storage.local.set({ taskState: state });
}
