export function extractTagsFromProfile(profileElement: HTMLElement): string[] {
  const tagContainer = profileElement.querySelector('[data-testid="UserDescription"]')?.parentElement;
  if (!tagContainer) return [];

  const tags: string[] = [];
  const spans = tagContainer.querySelectorAll('span');
  spans.forEach((span) => {
    const text = span.textContent?.trim();
    if (text && text.length > 0 && text.length < 20) {
      tags.push(text);
    }
  });
  return Array.from(new Set(tags));
}

export function findUserCardElements(): HTMLElement[] {
  const timelineLabels = [
    '时间线：关注者',
    '时间线：认证关注者',
    'Timeline: Followers',
    'Timeline: Verified followers'
  ];

  let timelineContainer: HTMLElement | null = null;

  for (const label of timelineLabels) {
    const el = document.querySelector(`[aria-label="${label}"], [aria-label*="${label}"]`) as HTMLElement;
    if (el) {
      timelineContainer = el;
      break;
    }
  }

  if (timelineContainer) {
    // 限制只在粉丝/关注者时间线容器内部寻找用户卡片
    return Array.from(timelineContainer.querySelectorAll('[data-testid="UserCell"]')) as HTMLElement[];
  }

  // 兜底：如果未找到特定容器，回退到全局查找
  return Array.from(document.querySelectorAll('[data-testid="UserCell"]')) as HTMLElement[];
}
