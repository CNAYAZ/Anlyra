import {
  Activity,
  Brain,
  Database,
  FileText,
  Globe,
  Home,
  Layout,
  Plug,
  Settings,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';

export interface NavItemConfig {
  key: string;
  labelKey: string;
  href: string;
  icon: LucideIcon;
  children?: NavItemConfig[];
}

export const mainNav: NavItemConfig[] = [
  {
    key: 'overview',
    labelKey: 'nav.overview',
    href: '/',
    icon: Home,
  },
  {
    key: 'finance',
    labelKey: 'nav.finance',
    href: '/finance',
    icon: TrendingUp,
    children: [
      { key: 'financeRevenue', labelKey: 'nav.financeRevenue', href: '/finance/revenue', icon: TrendingUp },
      { key: 'financeCosts', labelKey: 'nav.financeCosts', href: '/finance/costs', icon: TrendingUp },
      { key: 'financeCashflow', labelKey: 'nav.financeCashflow', href: '/finance/cashflow', icon: TrendingUp },
      { key: 'financeBudget', labelKey: 'nav.financeBudget', href: '/finance/budget', icon: TrendingUp },
    ],
  },
  {
    key: 'market',
    labelKey: 'nav.market',
    href: '/market',
    icon: Globe,
    children: [
      { key: 'marketCompetitors', labelKey: 'nav.marketCompetitors', href: '/market/competitors', icon: Globe },
      { key: 'marketTrends', labelKey: 'nav.marketTrends', href: '/market/trends', icon: Globe },
      { key: 'marketPositioning', labelKey: 'nav.marketPositioning', href: '/market/positioning', icon: Globe },
    ],
  },
  {
    key: 'operations',
    labelKey: 'nav.operations',
    href: '/operations',
    icon: Activity,
    children: [
      { key: 'operationsEfficiency', labelKey: 'nav.operationsEfficiency', href: '/operations/efficiency', icon: Activity },
      { key: 'operationsCustomers', labelKey: 'nav.operationsCustomers', href: '/operations/customers', icon: Activity },
      { key: 'operationsTeam', labelKey: 'nav.operationsTeam', href: '/operations/team', icon: Activity },
    ],
  },
  {
    key: 'ai',
    labelKey: 'nav.ai',
    href: '/ai/chat',
    icon: Brain,
    children: [
      { key: 'aiChat', labelKey: 'nav.aiChat', href: '/ai/chat', icon: Brain },
      { key: 'aiInsights', labelKey: 'nav.aiInsights', href: '/ai/insights', icon: Brain },
      { key: 'aiForecasting', labelKey: 'nav.aiForecasting', href: '/ai/forecasting', icon: Brain },
      { key: 'aiBenchmarks', labelKey: 'nav.aiBenchmarks', href: '/ai/benchmarks', icon: Brain },
      { key: 'aiAlerts', labelKey: 'nav.aiAlerts', href: '/ai/alerts', icon: Brain },
      { key: 'aiAgent', labelKey: 'nav.aiAgent', href: '/ai/agent', icon: Brain },
    ],
  },
  {
    key: 'customDashboards',
    labelKey: 'nav.customDashboards',
    href: '/custom-dashboards',
    icon: Layout,
  },
  {
    key: 'reports',
    labelKey: 'nav.reports',
    href: '/reports',
    icon: FileText,
  },
  {
    key: 'data',
    labelKey: 'nav.data',
    href: '/data/import',
    icon: Database,
    children: [
      { key: 'dataImport', labelKey: 'nav.dataImport', href: '/data/import', icon: Database },
      { key: 'dataManual', labelKey: 'nav.dataManual', href: '/data/manual', icon: Database },
      { key: 'dataHistory', labelKey: 'nav.dataHistory', href: '/data/history', icon: Database },
    ],
  },
  {
    key: 'integrations',
    labelKey: 'nav.integrations',
    href: '/integrations',
    icon: Plug,
  },
];

export const footerNav: NavItemConfig[] = [
  {
    key: 'settings',
    labelKey: 'nav.settings',
    href: '/settings',
    icon: Settings,
  },
];
