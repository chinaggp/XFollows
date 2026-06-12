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
  return Array.from(document.querySelectorAll('[data-testid="UserCell"]')) as HTMLElement[];
}
