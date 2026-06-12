export interface Settings {
  intervalMinutes: number;
  batchSize: number;
  enabledTags: string[];
  language: 'zh' | 'en';
  autoRun: boolean;
}

export interface UserTags {
  userId: string;
  username: string;
  tags: string[];
  manualTags?: string[];
  lastUpdated: number;
}

export interface TaskState {
  running: boolean;
  nextRunTime: number | null;
  processedCount: number;
  lastRunResult?: {
    success: number;
    failed: number;
    timestamp: number;
  };
}

export interface BackgroundMessage {
  type: 'START_TASK' | 'STOP_TASK' | 'GET_STATUS' | 'EXECUTE_BATCH' | 'UPDATE_SETTINGS';
  payload?: any;
}
