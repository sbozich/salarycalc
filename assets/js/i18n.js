// assets/js/i18n.js
// Minimal i18n helper for Salary Calculator.

(function (window) {
  'use strict';

  const translations = {
    en_intl: {
      // General
      'app.title': 'Salary Calculator',
      'app.tagline':
        'Gross-to-net and TCO calculations — browser-only and privacy-first.',
      'app.error.generic': 'An unexpected error occurred. Please try again.',
      'app.themeToggle': 'Dark mode',
      'app.inputs.title': 'Inputs',
      'app.outputs.title': 'Results',

      // Notices
      'notice.deAccuracyBoundary': 'Note (Germany): Income tax is calculated using the official §32a EStG 2026 formula (validated against the BMF calculator). Social contributions in this tool are simplified and may differ from real payroll, especially at higher incomes (e.g., contribution ceilings, insurance specifics).',
      'notice.atSalaryMonths': 'Austria: 14 salary months = 12 regular + 2 special (13th/14th) salaries.',


      // (extra, for UI only)
      'input.language.label': 'Language',

      // Inputs
      'input.country.label': 'Country',
      'input.year.label': 'Year',
      'input.region.label': 'Region',
      'input.region.placeholder': 'Select region…',
      'input.period.label': 'Input period',
      'input.period.monthly': 'Monthly',
      'input.period.yearly': 'Yearly',
      'input.salary.label': 'Gross salary',
      'input.calculate': 'Calculate',
      'input.children.label': 'Children (for income tax)',
      'input.salaryMonths.label': 'Payroll months (12 or 14)',



      // Tax class (Germany)
      'input.taxClass.label': 'Tax class (Germany)',
      'input.taxClass.none': '— Not applicable —',

      // Columns
      'output.column.label': 'Label',
      'output.column.month': 'Month',
      'output.column.year': 'Year',

      // Summary
      'output.summary.title': 'Summary',
      'output.gross.label': 'Gross salary',
      'output.benefits.label': 'Benefits',

      // Taxes
      'output.taxes.title': 'Taxes',
      'output.taxes.income': 'Income tax',
      'output.taxes.other': 'Other taxes',
      'output.taxes.total': 'Total taxes',

      // Contributions
      'output.contrib.title': 'Contributions',
      'output.contrib.employee': 'Employee contributions',
      'output.contrib.employer': 'Employer contributions',
      'output.contrib.totalEmployee': 'Total employee contributions',
      'output.contrib.totalEmployer': 'Total employer contributions',

      // Net / TCO
      'output.net.title': 'Net salary & TCO',
      'output.net.label': 'Net salary',
      'output.tco.label': 'Total cost to employer (TCO)',

      // Footer
      'footer.otherTools': 'Other tools:',
      'footer.listComparator': 'ListComparator',
      'footer.textMetricSEO': 'TextMetricSEO',
      'footer.invoiceCreator': 'InvoiceCreator',
      'footer.disclaimer':
        'No backend, no analytics; calculations may simplify real tax systems.',
      'footer.version': 'v1.0',

      // Countries
      'country.DE': 'Germany',
      'country.ES': 'Spain',
      'country.UK': 'United Kingdom',
      'country.FR': 'France',
      'country.NL': 'Netherlands',
      'country.PL': 'Poland',
      'country.AT': 'Austria',
      'country.SI': 'Slovenia',
      'country.SE': 'Sweden',
      'country.IT': 'Italy',


      // Spain regions
      'region.madrid': 'Madrid',
      'region.catalonia': 'Catalonia',
      'region.andalusia': 'Andalusia',
      'region.valencia': 'Valencia',

      // Errors
      'error.noSalary': 'Please enter a gross salary.',
      'error.invalidSalary': 'The entered salary value is invalid.',
      'error.invalidTaxClass': 'Please select a valid tax class for Germany.',
      'error.noCountryRules': 'No rules available for the selected country.',
      'error.noYearRules': 'No rules available for the selected year.',
      'error.noRegionSelected': 'Please select a region.',
      'error.salaryOutOfRange': 'The salary value is unrealistically high. Please check and try again.'
    }

  };

  // Phase-L (L-1): translation buckets per language/market.
  // Strategy: clone the EN baseline so every language has full key coverage immediately.
  // Later, translate values incrementally without risking missing-key UI leaks.
  const BASE = translations.en_intl;

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  const buckets = {
    en_uk: clone(BASE),
    de_de: clone(BASE),
    es_es: clone(BASE),
    fr_fr: clone(BASE),
    it_it: clone(BASE),
    pl_pl: clone(BASE),
    si_si: clone(BASE),
    se_se: clone(BASE)
  };

  Object.keys(buckets).forEach((k) => {
    translations[k] = buckets[k];
  });


  // Phase-L (L-3a): German (DE) high-impact overrides
  Object.assign(translations.de_de, {
    'app.title': 'Gehaltsrechner',
    'app.tagline': 'Brutto‑Netto‑Berechnung und TCO – lokal im Browser, ohne Tracking.',
    'app.inputs.title': 'Eingaben',
    'app.outputs.title': 'Ergebnisse',
    'input.language.label': 'Sprache',
    'input.country.label': 'Land',
    'input.year.label': 'Jahr',
    'input.region.label': 'Region',
    'input.region.placeholder': 'Region auswählen…',
    'input.period.label': 'Eingabezeitraum',
    'input.period.monthly': 'Monatlich',
    'input.period.yearly': 'Jährlich',
    'input.salary.label': 'Bruttogehalt',
    'input.calculate': 'Berechnen',
    'input.children.label': 'Kinder (für Einkommensteuer)',
    'input.salaryMonths.label': 'Gehaltsmonate (12 oder 14)',
    'input.taxClass.label': 'Steuerklasse (Deutschland)',
    
    'input.taxClass.none': '— Nicht anwendbar —','output.column.label': 'Bezeichnung',
    'output.column.month': 'Monat',
    'output.column.year': 'Jahr',
    'output.summary.title': 'Übersicht',
    'output.taxes.title': 'Steuern',
    'output.contrib.title': 'Sozialabgaben',
    'output.contrib.employee': 'Arbeitnehmerbeiträge',
    'output.contrib.employer': 'Arbeitgeberbeiträge',
    'output.net.title': 'Netto & TCO',
    'output.net.label': 'Nettogehalt',
    'output.tco.label': 'Gesamtkosten Arbeitgeber (TCO)',

    // Output row labels (Phase-L L6/L7)
    'output.gross.label': 'Brutto',
    'output.benefits.label': 'Geldwerter Vorteil (Sachbezug)',
    'output.incomeTax.label': 'Lohnsteuer',
    'output.otherTaxes.label': 'Sonstige Steuern',
    'output.totalTaxes.label': 'Steuern gesamt',
    'output.healthInsurance.label': 'Krankenversicherung',
    'output.pensionInsurance.label': 'Rentenversicherung',
    'output.unemploymentInsurance.label': 'Arbeitslosenversicherung',
    'output.careInsurance.label': 'Pflegeversicherung',
    'output.totalEmployeeContrib.label': 'Sozialabgaben (AN) gesamt',
    'output.totalEmployerContrib.label': 'Sozialabgaben (AG) gesamt',
    'output.netSalary.label': 'Nettogehalt',
    'output.tcoTotal.label': 'Gesamtkosten Arbeitgeber (TCO)',

      'error.noSalary': 'Bitte ein Bruttogehalt eingeben.',
    'error.invalidSalary': 'Der eingegebene Gehaltswert ist ungültig.',
    'error.noRegionSelected': 'Bitte eine Region auswählen.'
  });


  // Phase-L (L-3b): Spanish (ES) high-impact overrides
  Object.assign(translations.es_es, {
    'app.title': 'Calculadora salarial',
    'app.tagline': 'Cálculos profesionales de bruto a neto y TCO — en el navegador y sin seguimiento.',
    'app.inputs.title': 'Entradas',
    'app.outputs.title': 'Resultados',
    'input.language.label': 'Idioma',
    'input.country.label': 'País',
    'input.year.label': 'Año',
    'input.region.label': 'Región',
    'input.region.placeholder': 'Seleccionar región…',
    'input.period.label': 'Periodo de entrada',
    'input.period.monthly': 'Mensual',
    'input.period.yearly': 'Anual',
    'input.salary.label': 'Salario bruto',
    'input.calculate': 'Calcular',
    'input.children.label': 'Hijos (para IRPF)',
    'input.salaryMonths.label': 'Pagas (12 o 14)',
    'input.taxClass.label': 'Clase fiscal (Alemania)',
    
    'input.taxClass.none': '— No aplicable —','output.column.label': 'Concepto',
    'output.column.month': 'Mes',
    'output.column.year': 'Año',
    'output.summary.title': 'Resumen',
    'output.taxes.title': 'Impuestos',
    'output.contrib.title': 'Cotizaciones',
    'output.contrib.employee': 'Cotizaciones del empleado',
    'output.contrib.employer': 'Cotizaciones del empleador',
    'output.net.title': 'Salario neto y TCO',
    'output.net.label': 'Salario neto',
    'output.tco.label': 'Coste total del empleador (TCO)',
    'error.noSalary': 'Introduzca un salario bruto.',
    'error.invalidSalary': 'El valor del salario no es válido.',
    'error.noRegionSelected': 'Seleccione una región.'
  });


  // Phase-L (L-3c): French (FR) high-impact overrides
  Object.assign(translations.fr_fr, {
    'app.title': 'Calculateur de salaire',
    'app.tagline': 'Calculs brut-net et TCO — dans le navigateur, sans suivi.',
    'app.inputs.title': 'Saisie',
    'app.outputs.title': 'Résultats',
    'input.language.label': 'Langue',
    'input.country.label': 'Pays',
    'input.year.label': 'Année',
    'input.region.label': 'Région',
    'input.region.placeholder': 'Sélectionner une région…',
    'input.period.label': 'Période de saisie',
    'input.period.monthly': 'Mensuel',
    'input.period.yearly': 'Annuel',
    'input.salary.label': 'Salaire brut',
    'input.calculate': 'Calculer',
    'input.children.label': 'Enfants (pour l’impôt sur le revenu)',
    'input.salaryMonths.label': 'Nombre de mois de paie (12 ou 14)',
    'input.taxClass.label': 'Classe d’imposition (Allemagne)',
    
    'input.taxClass.none': '— Non applicable —','output.column.label': 'Libellé',
    'output.column.month': 'Mois',
    'output.column.year': 'Année',
    'output.summary.title': 'Résumé',
    'output.taxes.title': 'Impôts',
    'output.contrib.title': 'Cotisations',
    'output.contrib.employee': 'Cotisations salariales',
    'output.contrib.employer': 'Cotisations patronales',
    'output.net.title': 'Salaire net & TCO',
    'output.net.label': 'Salaire net',
    'output.tco.label': 'Coût total employeur (TCO)',
    'error.noSalary': 'Veuillez saisir un salaire brut.',
    'error.invalidSalary': 'La valeur du salaire saisie est invalide.',
    'error.noRegionSelected': 'Veuillez sélectionner une région.'
  });


  // Phase-L (L-3d): Italian (IT) high-impact overrides
  Object.assign(translations.it_it, {
    'app.title': 'Calcolatore stipendio',
    'app.tagline': 'Calcoli lordo-netto e TCO — nel browser e senza tracciamento.',
    'app.inputs.title': 'Input',
    'app.outputs.title': 'Risultati',
    'input.language.label': 'Lingua',
    'input.country.label': 'Paese',
    'input.year.label': 'Anno',
    'input.region.label': 'Regione',
    'input.region.placeholder': 'Seleziona regione…',
    'input.period.label': 'Periodo di input',
    'input.period.monthly': 'Mensile',
    'input.period.yearly': 'Annuale',
    'input.salary.label': 'Stipendio lordo',
    'input.calculate': 'Calcola',
    'input.children.label': 'Figli (per l’imposta sul reddito)',
    'input.salaryMonths.label': 'Mensilità (12 o 14)',
    'input.taxClass.label': 'Classe fiscale (Germania)',
    
    'input.taxClass.none': '— Non applicabile —','output.column.label': 'Voce',
    'output.column.month': 'Mese',
    'output.column.year': 'Anno',
    'output.summary.title': 'Riepilogo',
    'output.taxes.title': 'Imposte',
    'output.contrib.title': 'Contributi',
    'output.contrib.employee': 'Contributi del dipendente',
    'output.contrib.employer': 'Contributi del datore di lavoro',
    'output.net.title': 'Stipendio netto e TCO',
    'output.net.label': 'Stipendio netto',
    'output.tco.label': 'Costo totale per il datore (TCO)',
    'error.noSalary': 'Inserisci lo stipendio lordo.',
    'error.invalidSalary': 'Il valore dello stipendio inserito non è valido.',
    'error.noRegionSelected': 'Seleziona una regione.'
  });


  // Phase-L (L-3e): Polish (PL) high-impact overrides
  Object.assign(translations.pl_pl, {
    'app.title': 'Kalkulator wynagrodzeń',
    'app.tagline': 'Obliczenia brutto‑netto i TCO — w przeglądarce, bez śledzenia.',
    'app.inputs.title': 'Dane',
    'app.outputs.title': 'Wyniki',
    'input.language.label': 'Język',
    'input.country.label': 'Kraj',
    'input.year.label': 'Rok',
    'input.region.label': 'Region',
    'input.region.placeholder': 'Wybierz region…',
    'input.period.label': 'Okres',
    'input.period.monthly': 'Miesięcznie',
    'input.period.yearly': 'Rocznie',
    'input.salary.label': 'Wynagrodzenie brutto',
    'input.calculate': 'Oblicz',
    'input.children.label': 'Dzieci (dla podatku dochodowego)',
    'input.salaryMonths.label': 'Liczba wypłat (12 lub 14)',
    'input.taxClass.label': 'Klasa podatkowa (Niemcy)',
    
    'input.taxClass.none': '— Nie dotyczy —','output.column.label': 'Pozycja',
    'output.column.month': 'Miesiąc',
    'output.column.year': 'Rok',
    'output.summary.title': 'Podsumowanie',
    'output.taxes.title': 'Podatki',
    'output.contrib.title': 'Składki',
    'output.contrib.employee': 'Składki pracownika',
    'output.contrib.employer': 'Składki pracodawcy',
    'output.net.title': 'Wynagrodzenie netto i TCO',
    'output.net.label': 'Wynagrodzenie netto',
    'output.tco.label': 'Całkowity koszt pracodawcy (TCO)',
    'error.noSalary': 'Wpisz wynagrodzenie brutto.',
    'error.invalidSalary': 'Wprowadzona wartość wynagrodzenia jest nieprawidłowa.',
    'error.noRegionSelected': 'Wybierz region.'
  });


  // Phase-L (L-3f): Slovenian (SI) high-impact overrides
  Object.assign(translations.si_si, {
    'app.title': 'Kalkulator plače',
    'app.tagline': 'Profesionalni izračuni bruto‑neto in TCO — v brskalniku in brez sledenja.',
    'app.inputs.title': 'Vnosi',
    'app.outputs.title': 'Rezultati',
    'input.language.label': 'Jezik',
    'input.country.label': 'Država',
    'input.year.label': 'Leto',
    'input.region.label': 'Regija',
    'input.region.placeholder': 'Izberi regijo…',
    'input.period.label': 'Obdobje vnosa',
    'input.period.monthly': 'Mesečno',
    'input.period.yearly': 'Letno',
    'input.salary.label': 'Bruto plača',
    'input.calculate': 'Izračunaj',
    'input.children.label': 'Otroci (za dohodnino)',
    'input.salaryMonths.label': 'Št. izplačil (12 ali 14)',
    'input.taxClass.label': 'Davčni razred (Nemčija)',
    
    'input.taxClass.none': '— Ni relevantno —','output.column.label': 'Postavka',
    'output.column.month': 'Mesec',
    'output.column.year': 'Leto',
    'output.summary.title': 'Povzetek',
    'output.taxes.title': 'Davki',
    'output.contrib.title': 'Prispevki',
    'output.contrib.employee': 'Prispevki zaposlenega',
    'output.contrib.employer': 'Prispevki delodajalca',
    'output.net.title': 'Neto plača in TCO',
    'output.net.label': 'Neto plača',
    'output.tco.label': 'Skupni strošek delodajalca (TCO)',
    'error.noSalary': 'Vnesite bruto plačo.',
    'error.invalidSalary': 'Vnesena vrednost plače ni veljavna.',
    'error.noRegionSelected': 'Izberite regijo.'
  });


  // Phase-L (L-3g): Swedish (SE) high-impact overrides
  Object.assign(translations.se_se, {
    'app.title': 'Lönekalkylator',
    'app.tagline': 'Professionella beräkningar av brutto‑till‑netto och TCO — i webbläsaren, utan spårning.',
    'app.inputs.title': 'Inmatning',
    'app.outputs.title': 'Resultat',
    'input.language.label': 'Språk',
    'input.country.label': 'Land',
    'input.year.label': 'År',
    'input.region.label': 'Region',
    'input.region.placeholder': 'Välj region…',
    'input.period.label': 'Inmatningsperiod',
    'input.period.monthly': 'Månadsvis',
    'input.period.yearly': 'Årsvis',
    'input.salary.label': 'Bruttolön',
    'input.calculate': 'Beräkna',
    'input.children.label': 'Barn (för inkomstskatt)',
    'input.salaryMonths.label': 'Lönemånader (12 eller 14)',
    'input.taxClass.label': 'Skatteklass (Tyskland)',
    
    'input.taxClass.none': '— Ej tillämpligt —','output.column.label': 'Benämning',
    'output.column.month': 'Månad',
    'output.column.year': 'År',
    'output.summary.title': 'Sammanfattning',
    'output.taxes.title': 'Skatter',
    'output.contrib.title': 'Sociala avgifter',
    'output.contrib.employee': 'Arbetstagaravgifter',
    'output.contrib.employer': 'Arbetsgivaravgifter',
    'output.net.title': 'Nettolön & TCO',
    'output.net.label': 'Nettolön',
    'output.tco.label': 'Total kostnad för arbetsgivaren (TCO)',
    'error.noSalary': 'Ange en bruttolön.',
    'error.invalidSalary': 'Lönebeloppet är ogiltigt.',
    'error.noRegionSelected': 'Välj en region.'
  });




  // Phase-L (L-6): localize result table row labels (output.*) for priority markets
  Object.assign(translations.de_de, {
    'output.gross.label': 'Bruttogehalt',
    'output.benefits.label': 'Geldwerter Vorteil (Sachbezug)',
    'output.taxes.income': 'Einkommensteuer',
    'output.taxes.other': 'Sonstige Steuern',
    'output.taxes.total': 'Summe Steuern',
    'output.contrib.totalEmployee': 'Summe Arbeitnehmerbeiträge',
    'output.contrib.totalEmployer': 'Summe Arbeitgeberbeiträge'
  });

  Object.assign(translations.es_es, {
    'output.gross.label': 'Salario bruto',
    'output.benefits.label': 'Beneficios',
    'output.taxes.income': 'Impuesto sobre la renta',
    'output.taxes.other': 'Otros impuestos',
    'output.taxes.total': 'Total de impuestos',
    'output.contrib.totalEmployee': 'Total cotizaciones del empleado',
    'output.contrib.totalEmployer': 'Total cotizaciones del empleador'
  });

  Object.assign(translations.fr_fr, {
    'output.gross.label': 'Salaire brut',
    'output.benefits.label': 'Avantages',
    'output.taxes.income': 'Impôt sur le revenu',
    'output.taxes.other': 'Autres impôts',
    'output.taxes.total': 'Total des impôts',
    'output.contrib.totalEmployee': 'Total cotisations salariales',
    'output.contrib.totalEmployer': 'Total cotisations patronales'
  });

  Object.assign(translations.it_it, {
    'output.gross.label': 'Stipendio lordo',
    'output.benefits.label': 'Benefici',
    'output.taxes.income': 'Imposta sul reddito',
    'output.taxes.other': 'Altre imposte',
    'output.taxes.total': 'Totale imposte',
    'output.contrib.totalEmployee': 'Totale contributi del dipendente',
    'output.contrib.totalEmployer': 'Totale contributi del datore di lavoro'
  });

  Object.assign(translations.pl_pl, {
    'output.gross.label': 'Wynagrodzenie brutto',
    'output.benefits.label': 'Świadczenia',
    'output.taxes.income': 'Podatek dochodowy',
    'output.taxes.other': 'Inne podatki',
    'output.taxes.total': 'Suma podatków',
    'output.contrib.totalEmployee': 'Suma składek pracownika',
    'output.contrib.totalEmployer': 'Suma składek pracodawcy'
  });

  Object.assign(translations.si_si, {
    'output.gross.label': 'Bruto plača',
    'output.benefits.label': 'Ugodnosti',
    'output.taxes.income': 'Dohodnina',
    'output.taxes.other': 'Drugi davki',
    'output.taxes.total': 'Skupaj davki',
    'output.contrib.totalEmployee': 'Skupaj prispevki zaposlenega',
    'output.contrib.totalEmployer': 'Skupaj prispevki delodajalca'
  });

  Object.assign(translations.se_se, {
    'output.gross.label': 'Bruttolön',
    'output.benefits.label': 'Förmåner',
    'output.taxes.income': 'Inkomstskatt',
    'output.taxes.other': 'Övriga skatter',
    'output.taxes.total': 'Totala skatter',
    'output.contrib.totalEmployee': 'Totala arbetstagaravgifter',
    'output.contrib.totalEmployer': 'Totala arbetsgivaravgifter'
  });



  // Phase-L (L-7): component label translations for engine-emitted row labels
  Object.assign(translations.en_intl, {
    'output.gross.label': 'Gross salary',
    'output.benefits.label': 'Benefits',
    'output.taxes.income': 'Income tax',
    'output.taxes.other': 'Other taxes',
    'output.taxes.total': 'Total taxes',
    'output.contrib.health': 'Health insurance',
    'output.contrib.pension': 'Pension insurance',
    'output.contrib.unemployment': 'Unemployment insurance',
    'output.contrib.care': 'Long-term care insurance',
    'output.contrib.totalEmployee': 'Total employee contributions',
    'output.contrib.totalEmployer': 'Total employer contributions',
    'output.net.label': 'Net salary',
    'output.tco.label': 'Total cost to employer (TCO)'
  });

  Object.assign(translations.de_de, {
    'output.gross.label': 'Bruttogehalt',
    'output.benefits.label': 'Geldwerter Vorteil (Sachbezug)',
    'output.taxes.income': 'Einkommensteuer',
    'output.taxes.other': 'Sonstige Steuern',
    'output.taxes.total': 'Summe Steuern',
    'output.contrib.health': 'Krankenversicherung',
    'output.contrib.pension': 'Rentenversicherung',
    'output.contrib.unemployment': 'Arbeitslosenversicherung',
    'output.contrib.care': 'Pflegeversicherung',
    'output.contrib.totalEmployee': 'Summe Arbeitnehmerbeiträge',
    'output.contrib.totalEmployer': 'Summe Arbeitgeberbeiträge',
    'output.net.label': 'Nettogehalt',
    'output.tco.label': 'Gesamtkosten Arbeitgeber (TCO)'
  });

  Object.assign(translations.es_es, {
    'output.gross.label': 'Salario bruto',
    'output.benefits.label': 'Beneficios',
    'output.taxes.income': 'Impuesto sobre la renta',
    'output.taxes.other': 'Otros impuestos',
    'output.taxes.total': 'Total de impuestos',
    'output.contrib.health': 'Seguro de salud',
    'output.contrib.pension': 'Seguro de pensiones',
    'output.contrib.unemployment': 'Seguro de desempleo',
    'output.contrib.care': 'Seguro de cuidados de larga duración',
    'output.contrib.totalEmployee': 'Total cotizaciones del empleado',
    'output.contrib.totalEmployer': 'Total cotizaciones del empleador',
    'output.net.label': 'Salario neto',
    'output.tco.label': 'Coste total del empleador (TCO)'
  });

  Object.assign(translations.fr_fr, {
    'output.gross.label': 'Salaire brut',
    'output.benefits.label': 'Avantages',
    'output.taxes.income': 'Impôt sur le revenu',
    'output.taxes.other': 'Autres impôts',
    'output.taxes.total': 'Total des impôts',
    'output.contrib.health': 'Assurance maladie',
    'output.contrib.pension': 'Assurance retraite',
    'output.contrib.unemployment': 'Assurance chômage',
    'output.contrib.care': 'Assurance dépendance',
    'output.contrib.totalEmployee': 'Total cotisations salariales',
    'output.contrib.totalEmployer': 'Total cotisations patronales',
    'output.net.label': 'Salaire net',
    'output.tco.label': 'Coût total employeur (TCO)'
  });

  Object.assign(translations.it_it, {
    'output.gross.label': 'Stipendio lordo',
    'output.benefits.label': 'Benefici',
    'output.taxes.income': 'Imposta sul reddito',
    'output.taxes.other': 'Altre imposte',
    'output.taxes.total': 'Totale imposte',
    'output.contrib.health': 'Assicurazione sanitaria',
    'output.contrib.pension': 'Assicurazione pensionistica',
    'output.contrib.unemployment': 'Assicurazione contro la disoccupazione',
    'output.contrib.care': 'Assicurazione per l’assistenza a lungo termine',
    'output.contrib.totalEmployee': 'Totale contributi del dipendente',
    'output.contrib.totalEmployer': 'Totale contributi del datore di lavoro',
    'output.net.label': 'Stipendio netto',
    'output.tco.label': 'Costo totale datore di lavoro (TCO)'
  });

  Object.assign(translations.pl_pl, {
    'output.gross.label': 'Wynagrodzenie brutto',
    'output.benefits.label': 'Świadczenia',
    'output.taxes.income': 'Podatek dochodowy',
    'output.taxes.other': 'Inne podatki',
    'output.taxes.total': 'Suma podatków',
    'output.contrib.health': 'Ubezpieczenie zdrowotne',
    'output.contrib.pension': 'Ubezpieczenie emerytalne',
    'output.contrib.unemployment': 'Ubezpieczenie od bezrobocia',
    'output.contrib.care': 'Ubezpieczenie opiekuńcze',
    'output.contrib.totalEmployee': 'Suma składek pracownika',
    'output.contrib.totalEmployer': 'Suma składek pracodawcy',
    'output.net.label': 'Wynagrodzenie netto',
    'output.tco.label': 'Całkowity koszt pracodawcy (TCO)'
  });

  Object.assign(translations.si_si, {
    'output.gross.label': 'Bruto plača',
    'output.benefits.label': 'Ugodnosti',
    'output.taxes.income': 'Dohodnina',
    'output.taxes.other': 'Drugi davki',
    'output.taxes.total': 'Skupaj davki',
    'output.contrib.health': 'Zdravstveno zavarovanje',
    'output.contrib.pension': 'Pokojninsko zavarovanje',
    'output.contrib.unemployment': 'Zavarovanje za primer brezposelnosti',
    'output.contrib.care': 'Zavarovanje za dolgotrajno oskrbo',
    'output.contrib.totalEmployee': 'Skupaj prispevki zaposlenega',
    'output.contrib.totalEmployer': 'Skupaj prispevki delodajalca',
    'output.net.label': 'Neto plača',
    'output.tco.label': 'Skupni strošek delodajalca (TCO)'
  });

  Object.assign(translations.se_se, {
    'output.gross.label': 'Bruttolön',
    'output.benefits.label': 'Förmåner',
    'output.taxes.income': 'Inkomstskatt',
    'output.taxes.other': 'Övriga skatter',
    'output.taxes.total': 'Totala skatter',
    'output.contrib.health': 'Sjukförsäkring',
    'output.contrib.pension': 'Pensionsförsäkring',
    'output.contrib.unemployment': 'Arbetslöshetsförsäkring',
    'output.contrib.care': 'Vårdförsäkring',
    'output.contrib.totalEmployee': 'Totala arbetstagaravgifter',
    'output.contrib.totalEmployer': 'Totala arbetsgivaravgifter',
    'output.net.label': 'Nettolön',
    'output.tco.label': 'Total arbetsgivarkostnad (TCO)'
  });



  // Phase-L (L-4): coverage completion for high-visibility remaining keys
  // Scope: countries, regions, notices, footer, generic errors, and remaining core labels.

  Object.assign(translations.de_de, {
    'app.error.generic': 'Ein unerwarteter Fehler ist aufgetreten. Bitte erneut versuchen.',
    'app.themeToggle': 'Dunkelmodus',
    'notice.atSalaryMonths': 'Österreich: 14 Gehaltsmonate = 12 regulär + 2 Sonderzahlungen (13./14. Gehalt).',
    'notice.deAccuracyBoundary': 'Hinweis (Deutschland): Die Einkommensteuer wird mit der offiziellen §32a EStG‑Formel 2026 berechnet (gegen den BMF‑Rechner validiert). Sozialabgaben sind in diesem Tool vereinfacht und können von der realen Abrechnung abweichen (z. B. Beitragsbemessungsgrenzen, Versicherungsdetails).',
    'footer.otherTools': 'Weitere Tools:',
    'footer.disclaimer': 'Kein Backend, keine Analytics; Berechnungen können reale Steuersysteme vereinfachen.',
    'country.DE': 'Deutschland',
    'country.ES': 'Spanien',
    'country.UK': 'Vereinigtes Königreich',
    'country.FR': 'Frankreich',
    'country.NL': 'Niederlande',
    'country.PL': 'Polen',
    'country.AT': 'Österreich',
    'country.SI': 'Slowenien',
    'country.SE': 'Schweden',
    'country.IT': 'Italien',
    'region.madrid': 'Madrid',
    'region.catalonia': 'Katalonien',
    'region.andalusia': 'Andalusien',
    'region.valencia': 'Valencia',
    'error.invalidTaxClass': 'Bitte eine gültige Steuerklasse für Deutschland auswählen.',
    'error.noCountryRules': 'Für das ausgewählte Land sind keine Regeln verfügbar.',
    'error.noYearRules': 'Für das ausgewählte Jahr sind keine Regeln verfügbar.',
    'error.salaryOutOfRange': 'Der Gehaltswert ist unrealistisch hoch. Bitte prüfen und erneut versuchen.'
  });

  Object.assign(translations.es_es, {
    'app.error.generic': 'Se produjo un error inesperado. Inténtelo de nuevo.',
    'app.themeToggle': 'Modo oscuro',
    'notice.atSalaryMonths': 'Austria: 14 pagas = 12 normales + 2 pagas extra (13.ª/14.ª).',
    'notice.deAccuracyBoundary': 'Nota (Alemania): El impuesto sobre la renta se calcula con la fórmula oficial §32a EStG 2026 (validada con la calculadora del BMF). Las cotizaciones sociales en esta herramienta están simplificadas y pueden diferir de una nómina real (p. ej., topes de cotización, detalles de seguros).',
    'footer.otherTools': 'Otras herramientas:',
    'footer.disclaimer': 'Sin backend, sin analítica; los cálculos pueden simplificar sistemas fiscales reales.',
    'country.DE': 'Alemania',
    'country.ES': 'España',
    'country.UK': 'Reino Unido',
    'country.FR': 'Francia',
    'country.NL': 'Países Bajos',
    'country.PL': 'Polonia',
    'country.AT': 'Austria',
    'country.SI': 'Eslovenia',
    'country.SE': 'Suecia',
    'country.IT': 'Italia',
    'region.madrid': 'Madrid',
    'region.catalonia': 'Cataluña',
    'region.andalusia': 'Andalucía',
    'region.valencia': 'Valencia',
    'error.invalidTaxClass': 'Seleccione una clase fiscal válida para Alemania.',
    'error.noCountryRules': 'No hay reglas disponibles para el país seleccionado.',
    'error.noYearRules': 'No hay reglas disponibles para el año seleccionado.',
    'error.salaryOutOfRange': 'El valor del salario es inusualmente alto. Revíselo e inténtelo de nuevo.'
  });

  Object.assign(translations.fr_fr, {
    'app.error.generic': 'Une erreur inattendue est survenue. Veuillez réessayer.',
    'app.themeToggle': 'Mode sombre',
    'notice.atSalaryMonths': 'Autriche : 14 mois de salaire = 12 réguliers + 2 salaires spéciaux (13e/14e).',
    'notice.deAccuracyBoundary': 'Note (Allemagne) : l’impôt sur le revenu est calculé selon la formule officielle §32a EStG 2026 (validée avec le calculateur du BMF). Les cotisations sociales sont simplifiées et peuvent différer d’une paie réelle (plafonds, spécificités d’assurance, etc.).',
    'footer.otherTools': 'Autres outils :',
    'footer.disclaimer': 'Aucun backend, aucune analytics ; les calculs peuvent simplifier des systèmes fiscaux réels.',
    'country.DE': 'Allemagne',
    'country.ES': 'Espagne',
    'country.UK': 'Royaume-Uni',
    'country.FR': 'France',
    'country.NL': 'Pays-Bas',
    'country.PL': 'Pologne',
    'country.AT': 'Autriche',
    'country.SI': 'Slovénie',
    'country.SE': 'Suède',
    'country.IT': 'Italie',
    'region.madrid': 'Madrid',
    'region.catalonia': 'Catalogne',
    'region.andalusia': 'Andalousie',
    'region.valencia': 'Valence',
    'error.invalidTaxClass': 'Veuillez sélectionner une classe d’imposition valide pour l’Allemagne.',
    'error.noCountryRules': 'Aucune règle disponible pour le pays sélectionné.',
    'error.noYearRules': 'Aucune règle disponible pour l’année sélectionnée.',
    'error.salaryOutOfRange': 'La valeur du salaire est anormalement élevée. Vérifiez et réessayez.'
  });

  Object.assign(translations.it_it, {
    'app.error.generic': 'Si è verificato un errore imprevisto. Riprova.',
    'app.themeToggle': 'Modalità scura',
    'notice.atSalaryMonths': 'Austria: 14 mensilità = 12 ordinarie + 2 mensilità speciali (13ª/14ª).',
    'notice.deAccuracyBoundary': 'Nota (Germania): l’imposta sul reddito è calcolata con la formula ufficiale §32a EStG 2026 (validata con il calcolatore BMF). I contributi sociali sono semplificati e possono differire da una busta paga reale (massimali, assicurazioni, ecc.).',
    'footer.otherTools': 'Altri strumenti:',
    'footer.disclaimer': 'Nessun backend, nessuna analytics; i calcoli possono semplificare sistemi fiscali reali.',
    'country.DE': 'Germania',
    'country.ES': 'Spagna',
    'country.UK': 'Regno Unito',
    'country.FR': 'Francia',
    'country.NL': 'Paesi Bassi',
    'country.PL': 'Polonia',
    'country.AT': 'Austria',
    'country.SI': 'Slovenia',
    'country.SE': 'Svezia',
    'country.IT': 'Italia',
    'region.madrid': 'Madrid',
    'region.catalonia': 'Catalogna',
    'region.andalusia': 'Andalusia',
    'region.valencia': 'Valencia',
    'error.invalidTaxClass': 'Seleziona una classe fiscale valida per la Germania.',
    'error.noCountryRules': 'Nessuna regola disponibile per il paese selezionato.',
    'error.noYearRules': 'Nessuna regola disponibile per l’anno selezionato.',
    'error.salaryOutOfRange': 'Il valore dello stipendio è insolitamente alto. Controlla e riprova.'
  });

  Object.assign(translations.pl_pl, {
    'app.error.generic': 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
    'app.themeToggle': 'Tryb ciemny',
    'notice.atSalaryMonths': 'Austria: 14 wypłat = 12 regularnych + 2 wypłaty specjalne (13./14.).',
    'notice.deAccuracyBoundary': 'Uwaga (Niemcy): podatek dochodowy liczony jest wg oficjalnej formuły §32a EStG 2026 (zweryfikowanej z kalkulatorem BMF). Składki w tym narzędziu są uproszczone i mogą różnić się od rzeczywistej listy płac (np. limity, ubezpieczenia).',
    'footer.otherTools': 'Inne narzędzia:',
    'footer.disclaimer': 'Brak backendu, brak analityki; obliczenia mogą upraszczać rzeczywiste systemy podatkowe.',
    'country.DE': 'Niemcy',
    'country.ES': 'Hiszpania',
    'country.UK': 'Wielka Brytania',
    'country.FR': 'Francja',
    'country.NL': 'Niderlandy',
    'country.PL': 'Polska',
    'country.AT': 'Austria',
    'country.SI': 'Słowenia',
    'country.SE': 'Szwecja',
    'country.IT': 'Włochy',
    'region.madrid': 'Madryt',
    'region.catalonia': 'Katalonia',
    'region.andalusia': 'Andaluzja',
    'region.valencia': 'Walencja',
    'error.invalidTaxClass': 'Wybierz prawidłową klasę podatkową dla Niemiec.',
    'error.noCountryRules': 'Brak reguł dla wybranego kraju.',
    'error.noYearRules': 'Brak reguł dla wybranego roku.',
    'error.salaryOutOfRange': 'Wartość wynagrodzenia jest nierealistycznie wysoka. Sprawdź i spróbuj ponownie.'
  });

  Object.assign(translations.si_si, {
    'app.error.generic': 'Prišlo je do nepričakovane napake. Poskusite znova.',
    'app.themeToggle': 'Temni način',
    'notice.atSalaryMonths': 'Avstrija: 14 izplačil = 12 rednih + 2 posebni izplačili (13./14.).',
    'notice.deAccuracyBoundary': 'Opomba (Nemčija): dohodnina je izračunana po uradni formuli §32a EStG 2026 (validirano z BMF kalkulatorjem). Prispevki so poenostavljeni in se lahko razlikujejo od dejanske plačilne liste (npr. meje, zavarovanja).',
    'footer.otherTools': 'Druga orodja:',
    'footer.disclaimer': 'Brez backenda, brez analitike; izračuni lahko poenostavljajo dejanske davčne sisteme.',
    'country.DE': 'Nemčija',
    'country.ES': 'Španija',
    'country.UK': 'Združeno kraljestvo',
    'country.FR': 'Francija',
    'country.NL': 'Nizozemska',
    'country.PL': 'Poljska',
    'country.AT': 'Avstrija',
    'country.SI': 'Slovenija',
    'country.SE': 'Švedska',
    'country.IT': 'Italija',
    'region.madrid': 'Madrid',
    'region.catalonia': 'Katalonija',
    'region.andalusia': 'Andaluzija',
    'region.valencia': 'Valencia',
    'error.invalidTaxClass': 'Izberite veljaven davčni razred za Nemčijo.',
    'error.noCountryRules': 'Za izbrano državo ni na voljo pravil.',
    'error.noYearRules': 'Za izbrano leto ni na voljo pravil.',
    'error.salaryOutOfRange': 'Vrednost plače je nerealno visoka. Preverite in poskusite znova.'
  });

  Object.assign(translations.se_se, {
    'app.error.generic': 'Ett oväntat fel inträffade. Försök igen.',
    'app.themeToggle': 'Mörkt läge',
    'notice.atSalaryMonths': 'Österrike: 14 löneutbetalningar = 12 ordinarie + 2 extra (13:e/14:e).',
    'notice.deAccuracyBoundary': 'Not (Tyskland): inkomstskatten beräknas enligt den officiella §32a EStG 2026‑formeln (validerad mot BMF‑kalkylatorn). Sociala avgifter är förenklade och kan avvika från verklig lön (t.ex. tak, försäkringsdetaljer).',
    'footer.otherTools': 'Andra verktyg:',
    'footer.disclaimer': 'Ingen backend, ingen analys; beräkningar kan förenkla verkliga skattesystem.',
    'country.DE': 'Tyskland',
    'country.ES': 'Spanien',
    'country.UK': 'Storbritannien',
    'country.FR': 'Frankrike',
    'country.NL': 'Nederländerna',
    'country.PL': 'Polen',
    'country.AT': 'Österrike',
    'country.SI': 'Slovenien',
    'country.SE': 'Sverige',
    'country.IT': 'Italien',
    'region.madrid': 'Madrid',
    'region.catalonia': 'Katalonien',
    'region.andalusia': 'Andalusien',
    'region.valencia': 'Valencia',
    'error.invalidTaxClass': 'Välj en giltig skatteklass för Tyskland.',
    'error.noCountryRules': 'Inga regler finns för valt land.',
    'error.noYearRules': 'Inga regler finns för valt år.',
    'error.salaryOutOfRange': 'Lönebeloppet är orealistiskt högt. Kontrollera och försök igen.'
  });


  let currentLang = 'en_intl';

  function t(key) {
    const langDict = translations[currentLang] || {};
    const baseDict = translations.en_intl || {};
    if (langDict[key] != null) return langDict[key];
    if (baseDict[key] != null) return baseDict[key];
    return key;
  }

  function setLang(langKey) {
    if (translations[langKey]) {
      currentLang = langKey;
      applyTranslations(document);
    }
  }

  function getLang() {
    return currentLang;
  }

  function applyTranslations(root) {
    const container = root || document;
    const nodes = container.querySelectorAll('[data-i18n]');
    nodes.forEach((node) => {
      const key = node.getAttribute('data-i18n');
      if (!key) return;
      const text = t(key);
      node.textContent = text;
    });
  }
  // Phase-L8: component-level output label overrides for cross-market contributions.
  // These labels originate from rules JSON and need deterministic i18n mapping.

  Object.assign(translations.en_intl, {
    'output.es.contrib.socialSecurityGeneral': 'Social Security (general regime)',
    'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (Class 1)',
    'output.fr.contrib.employeeUncapped': 'Employee social contrib (uncapped)',
    'output.fr.contrib.employeeCapped': 'Employee social contrib (capped)',
    'output.nl.contrib.zvwEmployerLevy': 'Zvw employer levy (bijdrage Zvw werkgever)',
    'output.pl.contrib.health': 'Health insurance (zdrowotne)',
    'output.pl.contrib.oldAgePension': 'Old-age pension insurance (emerytalne)',
    'output.pl.contrib.disabilitySurvivors': 'Disability & survivors insurance (rentowe)',
    'output.pl.contrib.sickness': 'Sickness insurance (chorobowe)',
    'output.pl.contrib.accident': 'Accident insurance (wypadkowe)',
    'output.pl.contrib.labourFund': 'Labour Fund (FP)',
    'output.pl.contrib.fgsp': 'Guaranteed Employee Benefits Fund (FGŚP)',
    'output.contrib.accident': 'Accident insurance',
    'output.si.contrib.healthZZZS': 'Health insurance (ZZZS)',
    'output.si.contrib.pensionDisabilityZPIZ': 'Pension & disability (ZPIZ)',
    'output.si.contrib.parentalProtection': 'Parental protection',
    'output.si.contrib.occupationalInjuryDisease': 'Occupational injury/disease',
    'output.se.contrib.employerSocialAgg': 'Employer social contributions (aggregated)',
    'output.it.contrib.healthcareMinor': 'Healthcare / minor INPS components (approx.)',
    'output.it.contrib.inpsAggregate': 'INPS previdenza (aggregated employee + employer)',
    'output.it.contrib.unemploymentIncluded': 'Unemployment contributions (included in INPS aggregate)',
  });

  Object.assign(translations.de_de, {
    'output.es.contrib.socialSecurityGeneral': 'Sozialversicherung (allg. Regime)',
    'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (Klasse 1)',
    'output.fr.contrib.employeeUncapped': 'AN-Sozialbeitrag (ohne Kappung)',
    'output.fr.contrib.employeeCapped': 'AN-Sozialbeitrag (gekappelt)',
    'output.nl.contrib.zvwEmployerLevy': 'Zvw-Arbeitgeberabgabe (bijdrage Zvw werkgever)',
    'output.pl.contrib.health': 'Krankenversicherung (zdrowotne)',
    'output.pl.contrib.oldAgePension': 'Rentenversicherung (emerytalne)',
    'output.pl.contrib.disabilitySurvivors': 'Invaliditäts-/Hinterbliebenenversicherung (rentowe)',
    'output.pl.contrib.sickness': 'Krankengeldversicherung (chorobowe)',
    'output.pl.contrib.accident': 'Unfallversicherung (wypadkowe)',
    'output.pl.contrib.labourFund': 'Arbeitsfonds (FP)',
    'output.pl.contrib.fgsp': 'Garantiefonds Arbeitnehmerleistungen (FGŚP)',
    'output.contrib.accident': 'Unfallversicherung',
    'output.si.contrib.healthZZZS': 'Krankenversicherung (ZZZS)',
    'output.si.contrib.pensionDisabilityZPIZ': 'Rente & Invalidität (ZPIZ)',
    'output.si.contrib.parentalProtection': 'Elternschutz',
    'output.si.contrib.occupationalInjuryDisease': 'Arbeitsunfall/Berufskrankheit',
    'output.se.contrib.employerSocialAgg': 'Arbeitgeber-Sozialbeiträge (gesamt)',
    'output.it.contrib.healthcareMinor': 'Gesundheit / kleinere INPS-Komponenten (ca.)',
    'output.it.contrib.inpsAggregate': 'INPS (gesamt: AN + AG)',
    'output.it.contrib.unemploymentIncluded': 'Arbeitslosenbeitrag (im INPS-Block enthalten)',
  });

  Object.assign(translations.es_es, {
    'output.es.contrib.socialSecurityGeneral': 'Seguridad Social (régimen general)',
    'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (clase 1)',
    'output.fr.contrib.employeeUncapped': 'Cotización del empleado (sin tope)',
    'output.fr.contrib.employeeCapped': 'Cotización del empleado (con tope)',
    'output.nl.contrib.zvwEmployerLevy': 'Gravamen Zvw del empleador (bijdrage Zvw werkgever)',
    'output.pl.contrib.health': 'Seguro de salud (zdrowotne)',
    'output.pl.contrib.oldAgePension': 'Seguro de pensión (emerytalne)',
    'output.pl.contrib.disabilitySurvivors': 'Invalidez y supervivencia (rentowe)',
    'output.pl.contrib.sickness': 'Seguro por enfermedad (chorobowe)',
    'output.pl.contrib.accident': 'Seguro de accidentes (wypadkowe)',
    'output.pl.contrib.labourFund': 'Fondo de Trabajo (FP)',
    'output.pl.contrib.fgsp': 'Fondo de Garantía de Prestaciones (FGŚP)',
    'output.contrib.accident': 'Seguro de accidentes',
    'output.si.contrib.healthZZZS': 'Seguro de salud (ZZZS)',
    'output.si.contrib.pensionDisabilityZPIZ': 'Pensión e invalidez (ZPIZ)',
    'output.si.contrib.parentalProtection': 'Protección parental',
    'output.si.contrib.occupationalInjuryDisease': 'Accidente/enfermedad laboral',
    'output.se.contrib.employerSocialAgg': 'Cotizaciones del empleador (agregadas)',
    'output.it.contrib.healthcareMinor': 'Sanidad / componentes menores de INPS (aprox.)',
    'output.it.contrib.inpsAggregate': 'INPS previsión (agregado empleado + empleador)',
    'output.it.contrib.unemploymentIncluded': 'Desempleo (incluido en el agregado INPS)',
  });

  Object.assign(translations.fr_fr, {
    'output.es.contrib.socialSecurityGeneral': 'Sécurité sociale (régime général)',
    'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (classe 1)',
    'output.fr.contrib.employeeUncapped': 'Cotisations salariales (non plafonnées)',
    'output.fr.contrib.employeeCapped': 'Cotisations salariales (plafonnées)',
    'output.nl.contrib.zvwEmployerLevy': 'Prélèvement Zvw employeur (bijdrage Zvw werkgever)',
    'output.pl.contrib.health': 'Assurance maladie (zdrowotne)',
    'output.pl.contrib.oldAgePension': 'Assurance retraite (emerytalne)',
    'output.pl.contrib.disabilitySurvivors': 'Invalidité et survivants (rentowe)',
    'output.pl.contrib.sickness': 'Assurance maladie (indemnités) (chorobowe)',
    'output.pl.contrib.accident': 'Assurance accident (wypadkowe)',
    'output.pl.contrib.labourFund': 'Fonds du travail (FP)',
    'output.pl.contrib.fgsp': 'Fonds de garantie des prestations (FGŚP)',
    'output.contrib.accident': 'Assurance accident',
    'output.si.contrib.healthZZZS': 'Assurance maladie (ZZZS)',
    'output.si.contrib.pensionDisabilityZPIZ': 'Retraite et invalidité (ZPIZ)',
    'output.si.contrib.parentalProtection': 'Protection parentale',
    'output.si.contrib.occupationalInjuryDisease': 'Accident/maladie professionnelle',
    'output.se.contrib.employerSocialAgg': 'Cotisations patronales (agrégées)',
    'output.it.contrib.healthcareMinor': 'Santé / composants INPS mineurs (approx.)',
    'output.it.contrib.inpsAggregate': 'INPS prévoyance (agrégé salarié + employeur)',
    'output.it.contrib.unemploymentIncluded': 'Chômage (inclus dans l’agrégat INPS)',
  });

  Object.assign(translations.it_it, {
    'output.es.contrib.socialSecurityGeneral': 'Previdenza sociale (regime generale)',
    'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (classe 1)',
    'output.fr.contrib.employeeUncapped': 'Contributi dipendente (non plafonati)',
    'output.fr.contrib.employeeCapped': 'Contributi dipendente (plafonati)',
    'output.nl.contrib.zvwEmployerLevy': 'Contributo Zvw datore di lavoro (bijdrage Zvw werkgever)',
    'output.pl.contrib.health': 'Assicurazione sanitaria (zdrowotne)',
    'output.pl.contrib.oldAgePension': 'Assicurazione pensionistica (emerytalne)',
    'output.pl.contrib.disabilitySurvivors': 'Invalidità e superstiti (rentowe)',
    'output.pl.contrib.sickness': 'Assicurazione malattia (chorobowe)',
    'output.pl.contrib.accident': 'Assicurazione infortuni (wypadkowe)',
    'output.pl.contrib.labourFund': 'Fondo del lavoro (FP)',
    'output.pl.contrib.fgsp': 'Fondo di garanzia delle prestazioni (FGŚP)',
    'output.contrib.accident': 'Assicurazione infortuni',
    'output.si.contrib.healthZZZS': 'Assicurazione sanitaria (ZZZS)',
    'output.si.contrib.pensionDisabilityZPIZ': 'Pensione e invalidità (ZPIZ)',
    'output.si.contrib.parentalProtection': 'Tutela genitoriale',
    'output.si.contrib.occupationalInjuryDisease': 'Infortunio/malattia professionale',
    'output.se.contrib.employerSocialAgg': 'Contributi datore di lavoro (aggregati)',
    'output.it.contrib.healthcareMinor': 'Sanità / componenti minori INPS (circa)',
    'output.it.contrib.inpsAggregate': 'INPS previdenza (aggregato dipendente + datore)',
    'output.it.contrib.unemploymentIncluded': 'Disoccupazione (inclusa nell’aggregato INPS)',
  });

  Object.assign(translations.pl_pl, {
    'output.es.contrib.socialSecurityGeneral': 'Ubezpieczenie społeczne (reżim ogólny)',
    'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (klasa 1)',
    'output.fr.contrib.employeeUncapped': 'Składki pracownika (bez limitu)',
    'output.fr.contrib.employeeCapped': 'Składki pracownika (z limitem)',
    'output.nl.contrib.zvwEmployerLevy': 'Składka pracodawcy Zvw (bijdrage Zvw werkgever)',
    'output.pl.contrib.health': 'Ubezpieczenie zdrowotne (zdrowotne)',
    'output.pl.contrib.oldAgePension': 'Ubezpieczenie emerytalne (emerytalne)',
    'output.pl.contrib.disabilitySurvivors': 'Ubezpieczenie rentowe (rentowe)',
    'output.pl.contrib.sickness': 'Ubezpieczenie chorobowe (chorobowe)',
    'output.pl.contrib.accident': 'Ubezpieczenie wypadkowe (wypadkowe)',
    'output.pl.contrib.labourFund': 'Fundusz Pracy (FP)',
    'output.pl.contrib.fgsp': 'FGŚP (Fundusz Gwarantowanych Świadczeń Pracowniczych)',
    'output.contrib.accident': 'Ubezpieczenie wypadkowe',
    'output.si.contrib.healthZZZS': 'Ubezpieczenie zdrowotne (ZZZS)',
    'output.si.contrib.pensionDisabilityZPIZ': 'Emerytura i niezdolność (ZPIZ)',
    'output.si.contrib.parentalProtection': 'Ochrona rodzicielska',
    'output.si.contrib.occupationalInjuryDisease': 'Wypadek/choroba zawodowa',
    'output.se.contrib.employerSocialAgg': 'Składki pracodawcy (łącznie)',
    'output.it.contrib.healthcareMinor': 'Zdrowie / drobne składniki INPS (≈)',
    'output.it.contrib.inpsAggregate': 'INPS (łącznie pracownik + pracodawca)',
    'output.it.contrib.unemploymentIncluded': 'Bezrobocie (wliczone w INPS)',
  });

  Object.assign(translations.si_si, {
    'output.es.contrib.socialSecurityGeneral': 'Socialna varnost (splošni režim)',
    'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (razred 1)',
    'output.fr.contrib.employeeUncapped': 'Prispevki zaposlenega (brez omejitve)',
    'output.fr.contrib.employeeCapped': 'Prispevki zaposlenega (z omejitvijo)',
    'output.nl.contrib.zvwEmployerLevy': 'Prispevek delodajalca Zvw (bijdrage Zvw werkgever)',
    'output.pl.contrib.health': 'Zdravstveno zavarovanje (zdrowotne)',
    'output.pl.contrib.oldAgePension': 'Pokojninsko zavarovanje (emerytalne)',
    'output.pl.contrib.disabilitySurvivors': 'Invalidnost in svojci (rentowe)',
    'output.pl.contrib.sickness': 'Zavarovanje za bolezen (chorobowe)',
    'output.pl.contrib.accident': 'Nezgodno zavarovanje (wypadkowe)',
    'output.pl.contrib.labourFund': 'Sklad dela (FP)',
    'output.pl.contrib.fgsp': 'Jamstveni sklad pravic (FGŚP)',
    'output.contrib.accident': 'Nezgodno zavarovanje',
    'output.si.contrib.healthZZZS': 'Zdravstveno zavarovanje (ZZZS)',
    'output.si.contrib.pensionDisabilityZPIZ': 'Pokojninsko in invalidsko (ZPIZ)',
    'output.si.contrib.parentalProtection': 'Starševsko varstvo',
    'output.si.contrib.occupationalInjuryDisease': 'Poškodba/poklicna bolezen',
    'output.se.contrib.employerSocialAgg': 'Prispevki delodajalca (skupaj)',
    'output.it.contrib.healthcareMinor': 'Zdravstvo / manjše komponente INPS (≈)',
    'output.it.contrib.inpsAggregate': 'INPS (skupaj zaposleni + delodajalec)',
    'output.it.contrib.unemploymentIncluded': 'Brezposelnost (vključeno v INPS)',
  });

  Object.assign(translations.se_se, {
    'output.es.contrib.socialSecurityGeneral': 'Socialförsäkring (allmän ordning)',
    'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (klass 1)',
    'output.fr.contrib.employeeUncapped': 'Arbetstagaravgift (utan tak)',
    'output.fr.contrib.employeeCapped': 'Arbetstagaravgift (med tak)',
    'output.nl.contrib.zvwEmployerLevy': 'Zvw-arbetsgivaravgift (bijdrage Zvw werkgever)',
    'output.pl.contrib.health': 'Sjukförsäkring (zdrowotne)',
    'output.pl.contrib.oldAgePension': 'Pensionsförsäkring (emerytalne)',
    'output.pl.contrib.disabilitySurvivors': 'Invaliditet/efterlevande (rentowe)',
    'output.pl.contrib.sickness': 'Sjukförsäkring (ersättning) (chorobowe)',
    'output.pl.contrib.accident': 'Olycksfallsförsäkring (wypadkowe)',
    'output.pl.contrib.labourFund': 'Arbetsfond (FP)',
    'output.pl.contrib.fgsp': 'Garantifond för förmåner (FGŚP)',
    'output.contrib.accident': 'Olycksfallsförsäkring',
    'output.si.contrib.healthZZZS': 'Sjukförsäkring (ZZZS)',
    'output.si.contrib.pensionDisabilityZPIZ': 'Pension och invaliditet (ZPIZ)',
    'output.si.contrib.parentalProtection': 'Föräldraförsäkring',
    'output.si.contrib.occupationalInjuryDisease': 'Arbetsskada/yrkessjukdom',
    'output.se.contrib.employerSocialAgg': 'Arbetsgivaravgifter (samlat)',
    'output.it.contrib.healthcareMinor': 'Sjukvård / mindre INPS-delar (≈)',
    'output.it.contrib.inpsAggregate': 'INPS (samlat arbetstagare + arbetsgivare)',
    'output.it.contrib.unemploymentIncluded': 'Arbetslöshet (ingår i INPS)',
  });



  const SalaryI18N = {
    t,
    setLang,
    getLang,
    applyTranslations
  };

  window.SalaryI18N = SalaryI18N;

  // Initial pass
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () =>
      applyTranslations(document)
    );
  } else {
    applyTranslations(document);
  }


  // Phase-L11: fix UK National Insurance label localization per language
  Object.assign(translations.en_intl, { 'output.uk.contrib.nationalInsuranceClass1': 'National Insurance (Class 1)' });
  Object.assign(translations.de_de,  { 'output.uk.contrib.nationalInsuranceClass1': 'Sozialversicherung (Klasse 1)' });
  Object.assign(translations.es_es,  { 'output.uk.contrib.nationalInsuranceClass1': 'Seguro nacional (clase 1)' });
  Object.assign(translations.fr_fr,  { 'output.uk.contrib.nationalInsuranceClass1': 'Assurance nationale (classe 1)' });
  Object.assign(translations.it_it,  { 'output.uk.contrib.nationalInsuranceClass1': 'Assicurazione nazionale (classe 1)' });
  Object.assign(translations.pl_pl,  { 'output.uk.contrib.nationalInsuranceClass1': 'Ubezpieczenie społeczne (klasa 1)' });
  Object.assign(translations.si_si,  { 'output.uk.contrib.nationalInsuranceClass1': 'Nacionalno zavarovanje (razred 1)' });
  Object.assign(translations.se_se,  { 'output.uk.contrib.nationalInsuranceClass1': 'Nationell försäkring (klass 1)' });


  // Phase-L (Option A): Keep per-language buckets complete when new keys are added to en_intl.
  // This copies missing keys from en_intl into each bucket WITHOUT overwriting any existing translations.
  function syncBucketsFromBase() {
    const base = translations.en_intl || {};
    const bucketKeys = (typeof buckets === 'object' && buckets) ? Object.keys(buckets) : [];
    bucketKeys.forEach((langKey) => {
      if (!langKey || langKey === 'en_intl') return;
      const target = translations[langKey];
      if (!target) return;

      Object.keys(base).forEach((k) => {
        if (!(k in target)) target[k] = base[k];
      });
    });
  }

  // Run once after all overrides (including any late fixes) so buckets remain non-leaky.
  syncBucketsFromBase();


})(window);