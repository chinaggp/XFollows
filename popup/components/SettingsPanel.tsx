import React, { useState, useEffect } from 'react';
import { Settings, TaskState } from '../../types';
import { getSettings, saveSettings, getTaskState } from '../../utils/storage';
import { t } from '../../utils/i18n';
import TagFilter from './TagFilter';
import StatusDisplay from './StatusDisplay';

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [taskState, setTaskState] = useState<TaskState | null>(null);

  const refreshTaskState = async () => {
    const state = await getTaskState();
    setTaskState(state);
  };

  useEffect(() => {
    getSettings().then(setSettings);
    refreshTaskState();
    
    // 每 5 秒自动刷新状态
    const interval = setInterval(refreshTaskState, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateSetting = async (key: keyof Settings, value: any) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
    await chrome.runtime.sendMessage({ type: 'UPDATE_SETTINGS', payload: newSettings });
  };

  const handleStart = async () => {
    await chrome.runtime.sendMessage({ type: 'START_TASK' });
    await refreshTaskState();
  };

  const handleStop = async () => {
    await chrome.runtime.sendMessage({ type: 'STOP_TASK' });
    await refreshTaskState();
  };

  if (!settings) return <div>{t('loading')}</div>;

  return (
    <div className="w-80 p-4 bg-gray-50">
      <h1 className="text-xl font-bold mb-4">XFollows</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium">{t('settings_interval')}</label>
        <input
          type="number"
          value={settings.intervalMinutes}
          onChange={(e) => updateSetting('intervalMinutes', parseInt(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">{t('settings_batchSize')}</label>
        <input
          type="number"
          value={settings.batchSize}
          onChange={(e) => updateSetting('batchSize', parseInt(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">{t('settings_clickDelay')}</label>
        <input
          type="number"
          min="1"
          value={settings.clickDelaySeconds || 2}
          onChange={(e) => updateSetting('clickDelaySeconds', parseInt(e.target.value) || 2)}
          className="w-full p-2 border rounded"
        />
      </div>

      <TagFilter
        enabledTags={settings.enabledTags}
        onChange={(tags) => updateSetting('enabledTags', tags)}
      />

      <StatusDisplay state={taskState} />

      <div className="mt-4 flex gap-2">
        <button
          onClick={handleStart}
          className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
        >
          {t('btn_start')}
        </button>
        <button
          onClick={handleStop}
          className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-colors"
        >
          {t('btn_stop')}
        </button>
      </div>
    </div>
  );
}
