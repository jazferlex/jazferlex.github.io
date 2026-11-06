const UNKNOWN = 'Unknown';

// Browser tokens overlap. Match the more specific variants before Chrome or Safari.
const browsers = [
  ['Edge', /\b(?:Edg|EdgA|EdgiOS|Edge)\//i],
  ['Opera', /\b(?:OPR|OPiOS|Opera)\//i],
  ['Samsung Internet', /\bSamsungBrowser\//i],
  ['Firefox', /\b(?:Firefox|FxiOS)\//i],
  ['Chrome', /\b(?:Chrome|CriOS|HeadlessChrome|Chromium)\//i],
  ['Internet Explorer', /\b(?:MSIE |Trident\/)/i],
  ['Safari', /\bSafari\//i]
];

const operatingSystems = [
  ['Windows', /\b(?:Windows Phone|Windows NT)\b/i],
  ['iOS', /\b(?:iPhone|iPad|iPod)\b/i],
  ['Android', /\bAndroid\b/i],
  ['ChromeOS', /\bCrOS\b/i],
  ['macOS', /\bMac OS X\b/i],
  ['Linux', /\bLinux\b/i]
];

function family(userAgent, patterns) {
  return patterns.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? UNKNOWN;
}

export function classifyVisit(headers) {
  const country = headers.get('x-vercel-ip-country') || '';
  const region = headers.get('x-vercel-ip-country-region') || '';
  const validCountry = /^[A-Z]{2}$/i.test(country);
  const userAgent = headers.get('user-agent') || '';
  return {
    country: validCountry ? country.toUpperCase() : UNKNOWN,
    region: validCountry && /^[A-Z0-9]{1,3}$/i.test(region) ? `${country}-${region}`.toUpperCase() : UNKNOWN,
    browser: family(userAgent, browsers),
    operatingSystem: family(userAgent, operatingSystems)
  };
}

const manilaDate = "(now() AT TIME ZONE 'Asia/Manila')::date";

export class VisitRepository {
  constructor(pool) { this.pool = pool; }

  async record({country, region, browser, operatingSystem}) {
    await this.pool.query(`
      INSERT INTO portfolio_visit_counts (day, dimension, label)
      SELECT ${manilaDate}, dimension, label
      FROM (VALUES ('days',''), ('countries',$1), ('regions',$2), ('browsers',$3), ('operatingSystems',$4)) AS visit(dimension, label)
      ON CONFLICT (day, dimension, label) DO UPDATE SET views=portfolio_visit_counts.views+1
    `, [country, region, browser, operatingSystem]);
  }

  async summary() {
    const {rows} = await this.pool.query(`
      WITH report_days AS (
        SELECT ${manilaDate} - offset_days AS day
        FROM generate_series(0,29) AS offsets(offset_days)
      )
      SELECT 'days' AS dimension, to_char(d.day,'YYYY-MM-DD') COLLATE "C" AS label,
        COALESCE(v.views,0) AS count
      FROM report_days AS d
      LEFT JOIN portfolio_visit_counts AS v ON v.day=d.day AND v.dimension='days'
      UNION ALL
      SELECT dimension, label, sum(views) AS count
      FROM portfolio_visit_counts JOIN report_days USING (day)
      WHERE dimension<>'days'
      GROUP BY dimension, label
      ORDER BY dimension, count DESC, label
    `);
    const summary = {total: 0, days: [], countries: [], regions: [], browsers: [], operatingSystems: []};
    for (const {dimension, label, count} of rows) {
      const views = Number(count);
      if (dimension === 'days') {
        summary.days.push({date: label, count: views});
        summary.total += views;
      } else {
        summary[dimension].push({label, count: views});
      }
    }
    summary.days.sort((first, second) => first.date.localeCompare(second.date));
    return summary;
  }
}
