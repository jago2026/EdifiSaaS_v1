export type PlanName = 'Básico' | 'Profesional' | 'Empresarial' | 'IA (Asistente de Gestión)';

export interface PlanPermissions {
  maxHistoryMonths: number;
  canExport: boolean;
  hasKpis: boolean;
  hasAdvancedKpis: boolean;
  maxEmailRecipients: number;
  hasWhatsApp: boolean;
  hasMultiCurrency: boolean;
  hasProjections: boolean;
  hasIA: boolean;
  maxUnits: number;
  hasMixedBuildingSupport: boolean;
  hasSemaforos: boolean;
}

export const PLAN_LIMITS: Record<PlanName, PlanPermissions> = {
  'Básico': {
    maxHistoryMonths: 3,
    canExport: false,
    hasKpis: false,
    hasAdvancedKpis: false,
    maxEmailRecipients: 1,
    hasWhatsApp: false,
    hasMultiCurrency: false,
    hasProjections: false,
    hasIA: false,
    maxUnits: 30,
    hasMixedBuildingSupport: false,
    hasSemaforos: false,
  },
  'Profesional': {
    maxHistoryMonths: 999, // Unlimited
    canExport: true,
    hasKpis: true,
    hasAdvancedKpis: false,
    maxEmailRecipients: 5,
    hasWhatsApp: false,
    hasMultiCurrency: false,
    hasProjections: false,
    hasIA: false,
    maxUnits: 100,
    hasMixedBuildingSupport: false,
    hasSemaforos: false,
  },
  'Empresarial': {
    maxHistoryMonths: 999,
    canExport: true,
    hasKpis: true,
    hasAdvancedKpis: true,
    maxEmailRecipients: 20,
    hasWhatsApp: true,
    hasMultiCurrency: true,
    hasProjections: true,
    hasIA: false,
    maxUnits: 9999,
    hasMixedBuildingSupport: true,
    hasSemaforos: true,
  },
  'IA (Asistente de Gestión)': {
    maxHistoryMonths: 999,
    canExport: true,
    hasKpis: true,
    hasAdvancedKpis: true,
    maxEmailRecipients: 99,
    hasWhatsApp: true,
    hasMultiCurrency: true,
    hasProjections: true,
    hasIA: true,
    maxUnits: 9999,
    hasMixedBuildingSupport: true,
    hasSemaforos: true,
  },
};

export function getPlanPermissions(planName: string): PlanPermissions {
  // Manejar coincidencias exactas primero
  if (planName === 'IA (Asistente de Gestión)' || planName === 'IA') return PLAN_LIMITS['IA (Asistente de Gestión)'];
  if (planName === 'Empresarial') return PLAN_LIMITS['Empresarial'];
  if (planName === 'Profesional') return PLAN_LIMITS['Profesional'];
  
  // Fallback por si hay variaciones de texto
  if (planName.includes('IA')) return PLAN_LIMITS['IA (Asistente de Gestión)'];
  if (planName.includes('Empresarial')) return PLAN_LIMITS['Empresarial'];
  if (planName.includes('Profesional')) return PLAN_LIMITS['Profesional'];
  
  return PLAN_LIMITS['Básico'];
}
