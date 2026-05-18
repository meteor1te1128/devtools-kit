/* ===========================
   DevTools Kit — main.js
   Public logic: usage limits, upgrade modal, toast, Stripe
   =========================== */

const DTK = (() => {
  /* ---------- Config ---------- */
  const DAILY_LIMIT   = 10;               // free uses per tool per day
  const STRIPE_LINK = 'https://buy.stripe.com/4gM28q4RW7dx3ho5TJc3m00';

  /* ---------- Storage helpers ---------- */
  function getUsage(toolId) {
    const key  = `dtk_usage_${toolId}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const today = new Date().toISOString().slice(0, 10);
    if (data.date !== today) return 0;
    return data.count || 0;
  }

  function incUsage(toolId) {
    const key  = `dtk_usage_${toolId}`;
    const today = new Date().toISOString().slice(0, 10);
    const count = getUsage(toolId) + 1;
    localStorage.setItem(key, JSON.stringify({ date: today, count }));
    return count;
  }

  /* ---------- Pro check ---------- */
  function isPro() {
    // Basic client-side check. In production, validate server-side.
    const token = localStorage.getItem('dtk_pro_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }

  /* ---------- Try use — returns true if allowed ---------- */
  function tryUse(toolId) {
    if (isPro()) return true;
    const used = getUsage(toolId);
    if (used < DAILY_LIMIT) {
      incUsage(toolId);
      updateUsageUI(toolId);
      return true;
    }
    showUpgradeModal();
    return false;
  }

  /* ---------- Usage UI ---------- */
  function updateUsageUI(toolId) {
    const used  = getUsage(toolId);
    const left  = Math.max(DAILY_LIMIT - used, 0);
    const pct   = (used / DAILY_LIMIT) * 100;

    const countEl = document.getElementById('usage-count');
    const barEl   = document.getElementById('usage-bar');
    const noteEl  = document.getElementById('usage-note');

    if (countEl) countEl.textContent = left;
    if (barEl) {
      barEl.style.width = pct + '%';
      barEl.classList.toggle('warn', pct >= 80);
    }
    if (noteEl) {
      if (left === 0) {
        noteEl.textContent = 'Daily limit reached. Upgrade for unlimited access.';
      } else if (left <= 3) {
        noteEl.textContent = `Only ${left} free ${left === 1 ? 'use' : 'uses'} left today.`;
      } else {
        noteEl.textContent = 'Free plan · resets at midnight.';
      }
    }
    if (isPro()) {
      const widget = document.querySelector('.usage-widget');
      if (widget) {
        widget.innerHTML = '<div class="usage-title">Plan</div><div style="color:var(--accent);font-family:var(--font-head);font-size:18px;font-weight:800">✦ Pro — Unlimited</div>';
      }
    }
  }

  /* ---------- Toast ---------- */
  function toast(msg, isError = false) {
    let el = document.getElementById('dtk-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'dtk-toast';
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast' + (isError ? ' error' : '');
    // force reflow
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------- Upgrade modal ---------- */
  function showUpgradeModal() {
    let overlay = document.getElementById('upgrade-modal');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'upgrade-modal';
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `
        <div class="modal" style="position:relative">
          <button class="modal-close" onclick="document.getElementById('upgrade-modal').classList.remove('open')">✕</button>
          <div style="font-size:36px;margin-bottom:16px">🔒</div>
          <h2>Daily limit reached</h2>
          <p>You've used all <strong>${DAILY_LIMIT} free operations</strong> for today. Upgrade to Pro for unlimited access, no ads, and priority support — for just <strong>$2.99/month</strong>.</p>
          <a href="${STRIPE_LINK}" target="_blank" class="btn btn-primary" style="width:100%;justify-content:center;margin-bottom:12px;">
            ✦ Upgrade to Pro — $2.99/mo
          </a>
          <div style="text-align:center;font-size:12px;color:var(--text-dim)">Free limit resets at midnight · Cancel anytime</div>
        </div>
      `;
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('open');
      });
      document.body.appendChild(overlay);
    }
    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  /* ---------- Copy helper ---------- */
  function copyText(text) {
    navigator.clipboard.writeText(text)
      .then(() => toast('Copied to clipboard!'))
      .catch(() => {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        toast('Copied!');
      });
  }

  /* ---------- Init ---------- */
  function init(toolId) {
    // Set up upgrade buttons
    document.querySelectorAll('[data-upgrade]').forEach(el => {
      el.addEventListener('click', showUpgradeModal);
    });
    // Initial UI render
    updateUsageUI(toolId);
  }

  return { tryUse, isPro, updateUsageUI, toast, copyText, showUpgradeModal, init, STRIPE_LINK };
})();
