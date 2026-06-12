import { extractTagsFromProfile, findUserCardElements } from '../utils/tag-extractor';
import { getSettings, saveUserTags, getTaskState, saveTaskState } from '../utils/storage';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_BATCH') {
    executeBatch().then(sendResponse);
    return true;
  }
});

async function executeBatch() {
  const settings = await getSettings();
  const cards = findUserCardElements();
  let processed = 0;
  let success = 0;
  let failed = 0;

  for (const card of cards) {
    if (processed >= settings.batchSize) break;

    const tags = extractTagsFromProfile(card);
    const usernameEl = card.querySelector('[data-testid="UserCell"] a[href^="/"]');
    const username = usernameEl?.textContent?.trim() || '';

    const hasMatch = settings.enabledTags.length === 0 ||
      tags.some(tag => settings.enabledTags.includes(tag));

    if (!hasMatch) continue;

    const followBtn = card.querySelector('[data-testid$="follow"]') as HTMLButtonElement;
    if (followBtn && followBtn.textContent?.includes('关注')) {
      followBtn.click();
      success++;
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1500));
    } else {
      failed++;
    }
    processed++;
  }

  const state = await getTaskState();
  state.processedCount += success;
  state.lastRunResult = { success, failed, timestamp: Date.now() };
  await saveTaskState(state);

  return { success, failed };
}
