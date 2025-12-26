
  function refreshSelectOptionLabels(selectEl) {
    if (!selectEl || !window.SalaryI18N) return;
    Array.from(selectEl.options).forEach((opt) => {
      const key = opt.getAttribute('data-i18n');
      if (key) opt.textContent = SalaryI18N.t(key);
    });
  }


  // Phase-L: remember last successful result so labels/errors can re-render on language change
  let lastResult = null;
  let lastDecimals = 2;
// assets/js/app.js
// UI glue: wires form → rules loader → engine → tables.

(function (window, document) {
  'use strict';

  const SalaryRulesLoader = window.SalaryRulesLoader;
  const SalaryEngine = window.SalaryEngine;
  const SalaryI18N = window.SalaryI18N;

  function $(selector) {
    return document.querySelector(selector);
  }

  // Phase-L (L-7): labelKey mapping for engine-emitted row labels (i18n-driven, no semantic changes)
  const LABEL_TO_KEY = Object.freeze({
    // Summary / Net / Taxes (engine-emitted labels)
    'Gross salary': 'output.gross.label',
    'Benefits': 'output.benefits.label',
    'Income tax': 'output.taxes.income',
    'Other taxes': 'output.taxes.other',
    'Total taxes': 'output.taxes.total',
    'Net salary': 'output.net.label',
    'Total cost to employer (TCO)': 'output.tco.label',

    // Contribution components (generic wording)
    'Health insurance': 'output.contrib.health',
    'Pension insurance': 'output.contrib.pension',
    'Unemployment insurance': 'output.contrib.unemployment',
    'Long-term care insurance': 'output.contrib.care',

    // Totals
    'Total employee contributions': 'output.contrib.totalEmployee',
    'Total employer contributions': 'output.contrib.totalEmployer',
  
    'Social Security (general regime)': 'output.es.contrib.socialSecurityGeneral',
    'pension': 'output.contrib.pension',
    'unemployment': 'output.contrib.unemployment',
    'National Insurance (Class 1)': 'output.uk.contrib.nationalInsuranceClass1',
    'Employee social contrib (uncapped)': 'output.fr.contrib.employeeUncapped',
    'Employee social contrib (capped)': 'output.fr.contrib.employeeCapped',
    'Zvw employer levy (bijdrage Zvw werkgever)': 'output.nl.contrib.zvwEmployerLevy',
    'Health insurance (zdrowotne)': 'output.pl.contrib.health',
    'Old-age pension insurance (emerytalne)': 'output.pl.contrib.oldAgePension',
    'Disability & survivors insurance (rentowe)': 'output.pl.contrib.disabilitySurvivors',
    'Sickness insurance (chorobowe)': 'output.pl.contrib.sickness',
    'Accident insurance (wypadkowe)': 'output.pl.contrib.accident',
    'Labour Fund (FP)': 'output.pl.contrib.labourFund',
    'Guaranteed Employee Benefits Fund (FGŚP)': 'output.pl.contrib.fgsp',
    'Accident insurance': 'output.contrib.accident',
    'Health insurance (ZZZS)': 'output.si.contrib.healthZZZS',
    'Pension & disability (ZPIZ)': 'output.si.contrib.pensionDisabilityZPIZ',
    'Parental protection': 'output.si.contrib.parentalProtection',
    'Occupational injury/disease': 'output.si.contrib.occupationalInjuryDisease',
    'Employer social contributions (aggregated)': 'output.se.contrib.employerSocialAgg',
    'Healthcare / minor INPS components (approx.)': 'output.it.contrib.healthcareMinor',
    'INPS previdenza (aggregated employee + employer)': 'output.it.contrib.inpsAggregate',
    'Unemployment contributions (included in INPS aggregate)': 'output.it.contrib.unemploymentIncluded',

    // Phase-L: label variants (engine may append qualifiers)
    'Accident insurance (wypadkowe) — default 1.67%': 'output.pl.contrib.accident',
    'Accident insurance (wypadkowe) - default 1.67%': 'output.pl.contrib.accident',
    'Occupational injury/disease (employer only)': 'output.si.contrib.occupationalInjuryDisease',
});

  function applyLabelKeys(rows) {
    if (!Array.isArray(rows)) return;

    const normalizeLabel = (s) => {
      const str = String(s == null ? '' : s).trim();
      if (!str) return '';
      // Normalize common qualifiers appended by some engines/rule sets.
      return str
        .replace(/\s*\(employer only\)\s*/i, '')
        .replace(/\s+—\s*default\s*[^\s]+\s*%?\s*$/i, '')
        .replace(/\s+-\s*default\s*[^\s]+\s*%?\s*$/i, '')
        .trim();
    };

    rows.forEach((row) => {
      if (!row || row.labelKey) return;

      const raw = (row.label != null) ? String(row.label) : ((row.key != null) ? String(row.key) : '');
      const label = raw.trim();
      if (!label) return;

      let key = LABEL_TO_KEY[label];

      if (!key) {
        const normalized = normalizeLabel(label);
        if (normalized && normalized !== label) {
          key = LABEL_TO_KEY[normalized];
        }
      }

      if (key) row.labelKey = key;
    });
  }


  function applyLabelKeysToContrib(contrib) {
    if (!contrib) return;
    if (Array.isArray(contrib.rows)) applyLabelKeys(contrib.rows);
    if (Array.isArray(contrib.totals)) applyLabelKeys(contrib.totals);
  }

  // Phase-L (L-7): backward-compatible aliases (older calls)
  function attachLabelKeysToRows(rows) { applyLabelKeys(rows); }
  function attachLabelKeysToContrib(contrib) { applyLabelKeysToContrib(contrib); }


  function resolveRowLabel(row) {
    if (!row) return '';
    // Prefer explicit labelKey if present
    if (row.labelKey) return SalaryI18N.t(row.labelKey);

    // Map known engine labels to i18n keys (with normalization)
    if (row.label != null) {
      const raw = String(row.label);
      const norm = raw.trim().replace(/\s+/g, ' ');
      const key = LABEL_TO_KEY[raw] || LABEL_TO_KEY[norm];
      if (key) return SalaryI18N.t(key);
      return norm;
    }

    if (row.key != null) {
      const raw = String(row.key);
      const norm = raw.trim().replace(/\s+/g, ' ');
      const key = LABEL_TO_KEY[raw] || LABEL_TO_KEY[norm];
      if (key) return SalaryI18N.t(key);
      return norm;
    }

    return '';
  }


  function getSelectedPeriod() {
    const checked = document.querySelector('input[name="period"]:checked');
    return checked ? checked.value : 'monthly';
  }

  function parseSalaryInput(value) {
    if (value == null) return null;

    let v = String(value).trim();
    if (v === '') return null;

    // Strip spaces
    v = v.replace(/\s+/g, '');

    // Disallow negatives
    if (v[0] === '-') return null;

    // Only digits + separators allowed
    if (!/^[0-9.,]+$/.test(v)) return null;

    const hasComma = v.includes(',');
    const hasDot = v.includes('.');

    if (hasComma && hasDot) {
      // Both present → decide by last separator:
      const lastComma = v.lastIndexOf(',');
      const lastDot = v.lastIndexOf('.');

      if (lastComma > lastDot) {
        // Assume EU: '.' thousands, ',' decimal → 3.500,00 -> 3500.00
        v = v.replace(/\./g, '');
        v = v.replace(',', '.');
      } else {
        // Assume US: ',' thousands, '.' decimal → 3,500.00 -> 3500.00
        v = v.replace(/,/g, '');
      }
    } else if (hasComma && !hasDot) {
      // Single comma: either decimal or thousands
      const parts = v.split(',');
      if (parts[1] && parts[1].length === 3 && parts[0].length >= 1) {
        // 3,500 → thousands separator
        v = parts.join('');
      } else {
        // 3500,25 → decimal
        v = parts[0] + '.' + (parts[1] || '');
      }
    } else if (hasDot && !hasComma) {
      const parts = v.split('.');
      if (parts[1] && parts[1].length === 3 && parts[0].length >= 1) {
        // 3.500 → thousands separator
        v = parts.join('');
      } // else: treat as decimal (3.50)
    }

    const num = Number(v);
    if (!Number.isFinite(num) || num < 0) return null;

    return num;
  }

  function parseChildrenInput(value) {
    if (value == null || value === '') return 0;
    const normalized = String(value).replace(',', '.');
    const num = Number(normalized);
    if (!Number.isFinite(num) || num < 0) return 0;
    // Children count must be a non-negative integer
    return Math.floor(num);
  }

  function showError(i18nKey) {
    // Global error (used for fatal / non-field-specific errors)
    const box = $('#error-box');
    if (box) { box.setAttribute('role','alert'); box.setAttribute('aria-live','polite'); }

    if (!box) return;

    const msgKey = i18nKey || 'app.error.generic';
    const msg = (window.SalaryI18N && typeof SalaryI18N.t === 'function') ? SalaryI18N.t(msgKey) : msgKey;

    box.dataset.i18nKey = msgKey;
    delete box.dataset.i18nKeys;
    box.textContent = msg;
    box.hidden = false;
  }

  function clearError() {
    const box = $('#error-box');
    if (!box) return;
    delete box.dataset.i18nKey;
    delete box.dataset.i18nKeys;
    box.textContent = '';
    box.hidden = true;
  }

  // Inline field error helpers (Phase-L UI-2)
  const FIELD_ERROR_MAP = {
    country: { input: '#country-select', box: '#error-country' },
    year: { input: '#year-select', box: '#error-year' },
    salary: { input: '#salary-input', box: '#error-salary' },
    region: { input: '#region-select', box: '#error-region' },
    taxClass: { input: '#tax-class-select', box: '#error-tax-class' },
    children: { input: '#children-input', box: '#error-children' },
    salaryMonths: { input: '#salary-months-select', box: '#error-salary-months' }
  };

  function clearFieldError(fieldKey) {
    const m = FIELD_ERROR_MAP[fieldKey];
    if (!m) return;
    const input = $(m.input);
    const box = $(m.box);
    if (input) {
      input.removeAttribute('aria-invalid');
      const d = input.getAttribute('aria-describedby');
      if (box && box.id && d === box.id) input.removeAttribute('aria-describedby');
    }

    if (box) {
      box.textContent = '';
      box.hidden = true;
  }
  }

  function clearAllFieldErrors() {
    Object.keys(FIELD_ERROR_MAP).forEach(clearFieldError);
  }

  function showFieldError(fieldKey, i18nKey) {
    const m = FIELD_ERROR_MAP[fieldKey];
    if (!m) return false;
    const input = $(m.input);
    const box = $(m.box);

    const msg = (window.SalaryI18N && typeof SalaryI18N.t === 'function') ? SalaryI18N.t(i18nKey) : i18nKey;

    if (input) input.setAttribute('aria-invalid', 'true');
    if (input && box && box.id) input.setAttribute('aria-describedby', box.id);
    if (box) { box.setAttribute('role','alert'); box.setAttribute('aria-live','polite'); }


    // If the inline box does not exist in the active HTML, report failure so caller can fall back to global.
    if (!box) return false;

    box.dataset.i18nKey = i18nKey;
    box.textContent = msg;
    box.hidden = false;
    return true;
  }

  function showBlockingErrors(errors) {
    // errors: [{ fieldKey?: string, key: string }]
    if (!errors || errors.length === 0) return;

    if (errors.length === 1 && errors[0].fieldKey) {
      // Inline only for single-field blocking errors (fall back to global if the inline slot is missing)
      const ok = showFieldError(errors[0].fieldKey, errors[0].key);
      if (!ok) showError(errors[0].key);
      return;
    }

    // Multiple blocking errors: show inline where possible AND show a calm global summary
    const msgs = [];
    errors.forEach((e) => {
      if (e.fieldKey) showFieldError(e.fieldKey, e.key);
      const msg = (window.SalaryI18N && typeof SalaryI18N.t === 'function') ? SalaryI18N.t(e.key) : e.key;
      msgs.push(msg);
    });

    // Simple summary: join messages. (No new i18n key required.)
    showError(null);
    const box = $('#error-box');
    if (box) box.textContent = msgs.join(' • ');
  }

  // Informational notice (non-blocking). Inserted dynamically before the summary table.
  function ensureNoticeBox() {
    let box = document.getElementById('notice-box');
    if (box) return box;

    const summaryTable = $('#table-summary');
    if (!summaryTable || !summaryTable.parentNode) return null;

    box = document.createElement('div');
    box.id = 'notice-box';
    box.hidden = true;
    // Minimal inline style to ensure visibility without requiring CSS changes
    box.style.margin = '10px 0';
    box.style.padding = '10px 12px';
    box.style.border = '1px solid rgba(0,0,0,0.15)';
    box.style.borderRadius = '8px';
    box.style.background = 'rgba(255, 193, 7, 0.12)'; // amber-ish, but still subtle
    box.style.color = 'inherit';

    summaryTable.parentNode.insertBefore(box, summaryTable);
    return box;
  }

  function showNotice(text) {
    const box = ensureNoticeBox();
    if (!box) return;
    box.textContent = text;
    box.hidden = false;
  }

  function clearNotice() {
    const box = document.getElementById('notice-box');
    if (!box) return;
    box.textContent = '';
    box.hidden = true;
  }

  function applyAccuracyNotice(country, period, salary, salaryMonths) {
    clearNotice();

    // Phase C: accuracy boundary messaging (DE)
    // Project boundary: ~7000 EUR/month. Above this, we still compute but warn that results may be less reliable.
    if (country === 'DE' && period === 'monthly' && Number(salary) > 7000) {
      const fallback =
        'Note (Germany): Income tax is calculated using the official §32a EStG 2026 formula (validated against the BMF calculator). Social contributions in this tool are simplified and may differ from real payroll, especially at higher incomes (e.g., contribution ceilings, insurance specifics).';

      const text = (typeof SalaryI18N !== 'undefined' && SalaryI18N && SalaryI18N.t)
        ? (SalaryI18N.t('notice.deAccuracyBoundary') || fallback)
        : fallback;

      showNotice(text);
      return;
    }

    // Austria: explain 14 salary months when > 12
    if (country === 'AT' && Number(salaryMonths) > 12) {
      const fallback =
        'Austria: 14 salary months = 12 regular + 2 special (13th/14th) salaries.';

      const text = (typeof SalaryI18N !== 'undefined' && SalaryI18N && SalaryI18N.t)
        ? (SalaryI18N.t('notice.atSalaryMonths') || fallback)
        : fallback;

      showNotice(text);
      return;
    }
  }

  function formatNumber(value, decimals) {
    const d = typeof decimals === 'number' ? decimals : 2;
    return Number(value).toFixed(d);
  }

  function renderSimpleTable(tableEl, rows, decimals) {
    const tbody = tableEl.querySelector('tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    rows.forEach((row) => {
      const tr = document.createElement('tr');

      const tdLabel = document.createElement('td');
      tdLabel.textContent = resolveRowLabel(row);

      const tdMonth = document.createElement('td');
      tdMonth.textContent = formatNumber(row.month || 0, decimals);

      const tdYear = document.createElement('td');
      tdYear.textContent = formatNumber(row.year || 0, decimals);

      tr.appendChild(tdLabel);
      tr.appendChild(tdMonth);
      tr.appendChild(tdYear);

      tbody.appendChild(tr);
    });
  }

  function renderContribTable(tableEl, data, decimals) {
    const tbody = tableEl.querySelector('tbody');
    const tfoot = tableEl.querySelector('tfoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';
    tfoot.innerHTML = '';

    // Detail rows
    data.rows.forEach((row) => {
      const tr = document.createElement('tr');

      const tdLabel = document.createElement('td');
      tdLabel.textContent = resolveRowLabel(row);

      const tdMonth = document.createElement('td');
      tdMonth.textContent = formatNumber(row.month || 0, decimals);

      const tdYear = document.createElement('td');
      tdYear.textContent = formatNumber(row.year || 0, decimals);

      tr.appendChild(tdLabel);
      tr.appendChild(tdMonth);
      tr.appendChild(tdYear);

      tbody.appendChild(tr);
    });

    // Totals
    data.totals.forEach((row) => {
      const tr = document.createElement('tr');

      const tdLabel = document.createElement('td');
      tdLabel.textContent = resolveRowLabel(row);

      const tdMonth = document.createElement('td');
      tdMonth.textContent = formatNumber(row.month || 0, decimals);

      const tdYear = document.createElement('td');
      tdYear.textContent = formatNumber(row.year || 0, decimals);

      tr.appendChild(tdLabel);
      tr.appendChild(tdMonth);
      tr.appendChild(tdYear);

      tfoot.appendChild(tr);
    });
  }

  function renderResult(result, decimalsOverride) {
    const decimals = (typeof decimalsOverride === 'number')
      ? decimalsOverride
      : (result && result.meta && typeof result.meta.currencyDecimals === 'number' ? result.meta.currencyDecimals : 2);

    const tables = result.tables;

// Phase-L (L-7): translate engine-emitted labels via labelKey mapping
    applyLabelKeys(tables.summary);
    applyLabelKeys(tables.taxes);
    applyLabelKeys(tables.netAndTco);
    applyLabelKeysToContrib(tables.employeeContributions);
    applyLabelKeysToContrib(tables.employerContributions);

    const tableSummary = $('#table-summary');
    const tableTaxes = $('#table-taxes');
    const tableEmp = $('#table-contrib-employee');
    const tableEr = $('#table-contrib-employer');
    const tableNetTco = $('#table-net-tco');

    if (tableSummary) {
      renderSimpleTable(tableSummary, tables.summary, decimals);
    }

    if (tableTaxes) {
      renderSimpleTable(tableTaxes, tables.taxes, decimals);
    }

    if (tableEmp) {
      renderContribTable(tableEmp, tables.employeeContributions, decimals);
    }

    if (tableEr) {
      renderContribTable(tableEr, tables.employerContributions, decimals);
    }

    if (tableNetTco) {
      renderSimpleTable(tableNetTco, tables.netAndTco, decimals);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    clearError();

    clearAllFieldErrors();

    const country = $('#country-select').value;
    const year = $('#year-select').value;
    const period = $('input[name="period"]:checked')?.value || 'monthly';
    const errors = [];

    // Salary (required, numeric, non-negative)
    const salaryRaw = $('#salary-input').value;
    const salaryRawTrim = String(salaryRaw || '').trim();

    let salary = null;
    if (salaryRawTrim === '') {
      errors.push({ fieldKey: 'salary', key: 'error.noSalary' });
    } else {
      salary = parseSalaryInput(salaryRawTrim);
      if (salary == null) {
        errors.push({ fieldKey: 'salary', key: 'error.invalidSalary' });
      }
    }

    // Global sanity cap (all markets, all currencies)
    const MAX_SALARY = 1_000_000; // 1,000,000
    if (salary != null && salary > MAX_SALARY) {
      errors.push({ fieldKey: 'salary', key: 'error.salaryOutOfRange' });
    }

    // ES region
    let region = null;
    if (country === 'ES') {
      const regionSelect = $('#region-select');
      region = regionSelect ? regionSelect.value : null;

      if (!region || region === '') {
        errors.push({ fieldKey: 'region', key: 'error.noRegionSelected' });
      }
    }

    // DE tax class
    let taxClass = null;
    if (country === 'DE') {
      const taxClassSelect = $('#tax-class-select');
      // DE tax class defaults to I in UI
      taxClass = taxClassSelect ? (taxClassSelect.value || 'I') : 'I';

      const validDEClasses = ['I', 'II', 'III', 'IV', 'V', 'VI'];
      if (!validDEClasses.includes(String(taxClass).toUpperCase())) {
        errors.push({ fieldKey: 'taxClass', key: 'error.invalidTaxClass' });
      } else {
        taxClass = String(taxClass).toUpperCase();
      }
    }

    if (errors.length > 0) {
      showBlockingErrors(errors);
      return;
    }


    // Children count (used primarily for German income tax)
    let childrenCount = 0;
    const childrenInput = $('#children-input');
    if (childrenInput && country === 'DE') {
      childrenCount = parseChildrenInput(childrenInput.value);
    }

    // Salary months per year (Austria: 13th/14th salaries)
    let salaryMonths = undefined;
    if (country === 'AT') {
      const salaryMonthsSelect = $('#salary-months-select');
      const raw = salaryMonthsSelect ? String(salaryMonthsSelect.value || '14') : '14';
      const num = Number(raw);
      // Allow only 12 or 14 for now; default to 14
      salaryMonths = (num === 12 || num === 14) ? num : 14;
    }

    try {
      const result = await SalaryEngine.computeSalaryWithContext({
        countryCode: country,
        year: year,
        region: region || undefined,
        taxClass: taxClass || undefined,
        salaryAmount: salary,
        salaryPeriod: period,
        childrenCount: childrenCount,
        salaryMonths: salaryMonths
        // benefitsAnnual: 0 // currently not user-input; reserved for future
      });

      lastResult = result;
      lastDecimals = (result && result.meta && typeof result.meta.currencyDecimals === 'number')
        ? result.meta.currencyDecimals
        : 2;
      renderResult(result, lastDecimals);
      applyAccuracyNotice(country, period, salary, salaryMonths);
    } catch (err) {
      if (err && err.i18nKey) {
        showError(err.i18nKey, err.details);
      } else {
        console.error(err);
        showError('app.error.generic');
      }
    }
  }

  function initRegionVisibility() {
    const countrySelect = $('#country-select');
    const regionRow = $('#region-row');

    function update() {
      if (!countrySelect || !regionRow) return;
      const isES = countrySelect.value === 'ES';
      regionRow.hidden = !isES;
      regionRow.style.display = isES ? '' : 'none';
    }

    if (countrySelect) {
      countrySelect.addEventListener('change', update);
      update();
    }
  }

  function initTaxClassVisibility() {
    const countrySelect = $('#country-select');
    const taxClassRow = $('#tax-class-row');

    function update() {
      if (!countrySelect || !taxClassRow) return;
      const isDE = countrySelect.value === 'DE';
      taxClassRow.hidden = !isDE;
      taxClassRow.style.display = isDE ? '' : 'none';
    }

    if (countrySelect) {
      countrySelect.addEventListener('change', update);
      update();
    }
  }

  function initChildrenVisibility() {
    const countrySelect = $('#country-select');
    const childrenRow = $('#children-row');

    function update() {
      if (!countrySelect || !childrenRow) return;
      const isDE = countrySelect.value === 'DE';
      childrenRow.hidden = !isDE;
      childrenRow.style.display = isDE ? '' : 'none';
    }

    if (countrySelect) {
      countrySelect.addEventListener('change', update);
      update();
    }
  }

  function initSalaryMonthsVisibility() {
    const countrySelect = $('#country-select');
    const salaryMonthsRow = $('#salary-months-row');
    const salaryMonthsSelect = $('#salary-months-select');

    function getPeriod() {
      const checked = document.querySelector('input[name="period"]:checked');
      return checked ? checked.value : 'monthly';
    }

    function update() {
      if (!countrySelect || !salaryMonthsRow) return;

      const isAT = countrySelect.value === 'AT';

      // Always show salary-months for Austria, regardless of period
      const show = isAT;

      salaryMonthsRow.hidden = !show;
      salaryMonthsRow.style.display = show ? '' : 'none';

      // Default to 14 when shown (Austria expectation); keep user selection otherwise.
      if (show && salaryMonthsSelect && !salaryMonthsSelect.value) {
        salaryMonthsSelect.value = '14';
      }
    }

    if (countrySelect) {
      countrySelect.addEventListener('change', update);
    }

    // Period radios affect visibility
    const periodRadios = document.querySelectorAll('input[name="period"]');
    periodRadios.forEach((r) => r.addEventListener('change', update));

    update();
  }

  function initTheme() {
    const btn = $('#theme-toggle');
    if (!btn) return;

    const storageKey = 'salaryCalcTheme';

    function applyTheme(theme) {
      const body = document.body;
      if (theme === 'dark') {
        body.classList.add('dark-theme');
      } else {
        body.classList.remove('dark-theme');
      }
    }

    const stored = window.localStorage
      ? window.localStorage.getItem(storageKey)
      : null;
    if (stored === 'dark' || stored === 'light') {
      applyTheme(stored);
    }

    btn.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');
      if (window.localStorage) {
        window.localStorage.setItem(storageKey, isDark ? 'dark' : 'light');
      }
    });
  }

  

  function refreshVisibleErrors() {
    const box = $('#error-box');
    if (box && !box.hidden) {
      if (box.dataset.i18nKey) {
        box.textContent = SalaryI18N.t(box.dataset.i18nKey);
      } else if (box.dataset.i18nKeys) {
        try {
          const keys = JSON.parse(box.dataset.i18nKeys);
          if (Array.isArray(keys)) {
            box.textContent = keys.map(k => SalaryI18N.t(k)).join(' • ');
          }
        } catch (_) {}
      }
    }

    Object.keys(FIELD_ERROR_MAP).forEach((fieldKey) => {
      const m = FIELD_ERROR_MAP[fieldKey];
      const eb = m ? $(m.box) : null;
      if (eb && !eb.hidden && eb.dataset.i18nKey) {
        eb.textContent = SalaryI18N.t(eb.dataset.i18nKey);
      }
    });
  }

function initLang() {
    const select = $('#lang-select');
    if (!select || !SalaryI18N) return;

    select.value = SalaryI18N.getLang();
    select.addEventListener('change', () => {
      SalaryI18N.setLang(select.value);
    refreshSelectOptionLabels($('#country-select'));
    refreshSelectOptionLabels($('#region-select'));
    refreshVisibleErrors();

            // Re-render already displayed UI state in the new language
      refreshVisibleErrors();
      if (lastResult) renderResult(lastResult, lastDecimals);
refreshVisibleErrors();
    });
  }

  function init() {
    const form = $('#salary-form');
    if (form) form.noValidate = true;
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    // Phase-L UI-2: clear inline errors on user interaction
    const salaryEl = $('#salary-input');
    if (salaryEl) {
      salaryEl.required = false;
      salaryEl.removeAttribute('required');
      salaryEl.removeAttribute('min');
    }
    if (salaryEl) salaryEl.addEventListener('input', () => clearFieldError('salary'));

    const regionEl = $('#region-select');
    if (regionEl) regionEl.addEventListener('change', () => clearFieldError('region'));

    const taxClassEl = $('#tax-class-select');
    if (taxClassEl) taxClassEl.addEventListener('change', () => clearFieldError('taxClass'));

    const yearEl = $('#year-select');
    if (yearEl) yearEl.addEventListener('change', () => clearFieldError('year'));

    const countryEl = $('#country-select');
    if (countryEl) countryEl.addEventListener('change', () => clearFieldError('country'));


    initRegionVisibility();
    initTaxClassVisibility();
    initChildrenVisibility();
    initSalaryMonthsVisibility();
    initTheme();
    initLang();

    // Initial translation pass if not already done.
    if (SalaryI18N && typeof SalaryI18N.applyTranslations === 'function') {
      SalaryI18N.applyTranslations(document);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);