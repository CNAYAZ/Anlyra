import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  Brain,
  Briefcase,
  Building2,
  CreditCard,
  Database,
  FileText,
  FileUp,
  Globe,
  Home,
  Layout,
  LineChart,
  Lock,
  MessageSquare,
  Pencil,
  PieChart,
  PiggyBank,
  Plug,
  Repeat,
  Settings,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  History as HistoryIcon,
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
    href: '/overview',
    icon: Home,
  },
  {
    key: 'finance',
    labelKey: 'nav.finance',
    href: '/finance',
    icon: TrendingUp,
    children: [
      { key: 'financeRevenue', labelKey: 'nav.financeRevenue', href: '/finance/revenue', icon: TrendingUp },
      { key: 'financeCosts', labelKey: 'nav.financeCosts', href: '/finance/costs', icon: TrendingDown },
      { key: 'financeCashflow', labelKey: 'nav.financeCashflow', href: '/finance/cashflow', icon: Wallet },
      { key: 'financeBudget', labelKey: 'nav.financeBudget', href: '/finance/budget', icon: PiggyBank },
    ],
  },
  {
    key: 'market',
    labelKey: 'nav.market',
    href: '/market',
    icon: Globe,
    children: [
      { key: 'marketCompetitors', labelKey: 'nav.marketCompetitors', href: '/market/competitors', icon: Briefcase },
      { key: 'marketTrends', labelKey: 'nav.marketTrends', href: '/market/trends', icon: LineChart },
      { key: 'marketPositioning', labelKey: 'nav.marketPositioning', href: '/market/positioning', icon: Target },
    ],
  },
  {
    key: 'operations',
    labelKey: 'nav.operations',
    href: '/operations',
    icon: Activity,
    children: [
      { key: 'operationsCustomers', labelKey: 'nav.operationsCustomers', href: '/operations/customers', icon: Users },
      { key: 'operationsTeam', labelKey: 'nav.operationsTeam', href: '/operations/team', icon: Users },
      { key: 'operationsEfficiency', labelKey: 'nav.operationsEfficiency', href: '/operations/efficiency', icon: BarChart3 },
    ],
  },
  {
    key: 'ai',
    labelKey: 'nav.ai',
    href: '/ai/chat',
    icon: Brain,
    children: [
      { key: 'aiChat', labelKey: 'nav.aiChat', href: '/ai/chat', icon: MessageSquare },
      { key: 'aiInsights', labelKey: 'nav.aiInsights', href: '/ai/insights', icon: Sparkles },
      { key: 'aiForecasting', labelKey: 'nav.aiForecasting', href: '/ai/forecasting', icon: LineChart },
      { key: 'aiBenchmarks', labelKey: 'nav.aiBenchmarks', href: '/ai/benchmarks', icon: BarChart3 },
      { key: 'aiAlerts', labelKey: 'nav.aiAlerts', href: '/ai/alerts', icon: AlertTriangle },
      { key: 'aiAgent', labelKey: 'nav.aiAgent', href: '/ai/agent', icon: Bot },
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
      { key: 'dataImport', labelKey: 'nav.dataImport', href: '/data/import', icon: FileUp },
      { key: 'dataManual', labelKey: 'nav.dataManual', href: '/data/manual', icon: Pencil },
      { key: 'dataHistory', labelKey: 'nav.dataHistory', href: '/data/history', icon: HistoryIcon },
    ],
  },
  {
    key: 'scadenzario',
    labelKey: 'nav.scadenzario',
    href: '/scadenzario',
    icon: Wallet,
  },
  {
    key: 'speseRicorrenti',
    labelKey: 'nav.speseRicorrenti',
    href: '/spese-ricorrenti',
    icon: Repeat,
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
    children: [
      { key: 'settingsProfile', labelKey: 'nav.settingsProfile', href: '/settings/profile', icon: User },
      { key: 'settingsOrganization', labelKey: 'nav.settingsOrganization', href: '/settings/organization', icon: Building2 },
      { key: 'settingsTeam', labelKey: 'nav.settingsTeam', href: '/settings/team', icon: Users },
      { key: 'settingsBilling', labelKey: 'nav.settingsBilling', href: '/settings/billing', icon: CreditCard },
      { key: 'settingsSecurity', labelKey: 'nav.settingsSecurity', href: '/settings/security', icon: Lock },
      { key: 'settingsNotifications', labelKey: 'nav.settingsNotifications', href: '/settings/notifications', icon: Bell },
    ],
  },
];

// Suppress unused import warning for icons reserved for future child sections.
const _reservedIcons: LucideIcon[] = [PieChart];
void _reservedIcons;
