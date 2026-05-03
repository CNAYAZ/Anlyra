import { evaluateStatus, type StatusLevel } from './utils';

export interface KpiPoint {
  key: string;
  value: number;
  delta: number;
  target: number;
  status: StatusLevel;
  unit: 'percent' | 'number' | 'currency' | 'score';
}

export interface OperationsOverview {
  kpis: KpiPoint[];
  gauges: Array<{
    key: string;
    value: number;
    min: number;
    max: number;
    status: StatusLevel;
    invert?: boolean;
    warnAt: number;
    goodAt: number;
    unit: 'percent' | 'number' | 'currency' | 'score';
  }>;
}

export interface EfficiencyData {
  revenuePerEmployeeTrend: Array<{ month: string; value: number }>;
  departmentProductivity: Array<{ department: string; productivity: number }>;
}

export interface CustomersData {
  churnRetention: Array<{ month: string; churn: number; retention: number }>;
  funnel: Array<{ stage: 'visitors' | 'trial' | 'paying' | 'retained'; value: number }>;
  npsTrend: Array<{ month: string; nps: number }>;
  csatTrend: Array<{ month: string; csat: number }>;
  newCustomers: Array<{ month: string; value: number }>;
  cumulativeGrowth: Array<{ month: string; total: number }>;
}

export interface TeamData {
  table: Array<{
    department: 'engineering' | 'sales' | 'marketing' | 'support';
    headcount: number;
    avgCost: number;
    productivity: number;
    satisfaction: number;
    turnover: number;
  }>;
  productivityHeatmap: Array<{
    department: 'engineering' | 'sales' | 'marketing' | 'support';
    monthly: number[];
  }>;
}

const monthsIT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

export function getOverview(): OperationsOverview {
  const churn = 4.2;
  const retention = 92.4;
  const nps = 48;
  const conversion = 3.8;
  const revPerEmp = 142_000;

  return {
    kpis: [
      {
        key: 'churnRate',
        value: churn,
        delta: -0.6,
        target: 5,
        unit: 'percent',
        status: evaluateStatus(churn, { good: 3, warn: 5, invert: true }),
      },
      {
        key: 'retention',
        value: retention,
        delta: 1.4,
        target: 90,
        unit: 'percent',
        status: evaluateStatus(retention, { good: 90, warn: 80 }),
      },
      {
        key: 'nps',
        value: nps,
        delta: 5,
        target: 40,
        unit: 'score',
        status: evaluateStatus(nps, { good: 40, warn: 20 }),
      },
      {
        key: 'conversionRate',
        value: conversion,
        delta: 0.4,
        target: 4,
        unit: 'percent',
        status: evaluateStatus(conversion, { good: 4, warn: 2.5 }),
      },
      {
        key: 'revenuePerEmployee',
        value: revPerEmp,
        delta: 8.2,
        target: 130_000,
        unit: 'currency',
        status: evaluateStatus(revPerEmp, { good: 130_000, warn: 100_000 }),
      },
    ],
    gauges: [
      {
        key: 'churnRate',
        value: churn,
        min: 0,
        max: 10,
        invert: true,
        warnAt: 0.3,
        goodAt: 0.5,
        status: evaluateStatus(churn, { good: 3, warn: 5, invert: true }),
        unit: 'percent',
      },
      {
        key: 'retention',
        value: retention,
        min: 70,
        max: 100,
        warnAt: 0.34,
        goodAt: 0.66,
        status: evaluateStatus(retention, { good: 90, warn: 80 }),
        unit: 'percent',
      },
      {
        key: 'nps',
        value: nps,
        min: -100,
        max: 100,
        warnAt: 0.6,
        goodAt: 0.7,
        status: evaluateStatus(nps, { good: 40, warn: 20 }),
        unit: 'score',
      },
      {
        key: 'conversionRate',
        value: conversion,
        min: 0,
        max: 8,
        warnAt: 0.31,
        goodAt: 0.5,
        status: evaluateStatus(conversion, { good: 4, warn: 2.5 }),
        unit: 'percent',
      },
    ],
  };
}

export function getEfficiency(): EfficiencyData {
  return {
    revenuePerEmployeeTrend: monthsIT.map((m, i) => ({
      month: m,
      value: 110_000 + i * 2_800 + Math.round(Math.sin(i / 2) * 5_000),
    })),
    departmentProductivity: [
      { department: 'engineering', productivity: 88 },
      { department: 'sales', productivity: 76 },
      { department: 'marketing', productivity: 71 },
      { department: 'support', productivity: 82 },
    ],
  };
}

export function getCustomers(): CustomersData {
  const churn = monthsIT.map((m, i) => ({
    month: m,
    churn: +(5.2 - i * 0.08 + Math.sin(i) * 0.4).toFixed(2),
    retention: +(88 + i * 0.32 + Math.cos(i) * 0.6).toFixed(2),
  }));
  const newCust = monthsIT.map((m, i) => ({
    month: m,
    value: 120 + i * 14 + Math.round(Math.sin(i / 2) * 18),
  }));
  let cumulative = 1820;
  const cumulativeGrowth = newCust.map((p) => {
    cumulative += p.value;
    return { month: p.month, total: cumulative };
  });
  return {
    churnRetention: churn,
    funnel: [
      { stage: 'visitors', value: 48_500 },
      { stage: 'trial', value: 6_900 },
      { stage: 'paying', value: 1_840 },
      { stage: 'retained', value: 1_532 },
    ],
    npsTrend: monthsIT.map((m, i) => ({ month: m, nps: 38 + Math.round(Math.sin(i / 2) * 6 + i * 0.6) })),
    csatTrend: monthsIT.map((m, i) => ({ month: m, csat: +(4.1 + Math.sin(i / 3) * 0.2 + i * 0.02).toFixed(2) })),
    newCustomers: newCust,
    cumulativeGrowth,
  };
}

export function getTeam(): TeamData {
  return {
    table: [
      { department: 'engineering', headcount: 42, avgCost: 78_000, productivity: 88, satisfaction: 4.3, turnover: 6.1 },
      { department: 'sales', headcount: 28, avgCost: 62_000, productivity: 76, satisfaction: 3.9, turnover: 12.4 },
      { department: 'marketing', headcount: 14, avgCost: 58_000, productivity: 71, satisfaction: 4.1, turnover: 8.7 },
      { department: 'support', headcount: 22, avgCost: 46_000, productivity: 82, satisfaction: 4.0, turnover: 10.2 },
    ],
    productivityHeatmap: [
      { department: 'engineering', monthly: [78, 80, 82, 85, 84, 86, 88, 87, 89, 90, 91, 92] },
      { department: 'sales', monthly: [62, 64, 70, 72, 68, 70, 75, 76, 74, 78, 80, 82] },
      { department: 'marketing', monthly: [55, 58, 60, 62, 65, 64, 67, 68, 70, 71, 73, 72] },
      { department: 'support', monthly: [70, 72, 73, 76, 75, 78, 80, 79, 82, 83, 84, 85] },
    ],
  };
}
