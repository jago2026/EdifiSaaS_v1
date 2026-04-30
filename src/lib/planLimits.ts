export type PlanName = 'Esencial' | 'Profesional' | 'Premium' | 'Inteligencia Artificial';

export interface PlanPermissions {
  maxHistoryMonths: number;
  canExport: boolean;
  hasKpis: boolean;
  hasAdvancedKpis: boolean;
  maxEmailRecipients: number;
  maxEmailsPerMonth: number;
  maxWhatsAppPerMonth: number;
  hasWhatsApp: boolean;
  hasMultiCurrency: boolean;
  hasProjections: boolean;
  hasIA: boolean;
  maxUnits: number;
  hasMixedBuildingSupport: boolean;
  hasSemaforos: boolean;
  hasCustomAlerts: boolean;
  hasCustomDashboard: boolean;
  hasAudit: boolean;
  hasBudgets: boolean;
}

export const PLAN_LIMITS: Record<PlanName, PlanPermissions> = {
  'Esencial': {
    maxHistoryMonths: 3,
    canExport: false,
    hasKpis: false,
    hasAdvancedKpis: false,
    maxEmailRecipients: 1,
    maxEmailsPerMonth: 50,
    maxWhatsAppPerMonth: 0,
    hasWhatsApp: false,
    hasMultiCurrency: false,
    hasProjections: false,
    hasIA: false,
    maxUnits: 30,
    hasMixedBuildingSupport: false,
    hasSemaforos: false,
    hasCustomAlerts: false,
    hasCustomDashboard: false,
    hasAudit: false,
    hasBudgets: false,
  },
  'Profesional': {
    maxHistoryMonths: 12,
    canExport: true, // últimos 3 meses
    hasKpis: true,
    hasAdvancedKpis: false,
    maxEmailRecipients: 5,
    maxEmailsPerMonth: 200,
    maxWhatsAppPerMonth: 50,
    hasWhatsApp: true,
    hasMultiCurrency: false,
    hasProjections: true, // Recibo próximo mes
    hasIA: false,
    maxUnits: 50,
    hasMixedBuildingSupport: false,
    hasSemaforos: false,
    hasCustomAlerts: true,
    hasCustomDashboard: true,
    hasAudit: false,
    hasBudgets: false,
  },
  'Premium': {
    maxHistoryMonths: 999, // Ilimitado
    canExport: true, // histórico completo
    hasKpis: true,
    hasAdvancedKpis: true,
    maxEmailRecipients: 20,
    maxEmailsPerMonth: 9999, // Ilimitado
    maxWhatsAppPerMonth: 200,
    hasWhatsApp: true,
    hasMultiCurrency: true,
    hasProjections: true,
    hasIA: false,
    maxUnits: 100,
    hasMixedBuildingSupport: true,
    hasSemaforos: true,
    hasCustomAlerts: true,
    hasCustomDashboard: true,
    hasAudit: true,
    hasBudgets: true,
  },
  'Inteligencia Artificial': {
    maxHistoryMonths: 999,
    canExport: true,
    hasKpis: true,
    hasAdvancedKpis: true,
    maxEmailRecipients: 99,
    maxEmailsPerMonth: 9999,
    maxWhatsAppPerMonth: 500,
    hasWhatsApp: true,
    hasMultiCurrency: true,
    hasProjections: true,
    hasIA: true,
    maxUnits: 9999,
    hasMixedBuildingSupport: true,
    hasSemaforos: true,
    hasCustomAlerts: true,
    hasCustomDashboard: true,
    hasAudit: true,
    hasBudgets: true,
  },
};

export function getPlanPermissions(planName: string): PlanPermissions {
  const p = (planName || '').toLowerCase();
  if (p.includes('ia') || p.includes('inteligencia')) return PLAN_LIMITS['Inteligencia Artificial'];
  if (p.includes('premium')) return PLAN_LIMITS['Premium'];
  if (p.includes('profesional') || p.includes('professional')) return PLAN_LIMITS['Profesional'];
  return PLAN_LIMITS['Esencial'];
}
