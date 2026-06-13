import React from 'react';
import { TaskState } from '../../types';
import { t } from '../../utils/i18n';

interface StatusDisplayProps {
  state: TaskState | null;
}

export default function StatusDisplay({ state }: StatusDisplayProps) {
  if (!state) return null;

  return (
    <div className="text-sm text-gray-600 space-y-1 bg-white p-3 rounded border border-gray-100 mb-4">
      <div>{t('status_label')}: <span className={state.running ? 'text-green-600 font-semibold' : 'text-gray-500'}>{state.running ? t('status_running') : t('status_stopped')}</span></div>
      <div>{t('processed_count')}: <span className="font-medium">{state.processedCount} {t('people_unit')}</span></div>
      {state.lastRunResult && (
        <div className="text-xs text-gray-400">{t('last_run')}: {t('success')} {state.lastRunResult.success}，{t('failed')} {state.lastRunResult.failed}</div>
      )}
    </div>
  );
}
