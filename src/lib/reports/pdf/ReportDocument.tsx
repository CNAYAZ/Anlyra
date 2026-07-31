import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Rect,
  Line,
  Path,
} from '@react-pdf/renderer';
import type { ReportConfig, ReportSection } from '../types';
import type { ReportPayload } from '../sample-data';
import { PDF_STRINGS } from './i18n';

const COLORS = {
  primary: '#1e3a5f',
  primaryAccent: '#3b82f6',
  primaryHover: '#2563eb',
  accent: '#0d9488',
  accentLight: '#2dd4bf',
  success: '#16a34a',
  warning: '#f59e0b',
  danger: '#dc2626',
  bgLight: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate500: '#64748b',
  slate700: '#334155',
  slate900: '#0f172a',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontSize: 10,
    color: COLORS.slate900,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
  },
  cover: {
    flex: 1,
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    paddingTop: 96,
    paddingBottom: 64,
    paddingHorizontal: 56,
    justifyContent: 'space-between',
  },
  coverBrand: {
    fontSize: 12,
    letterSpacing: 4,
    color: COLORS.accentLight,
    fontFamily: 'Helvetica-Bold',
  },
  coverTitle: {
    fontSize: 36,
    fontFamily: 'Helvetica-Bold',
    marginTop: 12,
    color: COLORS.white,
  },
  coverSubtitle: {
    fontSize: 14,
    color: COLORS.accentLight,
    marginTop: 16,
  },
  coverMeta: {
    marginTop: 32,
    fontSize: 11,
    color: COLORS.slate200,
  },
  coverFooter: {
    fontSize: 9,
    color: COLORS.slate300,
    letterSpacing: 1,
  },
  sectionHeader: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 4,
  },
  sectionRule: {
    height: 2,
    width: 36,
    backgroundColor: COLORS.accent,
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 10,
    color: COLORS.slate700,
    marginBottom: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  kpiCard: {
    width: '33.33%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  kpiCardInner: {
    backgroundColor: COLORS.slate100,
    borderRadius: 8,
    padding: 10,
  },
  kpiLabel: {
    fontSize: 8,
    color: COLORS.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate900,
    marginTop: 4,
  },
  table: {
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    marginTop: 6,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
    paddingVertical: 6,
  },
  tableHead: {
    backgroundColor: COLORS.slate100,
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 6,
    fontSize: 9,
    color: COLORS.slate700,
  },
  tableCellHead: {
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate900,
    fontSize: 9,
  },
  recommendation: {
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
    paddingLeft: 12,
    marginBottom: 12,
  },
  recommendationTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate900,
    marginBottom: 2,
  },
  badge: {
    fontSize: 8,
    color: COLORS.white,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  pageHeader: {
    position: 'absolute',
    top: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: COLORS.slate500,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
    paddingBottom: 6,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: COLORS.slate500,
  },
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomStyle: 'dashed',
    borderBottomColor: COLORS.slate200,
  },
  tocLabel: { fontSize: 11, color: COLORS.slate900 },
  tocPage: { fontSize: 11, color: COLORS.slate500, fontFamily: 'Helvetica-Bold' },
});

export interface ReportDocumentProps {
  config: ReportConfig;
  payload: ReportPayload;
}

export function ReportDocument({ config, payload }: ReportDocumentProps) {
  const lang = config.language;
  const s = PDF_STRINGS[lang];
  const sections = config.sections;

  const fmtCurrency = (n: number) =>
    new Intl.NumberFormat(lang === 'it' ? 'it-IT' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(n);
  const fmtPct = (n: number) =>
    new Intl.NumberFormat(lang === 'it' ? 'it-IT' : 'en-US', {
      style: 'percent',
      maximumFractionDigits: 1,
    }).format(n);
  const fmtDate = (d: string) =>
    new Intl.DateTimeFormat(lang === 'it' ? 'it-IT' : 'en-US', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(new Date(d));

  return (
    <Document
      title={config.title}
      author={payload.organization.name}
      creator="Pro Analytics"
      producer="Pro Analytics"
    >
      {/* Cover */}
      <Page size="A4" style={{ padding: 0 }}>
        <View style={styles.cover}>
          <View>
            <Text style={styles.coverBrand}>PRO ANALYTICS</Text>
            <Text style={styles.coverTitle}>{config.title}</Text>
            <Text style={styles.coverSubtitle}>{s.coverTitle}</Text>
            <View style={styles.coverMeta}>
              <Text>
                {s.coverFor}: {payload.organization.name}
              </Text>
              <Text>
                {s.period}: {payload.period.label}
              </Text>
              <Text>
                {s.coverDate}: {fmtDate(payload.generatedAt)}
              </Text>
            </View>
          </View>
          <Text style={styles.coverFooter}>{s.poweredBy}</Text>
        </View>
      </Page>

      {/* TOC */}
      <Page size="A4" style={styles.page}>
        <Header config={config} />
        <Text style={styles.sectionHeader}>{s.toc}</Text>
        <View style={styles.sectionRule} />
        {sections.map((section, idx) => (
          <View key={section} style={styles.tocItem}>
            <Text style={styles.tocLabel}>{s.sections[section]}</Text>
            <Text style={styles.tocPage}>{idx + 3}</Text>
          </View>
        ))}
        <Footer />
      </Page>

      {/* Sections */}
      {sections.map((section) => (
        <Page key={section} size="A4" style={styles.page} wrap>
          <Header config={config} />
          <SectionContent
            section={section}
            payload={payload}
            config={config}
            fmtCurrency={fmtCurrency}
            fmtPct={fmtPct}
          />
          <Footer />
        </Page>
      ))}

      {/* Appendix */}
      <Page size="A4" style={styles.page}>
        <Header config={config} />
        <Text style={styles.sectionHeader}>{s.appendixTitle}</Text>
        <View style={styles.sectionRule} />
        <FinanceTable
          payload={payload}
          fmtCurrency={fmtCurrency}
          lang={lang}
        />
        <Footer />
      </Page>
    </Document>
  );
}

function Header({ config }: { config: ReportConfig }) {
  return (
    <View style={styles.pageHeader} fixed>
      <Text>Pro Analytics</Text>
      <Text>{config.title}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>© Pro Analytics</Text>
      <Text
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </View>
  );
}

function SectionContent({
  section,
  payload,
  config,
  fmtCurrency,
  fmtPct,
}: {
  section: ReportSection;
  payload: ReportPayload;
  config: ReportConfig;
  fmtCurrency: (n: number) => string;
  fmtPct: (n: number) => string;
}) {
  const s = PDF_STRINGS[config.language];

  return (
    <View>
      <Text style={styles.sectionHeader}>{s.sections[section]}</Text>
      <View style={styles.sectionRule} />

      {section === 'executive' && (
        <>
          <Text style={styles.paragraph}>{s.summaryIntro}</Text>
          <View style={styles.kpiGrid}>
            <KpiCard label={s.kpi.revenue} value={fmtCurrency(payload.kpis.revenue)} />
            <KpiCard
              label={s.kpi.revenueGrowth}
              value={fmtPct(payload.kpis.revenueGrowth)}
            />
            {/* Null = not derivable from this org's real data: the card is left
                out rather than printing an invented figure. */}
            {payload.kpis.grossMargin !== null && (
              <KpiCard
                label={s.kpi.grossMargin}
                value={fmtPct(payload.kpis.grossMargin)}
              />
            )}
            <KpiCard
              label={s.kpi.netMargin}
              value={fmtPct(payload.kpis.netMargin)}
            />
            {payload.kpis.cashRunwayMonths !== null && (
              <KpiCard
                label={s.kpi.cashRunway}
                value={`${payload.kpis.cashRunwayMonths} ${s.kpi.months}`}
              />
            )}
            <KpiCard label={s.kpi.headcount} value={String(payload.kpis.headcount)} />
          </View>
        </>
      )}

      {section === 'finance' && (
        <>
          {config.includeCharts && (
            <BarChart
              data={payload.finance.monthly.map((m) => ({
                label: m.month,
                value: m.revenue,
              }))}
              color={COLORS.primaryAccent}
            />
          )}
          <FinanceTable
            payload={payload}
            fmtCurrency={fmtCurrency}
            lang={config.language}
          />
        </>
      )}

      {section === 'cashflow' && (
        <>
          {config.includeCharts && (
            <LineChart
              series={[
                {
                  data: payload.cashflow.monthly.map((m) => m.inflow),
                  color: COLORS.success,
                },
                {
                  data: payload.cashflow.monthly.map((m) => m.outflow),
                  color: COLORS.danger,
                },
              ]}
              labels={payload.cashflow.monthly.map((m) => m.month)}
            />
          )}
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              <Text style={[styles.tableCell, styles.tableCellHead]}>
                {s.tables.month}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHead]}>
                {s.tables.inflow}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHead]}>
                {s.tables.outflow}
              </Text>
              <Text style={[styles.tableCell, styles.tableCellHead]}>
                {s.tables.net}
              </Text>
            </View>
            {payload.cashflow.monthly.map((m) => (
              <View key={m.month} style={styles.tableRow}>
                <Text style={styles.tableCell}>{m.month}</Text>
                <Text style={styles.tableCell}>{fmtCurrency(m.inflow)}</Text>
                <Text style={styles.tableCell}>{fmtCurrency(m.outflow)}</Text>
                <Text style={styles.tableCell}>{fmtCurrency(m.net)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {section === 'market' && (
        <>
          <View style={styles.kpiGrid}>
            <KpiCard label={s.marketShare} value={fmtPct(payload.market.share)} />
            <KpiCard label={s.marketGrowth} value={fmtPct(payload.market.growth)} />
          </View>
          <Text style={[styles.paragraph, { marginTop: 12, fontFamily: 'Helvetica-Bold' }]}>
            {s.competitors}
          </Text>
          {config.includeCharts && (
            <BarChart
              data={payload.market.competitors.map((c) => ({
                label: c.name,
                value: c.share * 100,
              }))}
              color={COLORS.accent}
              suffix="%"
            />
          )}
        </>
      )}

      {section === 'operations' && (
        <View style={styles.kpiGrid}>
          <KpiCard
            label={config.language === 'it' ? 'Produttivita' : 'Productivity'}
            value={fmtPct(payload.operations.productivity)}
          />
          <KpiCard
            label={config.language === 'it' ? 'Efficienza' : 'Efficiency'}
            value={fmtPct(payload.operations.efficiency)}
          />
          <KpiCard
            label={config.language === 'it' ? 'Issue aperti' : 'Open issues'}
            value={String(payload.operations.issues)}
          />
        </View>
      )}

      {section === 'projections' && config.includeCharts && (
        <LineChart
          series={[
            {
              data: payload.projections.next12m.map((m) => m.revenue),
              color: COLORS.primaryAccent,
            },
          ]}
          labels={payload.projections.next12m.map((m) => m.month)}
        />
      )}

      {section === 'benchmark' && (
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHead]}>
            <Text style={[styles.tableCell, styles.tableCellHead]}>
              {s.tables.metric}
            </Text>
            <Text style={[styles.tableCell, styles.tableCellHead]}>
              {s.tables.value}
            </Text>
            <Text style={[styles.tableCell, styles.tableCellHead]}>
              {s.tables.industryAvg}
            </Text>
            <Text style={[styles.tableCell, styles.tableCellHead]}>
              {s.tables.delta}
            </Text>
          </View>
          {payload.benchmark.metrics.map((m) => (
            <View key={m.label} style={styles.tableRow}>
              <Text style={styles.tableCell}>{m.label}</Text>
              <Text style={styles.tableCell}>{m.value.toFixed(1)}</Text>
              <Text style={styles.tableCell}>{m.industryAvg.toFixed(1)}</Text>
              <Text
                style={[
                  styles.tableCell,
                  {
                    color:
                      m.value >= m.industryAvg ? COLORS.success : COLORS.danger,
                  },
                ]}
              >
                {(m.value - m.industryAvg).toFixed(1)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {section === 'recommendations' &&
        payload.recommendations.map((rec) => (
          <View key={rec.title} style={styles.recommendation} wrap={false}>
            <Text
              style={[
                styles.badge,
                {
                  backgroundColor:
                    rec.impact === 'high'
                      ? COLORS.danger
                      : rec.impact === 'medium'
                      ? COLORS.warning
                      : COLORS.slate500,
                },
              ]}
            >
              {s.impact[rec.impact]}
            </Text>
            <Text style={styles.recommendationTitle}>{rec.title}</Text>
            <Text style={styles.paragraph}>{rec.description}</Text>
          </View>
        ))}
    </View>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiCard}>
      <View style={styles.kpiCardInner}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Text style={styles.kpiValue}>{value}</Text>
      </View>
    </View>
  );
}

function FinanceTable({
  payload,
  fmtCurrency,
  lang,
}: {
  payload: ReportPayload;
  fmtCurrency: (n: number) => string;
  lang: 'it' | 'en';
}) {
  const s = PDF_STRINGS[lang];
  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHead]}>
        <Text style={[styles.tableCell, styles.tableCellHead]}>{s.tables.month}</Text>
        <Text style={[styles.tableCell, styles.tableCellHead]}>{s.tables.revenue}</Text>
        <Text style={[styles.tableCell, styles.tableCellHead]}>{s.tables.costs}</Text>
        <Text style={[styles.tableCell, styles.tableCellHead]}>{s.tables.profit}</Text>
      </View>
      {payload.finance.monthly.map((m) => (
        <View key={m.month} style={styles.tableRow}>
          <Text style={styles.tableCell}>{m.month}</Text>
          <Text style={styles.tableCell}>{fmtCurrency(m.revenue)}</Text>
          <Text style={styles.tableCell}>{fmtCurrency(m.costs)}</Text>
          <Text style={styles.tableCell}>{fmtCurrency(m.profit)}</Text>
        </View>
      ))}
    </View>
  );
}

function BarChart({
  data,
  color,
  suffix,
}: {
  data: { label: string; value: number }[];
  color: string;
  suffix?: string;
}) {
  const width = 480;
  const height = 160;
  const padding = { top: 12, bottom: 28, left: 32, right: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(...data.map((d) => d.value));
  const barWidth = innerW / data.length - 6;

  return (
    <View style={{ marginVertical: 12 }}>
      <Svg width={width} height={height}>
        <Line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={padding.left + innerW}
          y2={padding.top + innerH}
          stroke={COLORS.slate200}
          strokeWidth={1}
        />
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = padding.left + i * (innerW / data.length) + 3;
          const y = padding.top + innerH - h;
          return (
            <Rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={h}
              fill={color}
              rx={2}
            />
          );
        })}
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: -22,
          paddingHorizontal: padding.left + 4,
        }}
      >
        {data.map((d) => (
          <Text
            key={d.label}
            style={{ fontSize: 7, color: COLORS.slate500, width: barWidth, textAlign: 'center' }}
          >
            {d.label}
            {suffix ? '' : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

function LineChart({
  series,
  labels,
}: {
  series: { data: number[]; color: string }[];
  labels: string[];
}) {
  const width = 480;
  const height = 160;
  const padding = { top: 12, bottom: 28, left: 32, right: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const all = series.flatMap((s) => s.data);
  const max = Math.max(...all);
  const min = Math.min(...all);
  const range = max - min || 1;

  return (
    <View style={{ marginVertical: 12 }}>
      <Svg width={width} height={height}>
        <Line
          x1={padding.left}
          y1={padding.top + innerH}
          x2={padding.left + innerW}
          y2={padding.top + innerH}
          stroke={COLORS.slate200}
          strokeWidth={1}
        />
        {series.map((s, idx) => {
          const points = s.data.map((v, i) => {
            const x = padding.left + (i / (s.data.length - 1)) * innerW;
            const y = padding.top + innerH - ((v - min) / range) * innerH;
            return `${x},${y}`;
          });
          const d = `M ${points.join(' L ')}`;
          return (
            <Path key={idx} d={d} stroke={s.color} strokeWidth={2} fill="none" />
          );
        })}
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: -22,
          paddingHorizontal: padding.left,
        }}
      >
        {labels.map((l) => (
          <Text key={l} style={{ fontSize: 7, color: COLORS.slate500 }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}
