// Helpers mínimos de DOM compartilhados por todos os jogos.
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}

export const starStr = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(max - n);

export function toast(msg, ms = 1600) {
  let box = document.querySelector('.toasts');
  if (!box) { box = h('div', { class: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: 'toast' }, msg);
  box.append(t);
  setTimeout(() => t.classList.add('out'), ms);
  setTimeout(() => t.remove(), ms + 400);
}

/** Diálogo modal. actions: [{label, primary?, onClick?}]. Retorna {close}. */
export function modal({ title, body, actions = [], dismissable = false }) {
  const close = () => back.remove();
  const back = h('div', { class: 'modal-backdrop', role: 'dialog', 'aria-modal': 'true', onClick: (e) => { if (dismissable && e.target === back) close(); } },
    h('div', { class: 'modal' },
      title && h('h2', null, title),
      body && h('div', { class: 'modal-body' }, body),
      h('div', { class: 'modal-actions' }, actions.map((a) => h('button', { class: `btn ${a.primary ? 'primary' : ''}`, onClick: () => { close(); a.onClick?.(); } }, a.label)))));
  document.body.append(back);
  back.querySelector('.btn.primary, .btn')?.focus();
  return { close };
}
