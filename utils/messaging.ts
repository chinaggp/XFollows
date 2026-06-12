import { BackgroundMessage } from '../types';

export function sendToBackground(message: BackgroundMessage): Promise<any> {
  return chrome.runtime.sendMessage(message);
}

export function sendToContent(tabId: number, message: any): Promise<any> {
  return chrome.tabs.sendMessage(tabId, message);
}
