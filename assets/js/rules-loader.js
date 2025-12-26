// assets/js/rules-loader.js
// Loader for tax rule JSON files and taxContext assembly.
// Pure vanilla JS, no external dependencies.

(function (window) {
  'use strict';

  /**
   * Base path where rules-XX.json files are stored.
   * Adjust if your directory structure differs.
   */
  const RULES_BASE_PATH = 'assets/rules';

  /**
   * Map country codes to their rule filenames.
   * Must match the JSON files created in Phase A.
   */
  const COUNTRY_FILE_MAP = {
    DE: 'rules-DE.json',
    ES: 'rules-ES.json',
    UK: 'rules-UK.json',
    FR: 'rules-FR.json',
    NL: 'rules-NL.json',
    PL: 'rules-PL.json',
    AT: 'rules-AT.json',
    SI: 'rules-SI.json',
    SE: 'rules-SE.json',   // <-- added
    IT: 'rules-IT.json'
  };

  /**
   * Simple error type which carries an i18n key from MSD:
   *   error.noSalary, error.invalidSalary, error.noCountryRules, ...
   * The UI will translate i18nKey via i18n.js.
   */
  class RulesError extends Error {
    constructor(i18nKey, details) {
      super(i18nKey);
      this.name = 'RulesError';
      this.i18nKey = i18nKey;
      this.details = details || null;
    }
  }

  /**
   * Internal in-memory cache for loaded country JSON files.
   * Key: countryCode (e.g. "DE")
   * Value: parsed JSON object.
   */
  const rulesCache = new Map();

  /**
   * Build URL for a given country code.
   */
  function buildRulesUrl(countryCode) {
    const fileName = COUNTRY_FILE_MAP[countryCode];
    if (!fileName) {
      // Country not supported by the rules system at all.
      throw new RulesError('error.noCountryRules', { countryCode });
    }
    return RULES_BASE_PATH.replace(/\/$/, '') + '/' + fileName;
  }

  /**
   * Load country rules JSON (with caching).
   * Returns a Promise resolving to the parsed country-level rules object.
   */
  async function loadCountryRules(countryCode) {
    const code = String(countryCode || '').toUpperCase();

    if (!code) {
      throw new RulesError('error.noCountryRules', { countryCode: code });
    }

    // Serve from cache if available.
    if (rulesCache.has(code)) {
      return rulesCache.get(code);
    }

    const url = buildRulesUrl(code);

    let response;
    try {
      response = await fetch(url, { cache: 'no-store' });
    } catch (err) {
      // Network / fetch error.
      throw new RulesError('error.noCountryRules', {
        countryCode: code,
        cause: 'network',
        originalError: err
      });
    }

    if (!response.ok) {
      // File missing / HTTP error.
      throw new RulesError('error.noCountryRules', {
        countryCode: code,
        status: response.status
      });
    }

    let json;
    try {
      json = await response.json();
    } catch (err) {
      // Invalid JSON.
      throw new RulesError('error.noCountryRules', {
        countryCode: code,
        cause: 'invalid_json',
        originalError: err
      });
    }

    // Minimal structural validation against MSD schema expectations.
    if (!json || typeof json !== 'object' || !json.years) {
      throw new RulesError('error.noCountryRules', {
        countryCode: code,
        cause: 'missing_years'
      });
    }

    rulesCache.set(code, json);
    return json;
  }

  /**
   * Resolve the YearRules for a given year key from countryRules.
   */
  function resolveYearRules(countryRules, year) {
    const yearKey = String(year);
    const years = countryRules.years || {};

    const yearRules = years[yearKey];
    if (!yearRules) {
      throw new RulesError('error.noYearRules', {
        country: countryRules.country || null,
        year: yearKey
      });
    }

    return yearRules;
  }

  /**
   * Shallow/recursive object merge:
   * - Objects are merged key-by-key (recursive).
   * - Arrays and primitives are replaced by override.
   * - base is not mutated; a new object / array is returned.
   */
  function deepMerge(base, override) {
    if (!override) return base;
    if (!base) return override;

    const result = Array.isArray(base) ? base.slice() : { ...base };

    Object.keys(override).forEach((key) => {
      const ov = override[key];
      const bv = result[key];

      if (
        bv &&
        typeof bv === 'object' &&
        !Array.isArray(bv) &&
        ov &&
        typeof ov === 'object' &&
        !Array.isArray(ov)
      ) {
        result[key] = deepMerge(bv, ov);
      } else {
        result[key] = ov;
      }
    });

    return result;
  }

  /**
   * Resolve Spain region rules, based on the MSD 4.4 structure:
   *
   * yearRules.regions = {
   *   "madrid": {
   *     income_tax: {
   *       national: { ... },
   *       regional: { ... }
   *     }
   *   },
   *   ...
   * }
   */
  function resolveSpainRegionIncomeTax(yearRules, region) {
    const regions = yearRules.regions || {};
    const defaultRegion = yearRules.default_region || null;

    const regionKey = region || defaultRegion;

    if (!regionKey || !regions[regionKey]) {
      throw new RulesError('error.noRegionSelected', {
        region: region || null
      });
    }

    const regionEntry = regions[regionKey];
    const incomeTax = regionEntry.income_tax || {};
    const national = incomeTax.national || null;
    const regional = incomeTax.regional || null;

    return {
      nationalIncomeTax: national,
      regionalIncomeTax: regional
    };
  }

  /**
   * Assemble a taxContext object, which the computation engine will consume.
   *
   * Input:
   *   options = {
   *     countryCode: "DE" | "ES" | "UK" | ...,
   *     year: 2026 | "2026",
   *     region: "madrid" | "catalonia" | "andalusia" | "valencia" (ES only, optional for others),
   *     taxClass: "I" | "II" | "III" | "IV" | "V" | "VI" (DE only, optional for others)
   *   }
   *
   * taxContext shape is an internal structure, consistent with MSD JSON schema,
   * but not exposed to users directly.
   */
  async function buildTaxContext(options) {
    const countryCode = String(options.countryCode || '').toUpperCase();
    const year = options.year;
    const region = options.region || null;
    const taxClass = options.taxClass || null;
    const childrenCount = Number(options.childrenCount || 0);

    // 1) Load country rules JSON
    const countryRules = await loadCountryRules(countryCode);

    // 2) Resolve YearRules
    const yearRules = resolveYearRules(countryRules, year);

    // 3) Base blocks as defined in YearRules (before tax-class / region overrides)
    const incomeTaxTopLevel = yearRules.income_tax || null;
    const socialContributionsTopLevel = yearRules.social_contributions || {};
    const otherTaxesTopLevel = yearRules.other_taxes || {};
    const flags = yearRules.calculation_flags || {};
    const disclaimers = Array.isArray(yearRules.disclaimers)
      ? yearRules.disclaimers
      : [];
    const notes = Array.isArray(yearRules.notes)
      ? yearRules.notes
      : [];

    // 4) Apply tax class overrides (DE only, Option A / deep-merge)
    let incomeTaxEffective = incomeTaxTopLevel;
    let socialContributionsEffective = socialContributionsTopLevel;
    let otherTaxesEffective = otherTaxesTopLevel;

    if (countryCode === 'DE') {
      const rawClass = taxClass ? String(taxClass).toUpperCase().trim() : '';
      const taxClasses = yearRules.tax_classes || null;

      // NEW (B-INV-1): if tax_classes exist for this year, taxClass is mandatory
      if (taxClasses && typeof taxClasses === 'object') {
        if (!rawClass) {
          throw new RulesError('error.invalidTaxClass', {
            country: countryCode,
            year: String(year),
            taxClass: null,
            cause: 'missing_tax_class_required'
          });
        }
      }

      if (rawClass) {
        if (!taxClasses || !taxClasses[rawClass]) {
          throw new RulesError('error.invalidTaxClass', {
            country: countryCode,
            year: String(year),
            taxClass: rawClass
          });
        }

        const classOverrides = taxClasses[rawClass] || {};

        incomeTaxEffective = deepMerge(
          incomeTaxTopLevel || {},
          classOverrides.income_tax || {}
        );

        // NEW: ensure formula.parameters exists so class-level injections cannot fail silently
        if (
          incomeTaxEffective &&
          incomeTaxEffective.type === 'formula' &&
          incomeTaxEffective.formula &&
          !incomeTaxEffective.formula.parameters
        ) {
          incomeTaxEffective.formula.parameters = {};
        }

        // ---- Inject class-level taxable income adjustment into formula parameters
if (
  classOverrides &&
  typeof classOverrides.taxable_income_adjustment === 'number' &&
  incomeTaxEffective &&
  incomeTaxEffective.formula &&
  incomeTaxEffective.formula.parameters
) {
  incomeTaxEffective.formula.parameters =
    deepMerge(
      incomeTaxEffective.formula.parameters,
      {
        taxable_income_adjustment:
          classOverrides.taxable_income_adjustment
      }
    );
}


        socialContributionsEffective = deepMerge(
          socialContributionsTopLevel || {},
          classOverrides.social_contributions || {}
        );

        otherTaxesEffective = deepMerge(
          otherTaxesTopLevel || {},
          classOverrides.other_taxes || {}
        );

// NEW (B-INV-3, dev diagnostic): warn/throw if class selection yields identical income tax rules
try {
  const baseSig = JSON.stringify(incomeTaxTopLevel || {});
  const effSig  = JSON.stringify(incomeTaxEffective || {});
  if (baseSig === effSig) {
    const msg = `[DE tax class] Selected class did not change income tax rules: ${rawClass}`;
    if (typeof window !== 'undefined' && window.DEBUG_STRICT === true) {
      throw new RulesError('app.error.generic', { cause: 'tax_class_no_effect', taxClass: rawClass });
    } else {
      console.warn(msg);
    }
  }
} catch (e) {
  // If strict mode threw, rethrow; otherwise ignore signature failures
  if (e instanceof RulesError) throw e;
}


      }
    }

    // 5) Spain-specific dual IRPF model (national + regional)
    let incomeTax = incomeTaxEffective;
    let spainRegionTax = null;

    if (countryCode === 'ES') {
      const { nationalIncomeTax, regionalIncomeTax } =
        resolveSpainRegionIncomeTax(yearRules, region);

      spainRegionTax = {
        nationalIncomeTax,
        regionalIncomeTax
      };

      // For Spain, we treat top-level income_tax as optional;
      // the effective tax is derived from the region model.
      incomeTax = null;
    }

    // 6) Build taxContext
    const taxContext = {
      countryCode,
      countryName: countryRules.name || null,
      currency: countryRules.currency || null,
      year: String(year),

      region: countryCode === 'ES' ? (region || null) : null,
      taxClass: taxClass ? String(taxClass).toUpperCase() : null,

      // Raw JSON blocks directly aligned with MSD schema
      yearRules,                    // full YearRules block
      incomeTax,                    // non-ES: IncomeTaxRules, ES: null (use spainRegionTax instead)
      spainRegionTax,               // only for ES (national + regional tax rules)
      socialContributions: socialContributionsEffective,
      otherTaxes: otherTaxesEffective,
      calculationFlags: flags,

      // User-dependent context
      childrenCount: childrenCount,

      // Additional metadata (still derived from MSD JSON)
      disclaimers,
      notes
    };

    // NEW (B-INV-2): Resolve CalcMode once here and freeze
    const calcMode = {
      countryCode,
      year: String(year),
      taxClass: taxContext.taxClass || null,
      method:
        (taxContext.incomeTax &&
         taxContext.incomeTax.type === 'formula' &&
         taxContext.incomeTax.formula &&
         taxContext.incomeTax.formula.method)
          ? String(taxContext.incomeTax.formula.method)
          : (taxContext.incomeTax ? (taxContext.incomeTax.type || 'unknown') : (countryCode === 'ES' ? 'es_dual_irpf' : 'none'))
    };

    try { Object.freeze(calcMode); } catch (_) {}
    taxContext.calcMode = calcMode;

    return taxContext;
  }

  /**
   * Public API
   * Exposed under window.SalaryRulesLoader
   */
  const SalaryRulesLoader = {
    RulesError,
    loadCountryRules,
    resolveYearRules,
    buildTaxContext
  };

  // Attach to window (browser global)
  window.SalaryRulesLoader = SalaryRulesLoader;
})(window);