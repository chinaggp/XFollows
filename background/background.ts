import { getSettings, getTaskState, saveTaskState } from '../utils/storage';
import { BackgroundMessage } from '../types';

let currentAlarm: string | null = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('XFollows installed');
});

chrome.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true;
});

async function handleMessage(message: BackgroundMessage): Promise<any> {
  switch (message.type) {
    case 'START_TASK':
      return startTask();
    case 'STOP_TASK':
      return stopTask();
    case 'GET_STATUS':
      return getTaskState();
    case 'UPDATE_SETTINGS':
      return updateSettings(message.payload);
    default:
      return { error: 'Unknown message type' };
  }
}

async function startTask() {
  const settings = await getSettings();
  if (currentAlarm) {
    chrome.alarms.clear(currentAlarm);
  }
  currentAlarm = 'xfollows-alarm';
  chrome.alarms.create(currentAlarm, {
    periodInMinutes: settings.intervalMinutes,
  });
  const state = await getTaskState();
  state.running = true;
  state.nextRunTime = Date.now() + settings.intervalMinutes * 60 * 1000;
  await saveTaskState(state);
  return { success: true };
}

async function stopTask() {
  if (currentAlarm) {
    chrome.alarms.clear(currentAlarm);
    currentAlarm = null;
  }
  const state = await getTaskState();
  state.running = false;
  await saveTaskState(state);
  return { success: true };
}

async function updateSettings(settings: any) {
  // TODO: implement in Task 5
  return { success: true };
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'xfollows-alarm') {
    const tabs = await chrome.tabs.query({ active: true, url: ['https://x.com/*', 'https://twitter.com/*'] });
    if (tabs.length > 0 && tabs[0].id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: 'EXECUTE_BATCH' });
    }
  }
});
