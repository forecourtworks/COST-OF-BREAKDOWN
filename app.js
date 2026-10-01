/**
 * FORECOURT WORKS LTD — Breakdown Loss Calculator
 * Three-column live comparison: Full capacity | Breakdown | Interpretation
 */
(function () {
  'use strict';

  const PRODUCT_META = {
    'PMS':     { css: 'PMS',     label: 'PMS — Petrol',     short: 'PMS' },
    'AGO':     { css: 'AGO',     label: 'AGO — Diesel',     short: 'AGO' },
    'V.POWER': { css: 'VPOWER',  label: 'V.POWER — Premium', short: 'V.POWER' },
    'IK':      { css: 'IK',      label: 'IK — Kerosene',    short: 'IK' }
  };

  const PERIODS = [
    { key: 'second',  label: 'Per second',   factor: 1 / 3600 },
    { key: 'minute',  label: 'Per minute',   factor: 1 / 60 },
    { key: 'hour',    label: 'Per hour',     factor: 1 },
    { key: 'day',     label: 'Per day',      factor: null }, // uses hoursDay
    { key: 'week',    label: 'Per week',     factor: null },
    { key: 'month',   label: 'Per month',    factor: null },
    { key: 'quarter', label: 'Per quarter',  factor: null },
    { key: 'semi',    label: 'Semi-annual',  factor: null },
    { key: 'year',    label: 'Per year',     factor: null }
  ];

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

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
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

  /* ── Product selection ── */
  function updateProductUI() {
    $$('.p-toggle').forEach(t => {
      const p = t.dataset.product;
      const on = state.selected.includes(p);
      t.className = 'p-toggle' + (on ? ' on-' + PRODUCT_META[p].css : '');
    });
    renderInputPanels();
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
    updateProductUI();
  }

  /* ── Render input panels inside the three columns (inputs live in full + break) ── */
  function renderInputPanels() {
    const fullBody = $('#col-full-body');
    const breakBody = $('#col-break-body');
    const interpBody = $('#col-interp-body');

    if (!state.selected.length) {
      fullBody.innerHTML = '<div class="empty-state">Select product(s) and enter volumes, nozzles &amp; price. Then calculate.</div>';
      breakBody.innerHTML = '<div class="empty-state">Enter how many nozzles are out of service per product, then calculate.</div>';
      interpBody.innerHTML = '<div class="empty-state">The difference between full capacity and breakdown appears here — second by second, year by year.</div>';
      return;
    }

    // Preserve existing values if re-rendering
    const prev = {};
    state.selected.forEach(code => {
      const meta = PRODUCT_META[code];
      const vol = $(`.vol-day[data-p="${code}"]`);
      const nz = $(`.nozzles[data-p="${code}"]`);
      const price = $(`.price[data-p="${code}"]`);
      const down = $(`.nozzles-down[data-p="${code}"]`);
      prev[code] = {
        vol: vol ? vol.value : '',
        nz: nz ? nz.value : '',
        price: price ? price.value : '',
        down: down ? down.value : '0'
      };
    });

    // Full capacity column — inputs + will show results after calc
    fullBody.innerHTML = state.selected.map(code => {
      const m = PRODUCT_META[code];
      const v = prev[code] || {};
      return `
        <div class="prod-card ${m.css}" data-product="${code}">
          <div class="pc-head">${m.label}</div>
          <div class="pc-body">
            <div class="pc-grid three">
              <div>
                <label>Daily volume (L)</label>
                <input type="number" class="vol-day" data-p="${code}" min="0" step="1" value="${v.vol}" placeholder="e.g. 12000" />
              </div>
              <div>
                <label>Nozzles total</label>
                <input type="number" class="nozzles" data-p="${code}" min="1" step="1" value="${v.nz}" placeholder="e.g. 4" />
              </div>
              <div>
                <label>Price (KES/L)</label>
                <input type="number" class="price" data-p="${code}" min="0" step="0.01" value="${v.price}" placeholder="e.g. 189.5" />
              </div>
            </div>
            <div class="vpn-line">Litres / nozzle / day: <b class="vpn" data-p="${code}">—</b></div>
          </div>
        </div>`;
    }).join('') + '<div id="full-results"></div>';

    // Breakdown column — nozzles out of service
    breakBody.innerHTML = state.selected.map(code => {
      const m = PRODUCT_META[code];
      const v = prev[code] || {};
      return `
        <div class="prod-card ${m.css}" data-product="${code}">
          <div class="pc-head">${m.label}</div>
          <div class="pc-body">
            <div class="pc-grid">
              <div>
                <label>Nozzles OUT of service</label>
                <input type="number" class="nozzles-down" data-p="${code}" min="0" step="1" value="${v.down || '0'}" placeholder="0" />
              </div>
              <div>
                <label>Nozzles still working</label>
                <div class="vpn-line" style="margin-top:6px;font-size:0.9rem;"><b class="working" data-p="${code}">—</b></div>
              </div>
            </div>
          </div>
        </div>`;
    }).join('') + '<div id="break-results"></div>';

    // Wire live VPN + working updates
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
        if (vol > 0 && nz > 0) {
          vpnEl.textContent = (vol / nz).toLocaleString('en-KE', { maximumFractionDigits: 1 });
        } else {
          vpnEl.textContent = '—';
        }
        const working = Math.max(0, nz - down);
        workEl.textContent = working + ' of ' + (nz || '—');
        if (down > nz && nz > 0) {
          workEl.style.color = 'var(--danger)';
        } else {
          workEl.style.color = '';
        }
      };
      [volEl, nzEl, downEl].forEach(el => {
        el.addEventListener('input', update);
      });
      update();
    });
  }

  /* ── Calculation ── */
  function readSite() {
    return {
      client: ($('#client-name').value || '').trim(),
      site: ($('#site-location').value || '').trim(),
      hoursDay: parseFloat($('#hours-day').value) || 18,
      daysWeek: parseFloat($('#days-week').value) || 7,
      date: $('#calc-date').value || todayISO()
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
      const volDayBreakdown = volPerNozzle * working;
      return {
        product: code,
        volDay,
        nozzles,
        nozzlesDown,
        working,
        volPerNozzle,
        price,
        volDayBreakdown
      };
    });
  }

  function buildRows(volDay, price, site) {
    const litersPerOpHour = site.hoursDay > 0 ? volDay / site.hoursDay : 0;
    return PERIODS.map(per => {
      const hrs = hoursForPeriod(per.key, site.hoursDay, site.daysWeek);
      const liters = litersPerOpHour * hrs;
      return {
        key: per.key,
        label: per.label,
        liters,
        revenue: liters * price
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
      if (p.volDay <= 0) {
        toast('Enter daily volume for ' + p.product, 'error');
        return;
      }
      if (p.price <= 0) {
        toast('Enter price for ' + p.product, 'error');
        return;
      }
      if (p.nozzles < 1) {
        toast('Nozzles must be at least 1 for ' + p.product, 'error');
        return;
      }
      if (p.nozzlesDown > p.nozzles) {
        toast('Nozzles out of service cannot exceed total for ' + p.product, 'error');
        return;
      }
      if (p.nozzlesDown < 1) {
        toast('Enter at least 1 nozzle out of service to see breakdown impact', 'error');
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

    const totalFullDay = enriched.reduce((s, p) => s + p.fullRows.find(r => r.key === 'day').revenue, 0);
    const totalBreakDay = enriched.reduce((s, p) => s + p.breakRows.find(r => r.key === 'day').revenue, 0);
    const totalLossDay = totalFullDay - totalBreakDay;
    const totalLossYear = enriched.reduce((s, p) => s + p.lossRows.find(r => r.key === 'year').revenue, 0);
    const totalLossSecond = enriched.reduce((s, p) => s + p.lossRows.find(r => r.key === 'second').revenue, 0);

    state.lastCalc = {
      site,
      products: enriched,
      totalFullDay,
      totalBreakDay,
      totalLossDay,
      totalLossYear,
      totalLossSecond
    };

    renderResults();
    toast('Loss calculation updated', 'success');
  }

  /* ── Render results into the three columns ── */
  function renderResults() {
    const c = state.lastCalc;
    if (!c) return;

    // --- Full capacity results ---
    const fullEl = $('#full-results');
    if (fullEl) {
      const dayL = c.products.reduce((s, p) => s + p.fullRows.find(r => r.key === 'day').liters, 0);
      fullEl.innerHTML = `
        <div class="rev-summary">
          <div class="big">${formatKES(c.totalFullDay)}</div>
          <div class="sub">daily revenue · ${formatL(dayL)} combined</div>
        </div>
        ${c.products.map(p => {
          const m = PRODUCT_META[p.product];
          const day = p.fullRows.find(r => r.key === 'day');
          return `
            <div class="prod-card ${m.css}" style="margin-top:6px;">
              <div class="pc-head">${m.short} — Full capacity</div>
              <div class="pc-body" style="padding:4px 0 0;">
                <table class="mini">
                  <thead><tr><th>Period</th><th>Litres</th><th>Revenue</th></tr></thead>
                  <tbody>
                    ${p.fullRows.filter(r => ['hour','day','week','month','year'].includes(r.key)).map(r => `
                      <tr>
                        <td>${r.label}</td>
                        <td>${formatL(r.liters)}</td>
                        <td class="kes">${formatKES(r.revenue)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>
                <div class="vpn-line" style="padding:4px 8px;">${p.nozzles} nozzle(s) · ${formatL(p.volPerNozzle)}/nozzle · ${formatKES(day.revenue)}/day</div>
              </div>
            </div>`;
        }).join('')}`;
    }

    // --- Breakdown results ---
    const breakEl = $('#break-results');
    if (breakEl) {
      const dayL = c.products.reduce((s, p) => s + p.breakRows.find(r => r.key === 'day').liters, 0);
      breakEl.innerHTML = `
        <div class="rev-summary">
          <div class="big">${formatKES(c.totalBreakDay)}</div>
          <div class="sub">daily revenue with breakdown · ${formatL(dayL)} combined</div>
        </div>
        ${c.products.map(p => {
          const m = PRODUCT_META[p.product];
          const day = p.breakRows.find(r => r.key === 'day');
          return `
            <div class="prod-card ${m.css}" style="margin-top:6px;">
              <div class="pc-head">${m.short} — ${p.nozzlesDown} nozzle(s) DOWN</div>
              <div class="pc-body" style="padding:4px 0 0;">
                <table class="mini">
                  <thead><tr><th>Period</th><th>Litres</th><th>Revenue</th></tr></thead>
                  <tbody>
                    ${p.breakRows.filter(r => ['hour','day','week','month','year'].includes(r.key)).map(r => `
                      <tr>
                        <td>${r.label}</td>
                        <td>${formatL(r.liters)}</td>
                        <td class="kes">${formatKES(r.revenue)}</td>
                      </tr>`).join('')}
                  </tbody>
                </table>
                <div class="vpn-line" style="padding:4px 8px;">${p.working} of ${p.nozzles} working · ${formatKES(day.revenue)}/day remaining</div>
              </div>
            </div>`;
        }).join('')}`;
    }

    // --- Interpretation (dramatic) ---
    const interpBody = $('#col-interp-body');
    const totalLoss = {};
    PERIODS.forEach(per => {
      totalLoss[per.key] = c.products.reduce((s, p) => s + p.lossRows.find(r => r.key === per.key).revenue, 0);
    });

    const perNozzleDay = c.products.map(p => {
      const lossDay = p.lossRows.find(r => r.key === 'day').revenue;
      const perNz = p.nozzlesDown > 0 ? lossDay / p.nozzlesDown : 0;
      return { product: p.product, nozzlesDown: p.nozzlesDown, lossDay, perNz };
    });

    interpBody.innerHTML = `
      <div class="loss-hero">
        <div class="big">${formatKES(c.totalLossDay)} / day</div>
        <div class="sub">Revenue vanishing while the dispenser sits idle</div>
      </div>

      <div class="loss-grid">
        <div class="loss-chip highlight">
          <div class="period">Every second the nozzle is down</div>
          <div class="val">${formatKES(totalLoss.second)}</div>
        </div>
        <div class="loss-chip">
          <div class="period">Per minute</div>
          <div class="val">${formatKES(totalLoss.minute)}</div>
        </div>
        <div class="loss-chip">
          <div class="period">Per hour</div>
          <div class="val">${formatKES(totalLoss.hour)}</div>
        </div>
        <div class="loss-chip">
          <div class="period">Per day</div>
          <div class="val">${formatKES(totalLoss.day)}</div>
        </div>
        <div class="loss-chip">
          <div class="period">Per week</div>
          <div class="val">${formatKES(totalLoss.week)}</div>
        </div>
        <div class="loss-chip">
          <div class="period">Per month</div>
          <div class="val">${formatKES(totalLoss.month)}</div>
        </div>
        <div class="loss-chip">
          <div class="period">Per quarter</div>
          <div class="val">${formatKES(totalLoss.quarter)}</div>
        </div>
        <div class="loss-chip">
          <div class="period">Semi-annually</div>
          <div class="val">${formatKES(totalLoss.semi)}</div>
        </div>
        <div class="loss-chip highlight">
          <div class="period">Annually — if left unresolved</div>
          <div class="val">${formatKES(totalLoss.year)}</div>
        </div>
      </div>

      ${perNozzleDay.map(x => {
        const m = PRODUCT_META[x.product];
        return `
          <div class="interp-note" style="margin-top:6px;">
            <strong>${m.short}:</strong> Each nozzle out of service costs
            <strong>${formatKES(x.perNz)}</strong> every operating day
            (${x.nozzlesDown} down → <strong>${formatKES(x.lossDay)}</strong>/day for this grade).
          </div>`;
      }).join('')}

      <div class="interp-note" style="margin-top:8px;border-left-color:var(--navy);background:#e8f1fb;">
        <strong style="color:var(--navy);">Full vs Breakdown:</strong>
        ${formatKES(c.totalFullDay)}/day at capacity →
        ${formatKES(c.totalBreakDay)}/day with breakdown →
        <strong>${formatKES(c.totalLossDay)}</strong> lost daily.
        Over a year that is <strong>${formatKES(c.totalLossYear)}</strong> walking out the door.
      </div>
    `;
  }

  /* ── Reset ── */
  function resetAll() {
    state.selected = [];
    state.lastCalc = null;
    $('#client-name').value = '';
    $('#site-location').value = '';
    $('#hours-day').value = '18';
    $('#days-week').value = '7';
    $('#calc-date').value = todayISO();
    updateProductUI();
    toast('Reset complete', 'success');
  }

  /* ── Init ── */
  function init() {
    $('#calc-date').value = todayISO();

    $$('.p-toggle').forEach(t => {
      t.addEventListener('click', () => toggleProduct(t.dataset.product));
    });
    $('#btn-calc').addEventListener('click', calculate);
    $('#btn-reset').addEventListener('click', resetAll);

    // Live recalc on input change after first calc
    document.addEventListener('input', (e) => {
      if (e.target.matches('.vol-day, .nozzles, .price, .nozzles-down, #hours-day, #days-week') && state.lastCalc) {
        // soft live update if possible
      }
    });

    updateProductUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
