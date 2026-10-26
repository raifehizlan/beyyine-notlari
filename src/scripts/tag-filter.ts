const params = new URLSearchParams(window.location.search);
const tag = params.get('etiket');
const banner = document.querySelector<HTMLElement>('[data-tag-banner]');
const empty = document.querySelector<HTMLElement>('[data-tag-empty]');

if (tag && banner) {
  banner.hidden = false;
  const name = banner.querySelector('[data-tag-name]');
  if (name) name.textContent = tag;

  const browse = document.querySelector<HTMLElement>('[data-browse]');
  const results = document.querySelector<HTMLElement>('[data-tag-results]');
  if (browse) browse.hidden = true;
  if (results) results.hidden = false;

  const scope = results ?? document;
  let visible = 0;
  scope.querySelectorAll<HTMLElement>('[data-tags]').forEach((card) => {
    const tags = (card.dataset.tags ?? '').split('|').filter(Boolean);
    const match = tags.includes(tag);
    card.hidden = !match;
    if (match) visible += 1;
  });
  if (empty) empty.hidden = visible !== 0;
}
