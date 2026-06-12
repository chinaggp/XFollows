import React, { useEffect, useState } from 'react';
import { TaskState } from '../../types';
import { getTaskState } from '../../utils/storage';

export default function StatusDisplay() {
  const [state, setState] = useState<TaskState | null>(null);

  useEffect(() => {
    getTaskState().then(setState);
    const interval = setInterval(() => getTaskState().then(setState), 5000);
    return () => clearInterval(interval);
  }, []);

  if (!state) return null;

  return (
    <div className="text-sm text-gray-600">
      <div>状态: {state.running ? '运行中' : '已停止'}</div>
      <div>已处理: {state.processedCount} 人</div>
      {state.lastRunResult && (
        <div>上次: 成功 {state.lastRunResult.success}，失败 {state.lastRunResult.failed}</div>
      )}
    </div>
  );
}
