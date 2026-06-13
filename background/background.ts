import { getSettings, getTaskState, saveTaskState } from '../utils/storage';
import { BackgroundMessage, Settings } from '../types';

chrome.runtime.onInstalled.addListener(() => {
  console.log('XFollows installed');
  
  // 设定点击插件图标直接拉起 Side Panel 侧边栏
  if (chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error) => console.error('Failed to set side panel behavior:', error));
  }
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
  await chrome.alarms.clear('xfollows-alarm');
  chrome.alarms.create('xfollows-alarm', {
    periodInMinutes: settings.intervalMinutes,
  });
  const state = await getTaskState();
  state.running = true;
  state.nextRunTime = Date.now() + settings.intervalMinutes * 60 * 1000;
  await saveTaskState(state);
  
  // 立即触发一次自动执行
  await triggerBatchExecution();
  return { success: true };
}

async function stopTask() {
  await chrome.alarms.clear('xfollows-alarm');
  const state = await getTaskState();
  state.running = false;
  state.nextRunTime = null;
  await saveTaskState(state);
  return { success: true };
}

async function updateSettings(settings: Settings) {
  const state = await getTaskState();
  if (state.running) {
    await chrome.alarms.clear('xfollows-alarm');
    chrome.alarms.create('xfollows-alarm', {
      periodInMinutes: settings.intervalMinutes,
    });
    state.nextRunTime = Date.now() + settings.intervalMinutes * 60 * 1000;
    await saveTaskState(state);
  }
  return { success: true };
}

async function triggerBatchExecution() {
  try {
    const tabs = await chrome.tabs.query({ active: true, url: ['https://x.com/*', 'https://twitter.com/*'] });
    if (tabs.length > 0 && tabs[0].id) {
      await chrome.tabs.sendMessage(tabs[0].id, { type: 'EXECUTE_BATCH' });
    }
  } catch (e) {
    console.warn('Failed to send message to active tab:', e);
  }
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'xfollows-alarm') {
    // 每次触发自动执行后，可以重新计算并更新下一次执行时间
    const settings = await getSettings();
    const state = await getTaskState();
    if (state.running) {
      state.nextRunTime = Date.now() + settings.intervalMinutes * 60 * 1000;
      await saveTaskState(state);
    }
    await triggerBatchExecution();
  }
});
