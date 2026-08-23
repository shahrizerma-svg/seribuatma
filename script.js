const chapters = window.CHAPTERS;

const nav = document.querySelector('#chapter-nav');
const chapterContainer = document.querySelector('#chapters');
const progressLabel = document.querySelector('#progress-label');

chapters.forEach((chapter, index) => {
  const id = `chapter-${index + 1}`;
  nav.insertAdjacentHTML('beforeend', `
    <li class="spine-item">
      <button type="button" role="tab" id="tab-${index + 1}" aria-controls="${id}" aria-selected="${index === 0}" data-chapter="${index}">
        <span class="spine-seal" aria-hidden="true">${index + 1}</span>
        <span class="spine-label">Bab ${index + 1}</span>
      </button>
    </li>`);
  chapterContainer.insertAdjacentHTML('beforeend', `
    <article class="chapter" id="${id}" role="tabpanel" aria-labelledby="tab-${index + 1}" ${index === 0 ? '' : 'hidden'}>
      <div class="chapter-number">Bab ${String(index + 1).padStart(2, '0')}</div>
      <h2>${chapter.title}</h2>
      ${chapter.text.map(p => `<p>${p}</p>`).join('')}
      <div class="chapter-end"><span class="seal" aria-hidden="true">✦</span>Tamat bab ${index + 1}</div>
    </article>`);
});

function updateProgressLabel(index) {
  if (progressLabel) progressLabel.innerHTML = `Bab <strong>${index + 1}</strong> / ${chapters.length}`;
}

function showChapter(index, scroll = true) {
  document.querySelectorAll('.chapter').forEach((chapter, chapterIndex) => chapter.hidden = chapterIndex !== index);
  document.querySelectorAll('[role="tab"]').forEach((tab, tabIndex) => tab.setAttribute('aria-selected', tabIndex === index));
  updateProgressLabel(index);
  if (scroll) document.querySelector(`#chapter-${index + 1}`).scrollIntoView();
}
nav.addEventListener('click', event => {
  const tab = event.target.closest('[data-chapter]');
  if (tab) showChapter(Number(tab.dataset.chapter));
});
document.querySelector('#start-reading').addEventListener('click', () => showChapter(0));
document.querySelector('#year').textContent = new Date().getFullYear();
updateProgressLabel(0);

const form = document.querySelector('#review-form');
const list = document.querySelector('#review-list');
const status = document.querySelector('#review-status');
const reviewCount = document.querySelector('#review-count');
const escapeHtml = value => value.replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[character]));

function renderReviews(reviews) {
  if (reviewCount) reviewCount.textContent = reviews.length ? `${reviews.length} ulasan` : '';
  list.innerHTML = reviews.length
    ? reviews.map(item => `
        <article class="review">
          <div class="review-top">
            <span class="seal" aria-hidden="true">${escapeHtml(item.name || '?').trim().charAt(0).toUpperCase() || '?'}</span>
            <cite>${escapeHtml(item.name)}</cite>
          </div>
          <p class="review-text">“${escapeHtml(item.review)}”</p>
        </article>`).join('')
    : '<p class="empty">Belum ada ulasan. Jadilah pembaca pertama yang meninggalkan ulasan.</p>';
}

async function loadReviews() {
  try {
    const response = await fetch('/api/reviews');
    if (!response.ok) throw new Error();
    renderReviews(await response.json());
  } catch {
    list.innerHTML = '<p class="empty">Ulasan belum dapat dimuatkan. Sila cuba semula sebentar lagi.</p>';
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const data = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true; status.textContent = 'Menghantar ulasan…';
  try {
    const response = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.get('name').trim(), review: data.get('review').trim() }) });
    if (!response.ok) throw new Error();
    form.reset(); status.textContent = 'Terima kasih! Ulasan anda kini dipaparkan.';
    await loadReviews();
  } catch {
    status.textContent = 'Ulasan tidak dapat dihantar. Sila cuba semula.';
  } finally { submitButton.disabled = false; }
});
loadReviews();
