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
    const usernameEl = card.querySelector('a[href^="/"]');
    const href = usernameEl?.getAttribute('href') || '';
    const username = href.replace(/^\//, '') || usernameEl?.textContent?.trim() || '';

    const hasMatch = settings.enabledTags.length === 0 ||
      tags.some(tag => settings.enabledTags.includes(tag));

    if (!hasMatch) continue;

    const followBtn = card.querySelector('[data-testid$="follow"]') as HTMLButtonElement;
    if (!followBtn) {
      // 如果没有找到按钮，直接跳过
      continue;
    }

    const testId = followBtn.getAttribute('data-testid') || '';
    if (testId.endsWith('unfollow')) {
      // 如果是已关注状态的取消关注按钮，绝对跳过
      continue;
    }

    const btnText = followBtn.textContent?.trim() || '';
    const isAlreadyFollowing = btnText.includes('正在') || btnText.toLowerCase().includes('following') || btnText.toLowerCase().includes('unfollow');
    const hasFollowKeyword = btnText.includes('关') || btnText.toLowerCase().includes('follow');

    if (!isAlreadyFollowing && hasFollowKeyword) {
      followBtn.click();
      success++;

      if (username) {
        await saveUserTags({
          userId: username,
          username: username,
          tags: tags,
          lastUpdated: Date.now()
        });
      }

      const baseDelayMs = (settings.clickDelaySeconds || 2) * 1000;
      const randomizedDelay = baseDelayMs * 0.7 + Math.random() * (baseDelayMs * 0.6);
      await new Promise(r => setTimeout(r, randomizedDelay));
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
