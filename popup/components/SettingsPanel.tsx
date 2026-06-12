import React, { useState, useEffect } from 'react';
import { Settings } from '../../types';
import { getSettings, saveSettings } from '../../utils/storage';
import TagFilter from './TagFilter';
import StatusDisplay from './StatusDisplay';

export default function SettingsPanel() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const updateSetting = async (key: keyof Settings, value: any) => {
    if (!settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await saveSettings(newSettings);
  };

  if (!settings) return <div>Loading...</div>;

  return (
    <div className="w-80 p-4 bg-gray-50">
      <h1 className="text-xl font-bold mb-4">XFollows</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium">回关间隔 (分钟)</label>
        <input
          type="number"
          value={settings.intervalMinutes}
          onChange={(e) => updateSetting('intervalMinutes', parseInt(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium">每次数量</label>
        <input
          type="number"
          value={settings.batchSize}
          onChange={(e) => updateSetting('batchSize', parseInt(e.target.value))}
          className="w-full p-2 border rounded"
        />
      </div>

      <TagFilter
        enabledTags={settings.enabledTags}
        onChange={(tags) => updateSetting('enabledTags', tags)}
      />

      <StatusDisplay />

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'START_TASK' })}
          className="flex-1 bg-blue-500 text-white p-2 rounded"
        >
          开始自动
        </button>
        <button
          onClick={() => chrome.runtime.sendMessage({ type: 'STOP_TASK' })}
          className="flex-1 bg-gray-500 text-white p-2 rounded"
        >
          停止
        </button>
      </div>
    </div>
  );
}
