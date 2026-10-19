/* Outils gratuits : calculateurs et générateurs reconstruits à partir des widgets
   de getkanal.com/tools (src/lib/local-tools.ts, local-tools-extra.ts).
   Mêmes champs, mêmes valeurs par défaut, mêmes formules ; seul le rendu suit
   le système de la maquette (jetons de couleur, pastilles, mode sombre). */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Formats ---------- */
  const usd = (v, d = 2) => `$${v.toFixed(d)}`;
  const loc = (v, d = 0) => v.toLocaleString('en-US', { maximumFractionDigits: d });
  const money = (v) => v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const mult = (v) => `×${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const pct = (v, d) => v.toLocaleString('en-US', { style: 'percent', minimumFractionDigits: d, maximumFractionDigits: d });

  /* ---------- Blocs de résultat ---------- */
  const big = (value, label, tone = '') => `<div class="tl-big${tone ? ` is-${tone}` : ''}"><strong>${value}</strong><span>${label}</span></div>`;
  const metrics = (items) => `<div class="tl-metrics tl-metrics--${items.length}">${items.map(([v, l, tone]) =>
    `<div class="tl-metric${tone ? ` is-${tone}` : ''}"><strong>${v}</strong><span>${l}</span></div>`).join('')}</div>`;
  const note = (html, tone = 'info') => `<div class="tl-note is-${tone}">${html}</div>`;
  const ICON = { wa: '<svg aria-hidden="true"><use href="#logo-whatsapp" /></svg>', sms: '<svg aria-hidden="true"><use href="#logo-sms" /></svg>' };
  const COPY = '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="2" /><path d="M10.5 3.5v-.5a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5" /></svg>';
  const EXT = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 4H4.8A1.8 1.8 0 0 0 3 5.8v5.4A1.8 1.8 0 0 0 4.8 13h5.4a1.8 1.8 0 0 0 1.8-1.8V9.5M9 3h4v4M13 3 7.5 8.5" /></svg>';

  const copyText = (text, btn, done = 'Copied') => {
    const label = btn.dataset.label || btn.textContent;
    btn.dataset.label = label;
    const ok = () => { btn.classList.add('is-done'); btn.lastChild.textContent = done; setTimeout(() => { btn.classList.remove('is-done'); btn.lastChild.textContent = label; }, 1600); };
    try { navigator.clipboard.writeText(text).then(ok, ok); } catch (err) { ok(); }
  };
  const copyBtn = (cls, label) => `<button type="button" class="${cls}">${COPY}<span>${label}</span></button>`;

  const COUNTRIES = [['1', 'United States'], ['1', 'Canada'], ['44', 'United Kingdom'], ['33', 'France'], ['32', 'Belgium'], ['41', 'Switzerland'], ['34', 'Spain'], ['39', 'Italy'], ['49', 'Germany'], ['31', 'Netherlands'], ['351', 'Portugal'], ['353', 'Ireland'], ['212', 'Morocco'], ['213', 'Algeria'], ['216', 'Tunisia'], ['221', 'Senegal'], ['225', 'Ivory Coast'], ['237', 'Cameroon'], ['971', 'United Arab Emirates'], ['966', 'Saudi Arabia'], ['91', 'India'], ['55', 'Brazil'], ['52', 'Mexico'], ['54', 'Argentina'], ['57', 'Colombia'], ['61', 'Australia'], ['62', 'Indonesia'], ['234', 'Nigeria'], ['27', 'South Africa']];
  const countryField = { id: 'cc', label: 'Country', type: 'select', options: COUNTRIES.map(([c, n]) => [c, `${n} (+${c})`]), value: '1' };
  const phoneField = { id: 'num', label: 'Phone number', type: 'tel', placeholder: 'e.g. (212) 555 0142' };
  const e164 = (v) => {
    const dial = v.cc;
    let local = String(v.num || '').replace(/[^0-9]/g, '');
    if (dial && local.indexOf(dial) === 0 && local.length > dial.length) local = local.slice(dial.length);
    local = local.replace(/^0+/, '');
    return local ? dial + local : '';
  };

  /* ---------- Les outils ---------- */
  const TOOLS = {
    'profit-margin-calculator': {
      fields: [
        { id: 'cost', label: 'Product cost ($)', value: 25, min: 0, step: 0.01 },
        { id: 'price', label: 'Selling price ($)', value: 49.99, min: 0, step: 0.01 },
        { id: 'units', label: 'Monthly units sold', value: 200, min: 0 },
        { id: 'ship', label: 'Shipping cost per unit ($)', value: 3, min: 0, step: 0.01 },
      ],
      render(v) {
        const total = v.cost + v.ship, profit = v.price - total;
        const margin = v.price > 0 ? (profit / v.price) * 100 : 0;
        const markup = total > 0 ? (profit / total) * 100 : 0;
        const tone = margin >= 40 ? 'good' : margin >= 20 ? 'warn' : 'bad';
        const w = Math.min(Math.max(margin, 0), 100);
        return metrics([[`${margin.toFixed(1)}%`, 'Profit margin', margin >= 30 ? 'good' : ''], [`${markup.toFixed(1)}%`, 'Markup'], [usd(profit), 'Profit / unit']])
          + `<div class="tl-bar is-${tone}" role="img" aria-label="Profit margin ${margin.toFixed(0)}%"><i style="width:${w}%"><b>${margin.toFixed(0)}%</b></i></div>`;
      },
    },

    'customer-lifetime-value-calculator': {
      fields: [
        { id: 'aov', label: 'Average order value ($)', value: 80, min: 1 },
        { id: 'freq', label: 'Purchases per year', value: 3, min: 1, step: 0.1 },
        { id: 'life', label: 'Customer lifespan (years)', value: 2.5, min: 0.1, step: 0.1 },
        { id: 'margin', label: 'Profit margin (%)', value: 35, min: 1, max: 100 },
      ],
      render(v) {
        const aov = v.aov || 80, freq = v.freq || 3, life = v.life || 2.5, margin = v.margin || 35;
        const clv = aov * freq * life, clvProfit = clv * (margin / 100);
        return big(`$${loc(clv)}`, 'Customer lifetime value (revenue)', 'good')
          + metrics([[usd(clvProfit, 0), 'CLV (profit)'], [usd(clvProfit / 3, 0), 'Max CAC (3:1 ratio)'], [usd(aov * freq, 0), 'Annual revenue / customer']])
          + note(`<strong>How to read it:</strong> CLV grows with purchase frequency. With your inputs, each extra order per customer per year adds <strong>${usd(aov * life, 0)}</strong> to CLV in revenue. For the formula and worked examples, read our <a href="https://getkanal.com/blog/customer-lifetime-value" target="_blank" rel="noopener">guide to customer lifetime value</a>.`, 'good');
      },
    },

    'whatsapp-message-template-generator': {
      fields: [
        { id: 'type', label: 'Template type', type: 'select', value: 'cart', options: [['cart', 'Abandoned cart recovery'], ['promo', 'Promotional / flash sale'], ['order', 'Order confirmation'], ['welcome', 'Welcome message'], ['review', 'Review request'], ['restock', 'Back in stock']] },
        { id: 'brand', label: 'Brand name', type: 'text', value: 'Your Brand', placeholder: 'e.g. Kanal' },
        { id: 'product', label: 'Product name (optional)', type: 'text', placeholder: 'e.g. Summer Dress' },
        { id: 'discount', label: 'Discount/offer (optional)', type: 'text', placeholder: 'e.g. 15% off, Free shipping' },
      ],
      T: {
        cart: (b, p, d) => `Hey {{1}} \u{1F44B}\n\nYou left ${p || 'something amazing'} in your cart at ${b}.\n\n${d ? `Use code ${d} to get a special discount!\n\n` : ''}Complete your order before it sells out!\n\n[Complete My Order]`,
        promo: (b, p, d) => `\u{1F525} ${b} ${d || 'Special Offer'}\n\n${p ? `${p} is now available` : 'Check out our latest collection'}\n\n${d ? `Offer: ${d}\n\n` : ''}Shop now before it ends.\n\n[Shop Now]`,
        order: (b, p) => `✅ Order Confirmed — ${b}\n\nHi {{1}}, thanks for your order!\n\n${p ? `Item: ${p}\n` : ''}Order #{{2}}\n\nWe'll send tracking once it ships.\n\n[Track Order]`,
        welcome: (b, p, d) => `Welcome to ${b}! \u{1F44B}\n\nHi {{1}}, thanks for joining us.\n\n• Exclusive offers & early access\n• New product alerts\n• Priority support\n\n${d ? `Here's ${d} on your first order!\n\n` : ''}[Browse Collection]`,
        review: (b, p) => `Hi {{1}}! \u{1F49A}\n\nHow are you enjoying your ${p || 'recent purchase'} from ${b}?\n\nWe'd love your feedback — takes 30 seconds!\n\n[Leave a Review]`,
        restock: (b, p, d) => `Great news, {{1}}! \u{1F389}\n\n${p || 'The item you wanted'} is back in stock at ${b}.\n\n${d ? `Plus, get ${d} today only!\n\n` : ''}Grab it before it sells out.\n\n[Shop Now]`,
      },
      render(v, box) {
        const text = this.T[v.type](v.brand || 'Your Brand', v.product, v.discount);
        const btn = text.match(/\[(.+?)\]/);
        const display = text.replace(/\[.+?\]/g, '').trim();
        box.dataset.copy = display;
        return `<div class="tl-chat"><div class="tl-chat__bubble"><p>${esc(display).replace(/\n/g, '<br>')}</p><span class="tl-chat__time">9:41</span></div>`
          + (btn ? `<span class="tl-chat__btn">${EXT}${esc(btn[1])}</span>` : '') + '</div>'
          + `<div class="tl-actions">${copyBtn('btn btn--dark btn--nav tl-copy', 'Copy template')}<span class="tl-meta">Template follows Meta WhatsApp Business API guidelines</span></div>`;
      },
      bind(box) { box.addEventListener('click', (ev) => { const b = ev.target.closest('.tl-copy'); if (b) copyText(box.dataset.copy, b); }); },
    },

    'whatsapp-vs-sms-roi-calculator': {
      fields: [
        { id: 'carts', label: 'Monthly abandoned carts', value: 1000, min: 0 },
        { id: 'aov', label: 'Average order value ($)', value: 80, min: 1 },
        { id: 'sms', label: 'Cost per SMS ($)', value: 0.03, min: 0, step: 0.001 },
      ],
      render(v) {
        const carts = v.carts || 1000, aov = v.aov || 80, smsCost = v.sms || 0.03, waCost = 0.025;
        const waR = Math.round(carts * 0.96 * 0.20 * 0.08), waRev = waR * aov, waS = carts * waCost, waROAS = waS > 0 ? (waRev / waS).toFixed(1) : 0;
        const smsR = Math.round(carts * 0.98 * 0.07 * 0.03), smsRev = smsR * aov, smsS = carts * smsCost * 3, smsROAS = smsS > 0 ? (smsRev / smsS).toFixed(1) : 0;
        const card = (cls, icon, title, open, ctr, rec, rev, cost, roas) => `<div class="tl-vs__card tl-vs__card--${cls}"><div class="tl-vs__head"><span class="tl-vs__ico">${icon}</span><strong>${title}</strong></div><dl>`
          + `<div><dt>Open rate</dt><dd>${open}</dd></div><div><dt>CTR</dt><dd>${ctr}</dd></div><div><dt>Carts recovered</dt><dd>${rec.toLocaleString()}</dd></div>`
          + `<div><dt>Revenue</dt><dd class="is-good">$${rev.toLocaleString()}</dd></div><div><dt>Cost</dt><dd>$${cost.toFixed(0)}</dd></div><div><dt>ROAS</dt><dd>${roas}x</dd></div></dl></div>`;
        const diff = waRev - smsRev;
        return `<div class="tl-vs">${card('wa', ICON.wa, 'WhatsApp', '96%', '20%', waR, waRev, waS, waROAS)}${card('sms', ICON.sms, 'SMS', '98%', '7%', smsR, smsRev, smsS, smsROAS)}</div>`
          + note(diff > 0 ? `<strong>WhatsApp recovers $${diff.toLocaleString()} more/month</strong> (${waROAS}x vs ${smsROAS}x ROAS)` : 'SMS performs better for your metrics', diff > 0 ? 'good' : 'warn');
      },
    },

    'discount-code-generator': {
      fields: [
        { id: 'prefix', label: 'Prefix', type: 'text', value: 'KANAL', maxlength: 10, placeholder: 'e.g. SAVE, VIP, FLASH' },
        { id: 'len', label: 'Code length', type: 'select', value: '8', options: [['6', '6 characters'], ['8', '8 characters'], ['10', '10 characters']] },
        { id: 'count', label: 'Number of codes', type: 'select', value: '10', options: [['5', '5 codes'], ['10', '10 codes'], ['25', '25 codes'], ['50', '50 codes']] },
        { id: 'style', label: 'Style', type: 'select', value: 'UPPER', options: [['UPPER', 'Uppercase'], ['MIXED', 'Mixed case'], ['NUM', 'Numbers only']] },
      ],
      manual: 'Generate codes',
      render(v, box) {
        const chars = v.style === 'NUM' ? '0123456789' : v.style === 'MIXED' ? 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789' : 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const rand = (len) => { let s = ''; for (let i = 0; i < len; i += 1) s += chars[Math.floor(Math.random() * chars.length)]; return s; };
        const prefix = String(v.prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const codes = [], seen = new Set();
        while (codes.length < +v.count) { const c = (prefix ? `${prefix}-` : '') + rand(+v.len); if (!seen.has(c)) { seen.add(c); codes.push(c); } }
        box.dataset.copy = codes.join('\n');
        return `<div class="tl-codes">${codes.map((c) => `<button type="button" class="tl-code" data-code="${c}" title="Copy ${c}"><span>${c}</span></button>`).join('')}</div>`
          + `<div class="tl-actions">${copyBtn('btn btn--soft btn--nav tl-copy', 'Copy all codes')}</div>`;
      },
      bind(box) {
        box.addEventListener('click', (ev) => {
          const code = ev.target.closest('.tl-code');
          if (code) copyText(code.dataset.code, code, 'Copied');
          const all = ev.target.closest('.tl-copy');
          if (all) copyText(box.dataset.copy, all, 'All copied');
        });
      },
    },

    'inventory-turnover-ratio-calculator': {
      fields: [
        { id: 'cogs', label: 'Annual COGS ($)', value: 480000, min: 0, step: 1000 },
        { id: 'begin', label: 'Beginning inventory ($)', value: 60000, min: 0, step: 1000 },
        { id: 'end', label: 'Ending inventory ($)', value: 80000, min: 0, step: 1000 },
      ],
      render(v) {
        const avg = (v.begin + v.end) / 2, ratio = avg > 0 ? v.cogs / avg : 0, days = ratio > 0 ? 365 / ratio : 0;
        const sell = v.cogs > 0 ? (v.cogs / (v.cogs + v.end)) * 100 : 0;
        let tier, tone, msg;
        if (ratio >= 5 && ratio <= 10) { tier = 'Healthy'; tone = 'good'; msg = `Your stock is moving at a healthy pace. Inventory refreshes ${ratio.toFixed(1)}x per year: great for cash flow and product freshness.`; }
        else if (ratio > 10) { tier = 'Very fast'; tone = 'warn'; msg = 'Turnover is very high. You may be risking stockouts or leaving revenue on the table. Consider increasing safety stock and using <strong>back-in-stock WhatsApp alerts</strong> to capture lost demand.'; }
        else if (ratio >= 3) { tier = 'Slightly slow'; tone = 'warn'; msg = 'Turnover is below the e-commerce sweet spot. Try a WhatsApp <strong>flash sale</strong> or bundle slow movers with best sellers to accelerate sell-through.'; }
        else { tier = 'Overstocked'; tone = 'bad'; msg = 'Your inventory is moving slowly. Consider clearance campaigns, WhatsApp broadcasts with time-limited offers, and reviewing your buying cadence.'; }
        return metrics([[`${ratio.toFixed(2)}x`, 'Inventory turnover', tone === 'good' ? 'good' : ''], [days.toFixed(0), 'Days of inventory'], [`${sell.toFixed(0)}%`, 'Sell-through']])
          + note(`<strong>${tier}</strong>: ${msg}`, tone);
      },
    },

    'cpa-calculator': {
      fields: [
        { id: 'spend', label: 'Total marketing spend ($)', value: 5000, min: 0, step: 10 },
        { id: 'cust', label: 'New customers acquired', value: 150, min: 0 },
        { id: 'aov', label: 'Average order value ($)', value: 80, min: 0 },
        { id: 'margin', label: 'Profit margin (%)', value: 35, min: 0, max: 100 },
        { id: 'freq', label: 'Purchases per customer (lifetime)', value: 2.5, min: 1, step: 0.1 },
      ],
      render(v) {
        const freq = v.freq || 1, cpa = v.cust > 0 ? v.spend / v.cust : 0;
        const clvProfit = v.aov * freq * (v.margin / 100), maxCpa = clvProfit / 3, perCust = clvProfit - cpa;
        const roi = v.spend > 0 ? (((clvProfit * v.cust) - v.spend) / v.spend) * 100 : 0;
        let tone, msg;
        if (cpa === 0) { tone = 'info'; msg = 'Enter your spend and customers to see a verdict.'; }
        else if (cpa <= maxCpa) { tone = 'good'; msg = `<strong>Profitable.</strong> Your CPA is below the 3:1 CLV:CAC threshold. You are earning <strong>${usd(perCust, 0)}</strong> in profit per customer acquired and can likely scale this channel.`; }
        else if (cpa <= clvProfit) { tone = 'warn'; msg = `<strong>Break-even zone.</strong> You are recovering your ad spend but not hitting a 3:1 ratio. Try layering WhatsApp cart recovery and post-purchase upsells to lift CLV and bring CPA below ${usd(maxCpa, 0)}.`; }
        else { tone = 'bad'; msg = `<strong>Unprofitable.</strong> Your CPA exceeds your CLV profit. Each new customer loses you <strong>${usd(Math.abs(perCust), 0)}</strong>. Pause or optimize this channel, and drive acquisition through owned channels like WhatsApp to cut your blended CPA.`; }
        return big(usd(cpa), 'Cost per acquisition')
          + metrics([[usd(clvProfit, 0), 'CLV (profit)'], [usd(maxCpa, 0), 'Max profitable CPA'], [`${roi.toFixed(0)}%`, 'Return on spend']])
          + note(msg, tone);
      },
    },

    'shipping-calculator': {
      fields: [
        { id: 'cost', label: 'Product cost ($)', value: 25, min: 0, step: 0.01 },
        { id: 'price', label: 'Selling price ($)', value: 49.99, min: 0, step: 0.01 },
        { id: 'ship', label: 'Shipping cost ($)', value: 8, min: 0, step: 0.01 },
        { id: 'target', label: 'Target profit margin (%)', value: 30, min: 0, max: 100 },
      ],
      render(v) {
        const chargeProfit = v.price - v.cost, chargeMargin = v.price > 0 ? (chargeProfit / v.price) * 100 : 0;
        const absorbProfit = v.price - v.cost - v.ship, absorbMargin = v.price > 0 ? (absorbProfit / v.price) * 100 : 0;
        const t = v.target / 100;
        const threshold = Math.ceil((t < 1 ? (v.cost + v.ship) / (1 - t) : 0) / 5) * 5;
        const gap = Math.max(threshold - v.price, 0);
        const half = (title, m, p) => `<div class="tl-half"><span>${title}</span><strong>${m.toFixed(1)}%</strong><small>Margin: ${usd(p)} / order</small></div>`;
        return `<div class="tl-halves">${half('If you absorb shipping', absorbMargin, absorbProfit)}${half('If customer pays shipping', chargeMargin, chargeProfit)}</div>`
          + big(`$${threshold.toFixed(0)}`, `Recommended free shipping threshold, to preserve your ${v.target}% target margin`, 'good')
          + note(`<strong>Growth tip:</strong> Promote “Free shipping over $${threshold.toFixed(0)}” in your WhatsApp cart recovery flows. A shopper with one item at $${v.price.toFixed(0)} just needs <strong>$${gap.toFixed(0)} more</strong> to unlock it: a perfect upsell message.`);
      },
    },

    'average-order-value-calculator': {
      fields: [
        { id: 'rev', label: 'Revenue for the period ($)', value: 36600, min: 0, step: 0.01 },
        { id: 'orders', label: 'Number of orders', value: 500, min: 0, step: 1 },
        { id: 'taxOn', label: 'My revenue includes VAT or sales tax', type: 'check', children: [
          { id: 'tax', label: 'Tax rate (%)', value: 20, min: 0, max: 100, step: 0.1 }] },
        { id: 'shipOn', label: 'My revenue includes shipping charged to customers', type: 'check', children: [
          { id: 'ship', label: 'Shipping charged ($)', value: 2400, min: 0, step: 0.01, hint: 'Enter this amount on the same basis as your revenue (with or without tax).' }] },
        { id: 'refOn', label: 'Remove refunds and canceled orders', type: 'check', children: [
          { id: 'ref', label: 'Amount refunded ($)', value: 1440, min: 0, step: 0.01 },
          { id: 'can', label: 'Orders canceled or fully refunded', value: 10, min: 0, step: 1, hint: 'Enter this amount on the same basis as your revenue (with or without tax).' }] },
        { id: 'delta', type: 'hidden', value: 5 },
      ],
      foot: 'To compare with Shopify’s Average order value, enter gross sales minus discounts (before tax and shipping) and the total number of orders, with no option ticked: Shopify removes neither returns nor canceled orders from that metric.',
      render(v, box) {
        const orders = Math.floor(v.orders), rate = v.taxOn ? v.tax : 0, ship = v.shipOn ? v.ship : 0;
        const ref = v.refOn ? v.ref : 0, can = v.refOn ? Math.floor(v.can) : 0;
        let err = '';
        if (orders <= 0) err = 'Enter a number of orders greater than zero.';
        else if (orders - can <= 0) err = 'Canceled orders must stay below the total number of orders.';
        else if (v.rev - ship - ref < 0) err = 'Shipping and refunds are higher than the revenue entered.';
        if (err) return note(err, 'bad');
        const keptRev = (v.rev - ship - ref) / (1 + rate / 100), keptOrders = orders - can;
        const parts = [v.taxOn && 'excluding tax', v.shipOn && 'excluding shipping', v.refOn && 'net of refunds and cancellations'].filter(Boolean);
        const delta = Math.max(+($('[data-f="delta"]', box)?.value ?? 5) || 0, 0);
        return big(money(keptRev / keptOrders), parts.length ? `Average order value ${parts.join(', ')}` : 'Revenue ÷ number of orders', 'good')
          + metrics([[money(v.rev / orders), 'Raw AOV (revenue ÷ orders)'], [money(keptRev), 'Revenue kept'], [loc(keptOrders), 'Orders kept']])
          + note(`If your average order value rises by $<input class="tl-inline" type="number" data-f="delta" value="${delta}" min="0" step="0.5" aria-label="Increase in average order value">, with the same number of orders, revenue for the period grows by <strong data-aov-extra>${money(delta * keptOrders)}</strong>.`);
      },
      bind(box) {
        box.addEventListener('input', (ev) => {
          if (!ev.target.matches('.tl-inline')) return;
          ev.stopPropagation();
          const kept = box.querySelector('.tl-metric:last-child strong').textContent.replace(/,/g, '');
          box.querySelector('[data-aov-extra]').textContent = money(Math.max(+ev.target.value || 0, 0) * +kept);
        }, true);
      },
    },

    'roas-calculator': {
      fields: [
        { id: 'rev', label: 'Revenue attributed to ads ($)', value: 10000, min: 0, step: 0.01 },
        { id: 'spend', label: 'Ad spend ($)', value: 2500, min: 0, step: 0.01 },
        { id: 'note', type: 'hint', text: 'Take both amounts from the same period and the same source: Meta, Google Ads, Shopify or your analytics tool.' },
        { id: 'mOn', label: 'Also calculate my break-even ROAS', type: 'check', children: [
          { id: 'm', label: 'Gross margin (%)', value: 40, min: 0, max: 100, step: 0.1, hint: '(Revenue before tax - cost of goods sold) ÷ revenue before tax. Also deduct shipping and payment fees if this threshold should cover them. In that case, enter attributed revenue before tax too.' }] },
      ],
      foot: 'To work out your break-even ROAS from your selling price and costs, use our <a href="https://getkanal.com/tools/roas-break-even-calculator" target="_blank" rel="noopener">break-even ROAS calculator</a>.',
      render(v) {
        let err = '';
        if (!(v.spend > 0)) err = 'Enter an ad spend greater than zero.';
        else if (!(v.rev >= 0)) err = 'Enter an attributed revenue of zero or more.';
        else if (v.mOn && !(v.m > 0 && v.m <= 100)) err = 'Enter a gross margin above 0 and up to 100%.';
        if (err) return note(err, 'bad');
        const roas = v.rev / v.spend;
        let out = big(mult(roas), `${money(roas)} of attributed revenue for every $1 of ad spend`, 'good')
          + metrics([[pct(roas, 0), 'ROAS as a percentage'], [v.rev > 0 ? pct(v.spend / v.rev, 1) : 'n/a', 'Share of attributed revenue spent on ads']]);
        if (!v.mOn) return out;
        const be = 100 / v.m;
        let after = (v.rev * v.m) / 100 - v.spend;
        if (Math.abs(after) < 0.005) after = 0;
        const diff = roas - be, state = Math.abs(diff) < 0.005 ? 'eq' : diff > 0 ? 'ok' : 'ko';
        const msg = { ok: `Your ROAS (${mult(roas)}) is above your break-even ROAS (${mult(be)}): the gross margin on attributed sales covers your ad spend.`,
          ko: `Your ROAS (${mult(roas)}) is below your break-even ROAS (${mult(be)}): the gross margin on attributed sales does not cover your ad spend.`,
          eq: `Your ROAS (${mult(roas)}) equals your break-even ROAS: the gross margin on attributed sales just covers your ad spend.` }[state];
        out += metrics([[mult(be), 'Break-even ROAS (1 ÷ gross margin)'], [money(after), 'Gross margin after ad spend, before fixed costs', after < 0 ? 'bad' : '']])
          + note(msg, { ok: 'good', ko: 'bad', eq: 'warn' }[state]);
        return out;
      },
    },

    'whatsapp-number-formatter': {
      fields: [countryField, phoneField],
      render(v, box) {
        const full = e164(v);
        box.dataset.copy = full;
        if (!full) return '<div class="tl-empty">Type a phone number above to format it.</div>';
        return `<dl class="tl-lines"><div><dt>International (E.164)</dt><dd>+${full}</dd></div>`
          + `<div><dt>WhatsApp / wa.me format</dt><dd>${full}${copyBtn('tl-mini tl-copy', 'Copy')}</dd></div>`
          + `<div><dt>Click-to-chat link</dt><dd><a href="https://wa.me/${full}" target="_blank" rel="noopener">wa.me/${full}${EXT}</a></dd></div></dl>`;
      },
      bind(box) { box.addEventListener('click', (ev) => { const b = ev.target.closest('.tl-copy'); if (b) copyText(box.dataset.copy, b); }); },
    },

    'check-whatsapp-number': {
      fields: [countryField, phoneField],
      render(v) {
        const full = e164(v);
        if (!full) return '<div class="tl-empty">Enter a phone number to check it on WhatsApp.</div>';
        return `<div class="tl-check-out"><strong>+${full}</strong><a class="btn btn--dark btn--nav" href="https://wa.me/${full}" target="_blank" rel="noopener">${ICON.wa}Check on WhatsApp</a>`
          + '<p>Tap the button to open this number in WhatsApp. If a chat opens, the number is on WhatsApp. If WhatsApp says the number is not registered, it is not on WhatsApp.</p></div>';
      },
    },
  };

  /* ---------- Champs ---------- */
  const field = (f) => {
    if (f.type === 'hidden') return '';
    if (f.type === 'hint') return `<p class="tl-hint tl-span">${esc(f.text)}</p>`;
    if (f.type === 'check') {
      return `<div class="tl-opt tl-span"><label class="tl-switch"><input type="checkbox" data-f="${f.id}"${f.checked ? ' checked' : ''} /><span class="tl-switch__ui" aria-hidden="true"></span><span>${esc(f.label)}</span></label>`
        + `<div class="tl-sub" data-sub="${f.id}" hidden><div class="tl-fields">${f.children.map(field).join('')}</div></div></div>`;
    }
    const id = `tl-${f.id}-${Math.random().toString(36).slice(2, 7)}`;
    let ctl;
    if (f.type === 'select') {
      const sel = f.options.findIndex(([v]) => String(f.value) === v); // le premier pays à +1, comme cc.value = '1'
      ctl = `<span class="tl-select"><select id="${id}" data-f="${f.id}">${f.options.map(([v, l], k) => `<option value="${esc(v)}"${k === sel ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></span>`;
    } else {
      const type = f.type || 'number';
      const attrs = [`type="${type}"`, `id="${id}"`, `data-f="${f.id}"`,
        f.value !== undefined ? `value="${esc(f.value)}"` : '', f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '',
        f.min !== undefined ? `min="${f.min}"` : '', f.max !== undefined ? `max="${f.max}"` : '', f.step !== undefined ? `step="${f.step}"` : '',
        f.maxlength ? `maxlength="${f.maxlength}"` : '', type === 'tel' ? 'inputmode="tel" autocomplete="off"' : '', type === 'number' ? 'inputmode="decimal"' : ''].filter(Boolean).join(' ');
      ctl = `<input class="tl-input" ${attrs} />`;
    }
    return `<div class="tl-field"><label for="${id}">${esc(f.label)}</label>${ctl}${f.hint ? `<p class="tl-hint">${esc(f.hint)}</p>` : ''}</div>`;
  };

  const values = (box, tool) => {
    const v = {};
    const walk = (list) => list.forEach((f) => {
      if (f.type === 'hint') return;
      if (f.type === 'hidden') { v[f.id] = f.value; return; }
      const el = $(`[data-f="${f.id}"]`, box);
      if (!el) return;
      if (f.type === 'check') { v[f.id] = el.checked; walk(f.children); return; }
      if (!f.type || f.type === 'number') { const n = parseFloat(el.value); v[f.id] = Number.isFinite(n) ? n : 0; return; }
      v[f.id] = el.value;
    });
    walk(tool.fields);
    return v;
  };

  $$('[data-tool]').forEach((box) => {
    const tool = TOOLS[box.dataset.tool];
    if (!tool) return;
    box.innerHTML = `<form class="tl-form" novalidate><div class="tl-fields">${tool.fields.map(field).join('')}</div>`
      + (tool.manual ? `<button type="submit" class="btn btn--dark btn--lg tl-go">${tool.manual}</button>` : '') + '</form>'
      + '<div class="tl-out" aria-live="polite"></div>'
      + (tool.foot ? `<p class="tl-foot">${tool.foot}</p>` : '');
    const out = $('.tl-out', box);
    const form = $('.tl-form', box);
    const run = () => {
      $$('[data-sub]', box).forEach((s) => { s.hidden = !$(`[data-f="${s.dataset.sub}"]`, box).checked; });
      out.innerHTML = tool.render(values(box, tool), box);
    };
    form.addEventListener('submit', (ev) => { ev.preventDefault(); run(); });
    if (!tool.manual) {
      form.addEventListener('input', run);
      form.addEventListener('change', run);
    } else {
      form.addEventListener('change', run);
    }
    if (tool.bind) tool.bind(box);
    run();
  });
})();
