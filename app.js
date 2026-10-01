/**
 * FORECOURT WORKS LTD — Breakdown Loss Calculator
 * Vertical product blocks · Full-width interpretation under each product
 */
(function () {
  'use strict';

  const PRODUCT_META = {
    'PMS':     { css: 'PMS',    label: 'PMS — Petrol / Motor Spirit', short: 'PMS' },
    'AGO':     { css: 'AGO',    label: 'AGO — Diesel',                short: 'AGO' },
    'V.POWER': { css: 'VPOWER', label: 'V.POWER — Premium',           short: 'V.POWER' },
    'IK':      { css: 'IK',     label: 'IK — Kerosene',               short: 'IK' }
  };

  const PERIODS = [
    { key: 'second',  label: 'Per second' },
    { key: 'minute',  label: 'Per minute' },
    { key: 'hour',    label: 'Per hour' },
    { key: 'day',     label: 'Per day' },
    { key: 'week',    label: 'Per week' },
    { key: 'month',   label: 'Per month' },
    { key: 'quarter', label: 'Per quarter' },
    { key: 'semi',    label: 'Semi-annual' },
    { key: 'year',    label: 'Per year' }
  ];

  const TABLE_PERIODS = ['hour', 'day', 'week', 'month', 'year'];

  const state = {
    selected: [],
    lastCalc: null
  };

  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function formatKES(n) {
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e9) return 'KES ' + (n / 1e9).toLocaleString('en-KE', { maximumFractionDigits: 2 }) + 'B';
    if (abs >= 1e6) return 'KES ' + (n / 1e6).toLocaleString('en-KE', { maximumFractionDigits: 2 }) + 'M';
    if (abs >= 1e3) return 'KES ' + n.toLocaleString('en-KE', { maximumFractionDigits: 0 });
    return 'KES ' + n.toLocaleString('en-KE', { maximumFractionDigits: 2 });
  }

  function formatL(n) {
    if (n == null || isNaN(n)) return '—';
    if (Math.abs(n) >= 1e6) return (n / 1e6).toLocaleString('en-KE', { maximumFractionDigits: 2 }) + 'M L';
    if (Math.abs(n) >= 1e3) return n.toLocaleString('en-KE', { maximumFractionDigits: 0 }) + ' L';
    return n.toLocaleString('en-KE', { maximumFractionDigits: 1 }) + ' L';
  }

  function toast(msg, type) {
    const el = $('#toast');
    el.textContent = msg;
    el.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.className = 'toast'; }, 2800);
  }

  function hoursForPeriod(key, hoursDay, daysWeek) {
    switch (key) {
      case 'second':  return 1 / 3600;
      case 'minute':  return 1 / 60;
      case 'hour':    return 1;
      case 'day':     return hoursDay;
      case 'week':    return hoursDay * daysWeek;
      case 'month':   return hoursDay * (daysWeek / 7) * 30;
      case 'quarter': return hoursDay * (daysWeek / 7) * 90;
      case 'semi':    return hoursDay * (daysWeek / 7) * 182.5;
      case 'year':    return hoursDay * (daysWeek / 7) * 365;
      default: return 0;
    }
  }

  function buildRows(volDay, price, site) {
    const litersPerOpHour = site.hoursDay > 0 ? volDay / site.hoursDay : 0;
    return PERIODS.map(per => {
      const hrs = hoursForPeriod(per.key, site.hoursDay, site.daysWeek);
      const liters = litersPerOpHour * hrs;
      return { key: per.key, label: per.label, liters, revenue: liters * price };
    });
  }

  function updateProductUI() {
    $$('.p-toggle').forEach(t => {
      const p = t.dataset.product;
      const on = state.selected.includes(p);
      t.className = 'p-toggle' + (on ? ' on-' + PRODUCT_META[p].css : '');
    });
    renderProductForms();
  }

  function toggleProduct(product) {
    const idx = state.selected.indexOf(product);
    if (idx >= 0) {
      state.selected.splice(idx, 1);
    } else {
      if (state.selected.length >= 3) {
        toast('Maximum 3 products at once', 'error');
        return;
      }
      state.selected.push(product);
    }
    state.lastCalc = null;
    $('#combined-strip').style.display = 'none';
    updateProductUI();
  }

  function captureValues() {
    const vals = {};
    state.selected.forEach(code => {
      const vol = $(`.vol-day[data-p="${code}"]`);
      const nz = $(`.nozzles[data-p="${code}"]`);
      const price = $(`.price[data-p="${code}"]`);
      const down = $(`.nozzles-down[data-p="${code}"]`);
      vals[code] = {
        vol: vol ? vol.value : '',
        nz: nz ? nz.value : '',
        price: price ? price.value : '',
        down: down ? down.value : '1'
      };
    });
    return vals;
  }

  function renderProductForms() {
    const area = $('#products-area');
    if (!state.selected.length) {
      area.innerHTML = `
        <div class="empty-msg">
          Select one or more products above, enter volumes and nozzles,<br/>
          then click <strong>Calculate Losses</strong>.
        </div>`;
      return;
    }

    const prev = captureValues();

    area.innerHTML = state.selected.map(code => {
      const m = PRODUCT_META[code];
      const v = prev[code] || { vol: '', nz: '', price: '', down: '1' };
      return `
        <div class="product-block ${m.css}" data-product="${code}">
          <div class="product-block-head">
            <span>${m.label}</span>
            <span class="badge" id="badge-${m.css}">Enter figures below</span>
          </div>
          <div class="cols-2">
            <div class="col-pane full">
              <h3>Revenue at full capacity</h3>
              <div class="input-grid three">
                <div>
                  <label>Daily volume (L)</label>
                  <input type="number" class="vol-day" data-p="${code}" min="0" step="1" value="${v.vol}" placeholder="e.g. 3000" />
                </div>
                <div>
                  <label>Nozzles total</label>
                  <input type="number" class="nozzles" data-p="${code}" min="1" step="1" value="${v.nz}" placeholder="e.g. 5" />
                </div>
                <div>
                  <label>Price (KES/L)</label>
                  <input type="number" class="price" data-p="${code}" min="0" step="0.01" value="${v.price}" placeholder="e.g. 214" />
                </div>
              </div>
              <div class="hint">Litres / nozzle / day: <b class="vpn" data-p="${code}">—</b></div>
              <div class="rev-box" id="full-rev-${m.css}" style="display:none;"></div>
              <div id="full-table-${m.css}"></div>
            </div>
            <div class="col-pane break">
              <h3>Revenue with breakdown</h3>
              <div class="input-grid">
                <div>
                  <label>Nozzles out of service</label>
                  <input type="number" class="nozzles-down" data-p="${code}" min="0" step="1" value="${v.down}" placeholder="1" />
                </div>
                <div>
                  <label>Still working</label>
                  <div class="hint" style="margin-top:12px;font-size:1.1rem;">
                    <b class="working" data-p="${code}">—</b>
                  </div>
                </div>
              </div>
              <div class="rev-box" id="break-rev-${m.css}" style="display:none;"></div>
              <div id="break-table-${m.css}"></div>
            </div>
          </div>
          <div class="interp-bar" id="interp-${m.css}" style="display:none;"></div>
        </div>`;
    }).join('');

    state.selected.forEach(code => {
      const volEl = $(`.vol-day[data-p="${code}"]`);
      const nzEl = $(`.nozzles[data-p="${code}"]`);
      const downEl = $(`.nozzles-down[data-p="${code}"]`);
      const update = () => {
        const vol = parseFloat(volEl.value) || 0;
        const nz = parseFloat(nzEl.value) || 0;
        const down = parseFloat(downEl.value) || 0;
        const vpnEl = $(`.vpn[data-p="${code}"]`);
        const workEl = $(`.working[data-p="${code}"]`);
        vpnEl.textContent = (vol > 0 && nz > 0)
          ? (vol / nz).toLocaleString('en-KE', { maximumFractionDigits: 1 })
          : '—';
        const working = Math.max(0, nz - down);
        workEl.textContent = nz ? (working + ' of ' + nz) : '—';
        workEl.style.color = (down > nz && nz > 0) ? 'var(--danger)' : '';
      };
      [volEl, nzEl, downEl].forEach(el => el.addEventListener('input', update));
      update();
    });

    if (state.lastCalc) renderResults();
  }

  function readSite() {
    return {
      client: ($('#client-name').value || '').trim(),
      site: ($('#site-location').value || '').trim(),
      hoursDay: parseFloat($('#hours-day').value) || 18,
      daysWeek: parseFloat($('#days-week').value) || 7
    };
  }

  function readProducts() {
    return state.selected.map(code => {
      const volDay = parseFloat($(`.vol-day[data-p="${code}"]`).value) || 0;
      const nozzles = parseFloat($(`.nozzles[data-p="${code}"]`).value) || 0;
      const price = parseFloat($(`.price[data-p="${code}"]`).value) || 0;
      const nozzlesDown = parseFloat($(`.nozzles-down[data-p="${code}"]`).value) || 0;
      const volPerNozzle = nozzles > 0 ? volDay / nozzles : 0;
      const working = Math.max(0, nozzles - nozzlesDown);
      return {
        product: code,
        volDay,
        nozzles,
        nozzlesDown,
        working,
        volPerNozzle,
        price,
        volDayBreakdown: volPerNozzle * working
      };
    });
  }

  function calculate() {
    if (!state.selected.length) {
      toast('Select at least one product', 'error');
      return;
    }
    const site = readSite();
    const products = readProducts();

    for (const p of products) {
      if (p.volDay <= 0) { toast('Enter daily volume for ' + p.product, 'error'); return; }
      if (p.price <= 0) { toast('Enter price for ' + p.product, 'error'); return; }
      if (p.nozzles < 1) { toast('Nozzles must be at least 1 for ' + p.product, 'error'); return; }
      if (p.nozzlesDown > p.nozzles) {
        toast('Nozzles out of service cannot exceed total for ' + p.product, 'error');
        return;
      }
      if (p.nozzlesDown < 1) {
        toast('Enter at least 1 nozzle out of service for ' + p.product, 'error');
        return;
      }
    }

    const enriched = products.map(p => {
      const fullRows = buildRows(p.volDay, p.price, site);
      const breakRows = buildRows(p.volDayBreakdown, p.price, site);
      const lossRows = fullRows.map((fr, i) => ({
        key: fr.key,
        label: fr.label,
        liters: fr.liters - breakRows[i].liters,
        revenue: fr.revenue - breakRows[i].revenue
      }));
      return { ...p, fullRows, breakRows, lossRows };
    });

    state.lastCalc = {
      site,
      products: enriched,
      totalLossDay: enriched.reduce((s, p) => s + p.lossRows.find(r => r.key === 'day').revenue, 0),
      totalLossYear: enriched.reduce((s, p) => s + p.lossRows.find(r => r.key === 'year').revenue, 0),
      totalFullDay: enriched.reduce((s, p) => s + p.fullRows.find(r => r.key === 'day').revenue, 0),
      totalBreakDay: enriched.reduce((s, p) => s + p.breakRows.find(r => r.key === 'day').revenue, 0)
    };

    renderResults();
    toast('Loss calculation updated', 'success');
  }

  function renderResults() {
    const c = state.lastCalc;
    if (!c) return;

    const strip = $('#combined-strip');
    if (c.products.length >= 2) {
      strip.style.display = 'block';
      strip.innerHTML = `
        <div class="label">Combined loss across ${c.products.length} products</div>
        <div class="big">${formatKES(c.totalLossDay)} / day</div>
        <div class="detail">
          Full capacity ${formatKES(c.totalFullDay)}/day →
          with breakdown ${formatKES(c.totalBreakDay)}/day ·
          Annual risk ${formatKES(c.totalLossYear)}
        </div>`;
    } else {
      strip.style.display = 'none';
    }

    c.products.forEach(p => {
      const m = PRODUCT_META[p.product];
      const dayFull = p.fullRows.find(r => r.key === 'day');
      const dayBreak = p.breakRows.find(r => r.key === 'day');
      const dayLoss = p.lossRows.find(r => r.key === 'day');
      const yearLoss = p.lossRows.find(r => r.key === 'year');
      const perNz = p.nozzlesDown > 0 ? dayLoss.revenue / p.nozzlesDown : 0;

      const badge = $(`#badge-${m.css}`);
      if (badge) {
        badge.textContent = p.nozzlesDown + ' nozzle' + (p.nozzlesDown > 1 ? 's' : '') + ' down';
      }

      const fullRev = $(`#full-rev-${m.css}`);
      if (fullRev) {
        fullRev.style.display = 'block';
        fullRev.innerHTML = `
          <div class="amount">${formatKES(dayFull.revenue)}</div>
          <div class="sub">per operating day · ${formatL(dayFull.liters)}</div>`;
      }
      const fullTable = $(`#full-table-${m.css}`);
      if (fullTable) {
        fullTable.innerHTML = `
          <table class="mini-table">
            <thead><tr><th>Period</th><th>Litres</th><th>Revenue</th></tr></thead>
            <tbody>
              ${p.fullRows.filter(r => TABLE_PERIODS.includes(r.key)).map(r => `
                <tr>
                  <td>${r.label}</td>
                  <td>${formatL(r.liters)}</td>
                  <td class="kes">${formatKES(r.revenue)}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      }

      const breakRev = $(`#break-rev-${m.css}`);
      if (breakRev) {
        breakRev.style.display = 'block';
        breakRev.innerHTML = `
          <div class="amount">${formatKES(dayBreak.revenue)}</div>
          <div class="sub">per day with ${p.nozzlesDown} down · ${formatL(dayBreak.liters)}</div>`;
      }
      const breakTable = $(`#break-table-${m.css}`);
      if (breakTable) {
        breakTable.innerHTML = `
          <table class="mini-table">
            <thead><tr><th>Period</th><th>Litres</th><th>Revenue</th></tr></thead>
            <tbody>
              ${p.breakRows.filter(r => TABLE_PERIODS.includes(r.key)).map(r => `
                <tr>
                  <td>${r.label}</td>
                  <td>${formatL(r.liters)}</td>
                  <td class="kes">${formatKES(r.revenue)}</td>
                </tr>`).join('')}
            </tbody>
          </table>`;
      }

      const interp = $(`#interp-${m.css}`);
      if (interp) {
        interp.style.display = 'block';
        const chips = PERIODS.map(per => {
          const row = p.lossRows.find(r => r.key === per.key);
          const wide = (per.key === 'second' || per.key === 'year') ? ' wide' : '';
          return `
            <div class="loss-chip${wide}">
              <div class="period">${per.label}</div>
              <div class="val">${formatKES(row.revenue)}</div>
            </div>`;
        }).join('');

        interp.innerHTML = `
          <div class="interp-title">Cost of delay — ${m.short}</div>
          <div class="interp-hero">${formatKES(dayLoss.revenue)} lost every day</div>
          <div class="interp-sub">
            ${formatKES(dayFull.revenue)} at full capacity → ${formatKES(dayBreak.revenue)} with breakdown
          </div>
          <div class="loss-chips">${chips}</div>
          <div class="per-nozzle">
            Each nozzle out of service costs <strong>${formatKES(perNz)}</strong> per operating day.
            Leave ${p.nozzlesDown} down for a year and you forfeit <strong>${formatKES(yearLoss.revenue)}</strong>.
          </div>`;
      }
    });
  }

  function resetAll() {
    state.selected = [];
    state.lastCalc = null;
    $('#client-name').value = '';
    $('#site-location').value = '';
    $('#hours-day').value = '18';
    $('#days-week').value = '7';
    $('#combined-strip').style.display = 'none';
    updateProductUI();
    toast('Reset complete', 'success');
  }

  function init() {
    $$('.p-toggle').forEach(t => {
      t.addEventListener('click', () => toggleProduct(t.dataset.product));
    });
    $('#btn-calc').addEventListener('click', calculate);
    $('#btn-reset').addEventListener('click', resetAll);
    updateProductUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
