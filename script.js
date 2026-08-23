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

/* ---------------- Reviews ---------------- */

const form = document.querySelector('#review-form');
const list = document.querySelector('#review-list');
const status = document.querySelector('#review-status');
const reviewCount = document.querySelector('#review-count');
const escapeHtml = value => (value || '').replace(/[&<>'"]/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' }[character]));

const MY_REVIEWS_KEY = 'myReviewTokens';

function getMyReviewTokens() {
  try {
    return JSON.parse(localStorage.getItem(MY_REVIEWS_KEY)) || {};
  } catch {
    return {};
  }
}
function saveMyReviewToken(id, editToken) {
  const mine = getMyReviewTokens();
  mine[id] = editToken;
  localStorage.setItem(MY_REVIEWS_KEY, JSON.stringify(mine));
}
function forgetMyReviewToken(id) {
  const mine = getMyReviewTokens();
  delete mine[id];
  localStorage.setItem(MY_REVIEWS_KEY, JSON.stringify(mine));
}

function reviewCardHtml(item, isMine) {
  const initial = escapeHtml((item.name || '?').trim().charAt(0).toUpperCase() || '?');
  const actions = isMine ? `
    <div class="review-actions">
      <button type="button" class="review-edit" data-id="${item.id}">Edit</button>
      <button type="button" class="review-delete" data-id="${item.id}">Padam</button>
    </div>` : '';
  return `
    <article class="review" data-review-id="${item.id}">
      <div class="review-top">
        <span class="seal" aria-hidden="true">${initial}</span>
        <cite>${escapeHtml(item.name)}</cite>
      </div>
      <p class="review-text">“${escapeHtml(item.review)}”</p>
      ${actions}
    </article>`;
}

function renderReviews(reviews) {
  const mine = getMyReviewTokens();
  if (reviewCount) reviewCount.textContent = reviews.length ? `${reviews.length} ulasan` : '';
  list.innerHTML = reviews.length
    ? reviews.map(item => reviewCardHtml(item, Boolean(mine[item.id]))).join('')
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
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: data.get('name').trim(), review: data.get('review').trim() })
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (result?.id && result?.editToken) saveMyReviewToken(result.id, result.editToken);
    form.reset(); status.textContent = 'Terima kasih! Ulasan anda kini dipaparkan.';
    await loadReviews();
  } catch {
    status.textContent = 'Ulasan tidak dapat dihantar. Sila cuba semula.';
  } finally { submitButton.disabled = false; }
});

// Delegate clicks for Edit / Padam / Simpan / Batal buttons rendered inside #review-list
list.addEventListener('click', async event => {
  const editBtn = event.target.closest('.review-edit');
  const deleteBtn = event.target.closest('.review-delete');
  const saveBtn = event.target.closest('.review-save');
  const cancelBtn = event.target.closest('.review-cancel');

  if (editBtn) {
    const card = editBtn.closest('.review');
    const id = editBtn.dataset.id;
    const currentName = card.querySelector('cite').textContent;
    const currentText = card.querySelector('.review-text').textContent.replace(/^“|”$/g, '');
    card.innerHTML = `
      <form class="review-edit-form" data-id="${id}">
        <label>Nama anda</label>
        <input type="text" name="name" maxlength="50" value="${escapeHtml(currentName)}" required />
        <label>Ulasan anda</label>
        <textarea name="review" rows="4" maxlength="1000" required>${escapeHtml(currentText)}</textarea>
        <div class="review-actions">
          <button type="submit" class="review-save">Simpan</button>
          <button type="button" class="review-cancel">Batal</button>
        </div>
        <p class="review-edit-status" aria-live="polite"></p>
      </form>`;
    return;
  }

  if (cancelBtn) {
    await loadReviews();
    return;
  }

  if (deleteBtn) {
    const id = deleteBtn.dataset.id;
    const mine = getMyReviewTokens();
    const editToken = mine[id];
    if (!editToken) return;
    if (!confirm('Padam ulasan ini?')) return;
    try {
      const response = await fetch('/api/reviews', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, editToken })
      });
      if (!response.ok) throw new Error();
      forgetMyReviewToken(id);
      await loadReviews();
    } catch {
      alert('Ulasan tidak dapat dipadam. Sila cuba semula.');
    }
    return;
  }
});

list.addEventListener('submit', async event => {
  const editForm = event.target.closest('.review-edit-form');
  if (!editForm) return;
  event.preventDefault();
  const id = editForm.dataset.id;
  const mine = getMyReviewTokens();
  const editToken = mine[id];
  const statusEl = editForm.querySelector('.review-edit-status');
  const data = new FormData(editForm);
  if (!editToken) return;
  statusEl.textContent = 'Menyimpan…';
  try {
    const response = await fetch('/api/reviews', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, editToken, name: data.get('name').trim(), review: data.get('review').trim() })
    });
    if (!response.ok) throw new Error();
    await loadReviews();
  } catch {
    statusEl.textContent = 'Tidak dapat menyimpan. Sila cuba semula.';
  }
});

loadReviews();
