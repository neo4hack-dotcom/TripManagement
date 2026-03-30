import {
  AccommodationType,
  ApprovalWorkflowConfig,
  Continent,
  Role,
  TransportMode,
  TravelAssistantDraft,
  TravelPolicy,
  TripRequest,
  User,
} from '../types';

export const CONTINENT_OPTIONS: Continent[] = [
  'Europe',
  'North America',
  'South America',
  'Asia',
  'Africa',
  'Oceania',
];

export const TRANSPORT_OPTIONS: {label: string; value: TransportMode}[] = [
  {label: 'Avion', value: 'plane'},
  {label: 'Train', value: 'train'},
  {label: 'Voiture', value: 'car'},
];

export const ACCOMMODATION_OPTIONS: {label: string; value: AccommodationType}[] = [
  {label: 'Hotel', value: 'hotel'},
  {label: 'Airbnb', value: 'airbnb'},
  {label: 'Autre', value: 'other'},
];

export function createEmptyTravelDraft(): TravelAssistantDraft {
  return {
    destination: '',
    continent: 'Europe',
    startDate: '',
    endDate: '',
    reason: '',
    transportMode: 'plane',
    accommodationType: 'hotel',
    transportCost: 0,
    accommodationCost: 0,
    mealsCost: 0,
  };
}

export function getTripDuration(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return {days: 0, nights: 0};
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return {days: 0, nights: 0};
  }

  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const days = Math.floor((end.getTime() - start.getTime()) / millisecondsPerDay) + 1;

  return {
    days,
    nights: Math.max(0, days - 1),
  };
}

export function getDraftTotalCost(draft: TravelAssistantDraft) {
  return draft.transportCost + draft.accommodationCost + draft.mealsCost;
}

function getHotelCapForDestination(destination: string, policy: TravelPolicy) {
  const trimmedDestination = destination.trim().toLowerCase();
  const directKey = Object.keys(policy.maxHotelPerNight).find(
    key => key.toLowerCase() === trimmedDestination,
  );

  if (directKey) {
    return policy.maxHotelPerNight[directKey];
  }

  return policy.maxHotelPerNight.default ?? 120;
}

export function buildPolicyAlerts(draft: TravelAssistantDraft, policy: TravelPolicy) {
  const alerts: string[] = [];
  const {days, nights} = getTripDuration(draft.startDate, draft.endDate);

  if (nights > 0 && draft.accommodationCost > 0) {
    const costPerNight = draft.accommodationCost / nights;
    const maxAllowed = getHotelCapForDestination(draft.destination, policy);

    if (costPerNight > maxAllowed) {
      alerts.push(
        `La nuitee a ${draft.destination || 'cette destination'} depasse le forfait de ${maxAllowed} EUR (estime: ${costPerNight.toFixed(0)} EUR/nuit)`,
      );
    }
  }

  if (days > 0 && draft.mealsCost > 0) {
    const mealsPerDay = draft.mealsCost / days;
    if (mealsPerDay > policy.maxMealPerDay) {
      alerts.push(
        `Les frais de repas depassent le forfait de ${policy.maxMealPerDay} EUR/jour (estime: ${mealsPerDay.toFixed(0)} EUR/jour)`,
      );
    }
  }

  return alerts;
}

export function requiresLevel2Approval(
  totalCost: number,
  continent: Continent,
  workflowConfig: ApprovalWorkflowConfig,
) {
  return (
    totalCost > workflowConfig.level2AmountThreshold ||
    (workflowConfig.requireLevel2ForNonEurope && continent !== 'Europe')
  );
}

export function requiresLevel3Approval(
  totalCost: number,
  continent: Continent,
  workflowConfig: ApprovalWorkflowConfig,
) {
  return (
    totalCost > workflowConfig.level3AmountThreshold ||
    workflowConfig.level3Continents.includes(continent)
  );
}

export function buildApprovalPath(
  totalCost: number,
  continent: Continent,
  workflowConfig: ApprovalWorkflowConfig,
) {
  const path = ['N+1'];

  if (requiresLevel2Approval(totalCost, continent, workflowConfig)) {
    path.push('N+2');
  }

  if (requiresLevel3Approval(totalCost, continent, workflowConfig)) {
    path.push('Finance');
  }

  return path;
}

export function getApprovalRouteLabel(
  totalCost: number,
  continent: Continent,
  workflowConfig: ApprovalWorkflowConfig,
) {
  return buildApprovalPath(totalCost, continent, workflowConfig).join(' -> ');
}

export function getNextApprovalStatus(
  role: Role,
  trip: Pick<TripRequest, 'continent' | 'totalEstimatedCost'>,
  workflowConfig: ApprovalWorkflowConfig,
): TripRequest['status'] {
  if (role === 'manager') {
    return requiresLevel2Approval(trip.totalEstimatedCost, trip.continent, workflowConfig)
      ? 'pending_n2'
      : 'approved';
  }

  if (role === 'director') {
    return requiresLevel3Approval(trip.totalEstimatedCost, trip.continent, workflowConfig)
      ? 'pending_n3'
      : 'approved';
  }

  return 'approved';
}

export function createTripRequestFromDraft(
  currentUser: User,
  draft: TravelAssistantDraft,
  policy: TravelPolicy,
): TripRequest {
  return {
    id: `t${Date.now()}`,
    userId: currentUser.id,
    destination: draft.destination,
    continent: draft.continent,
    startDate: draft.startDate,
    endDate: draft.endDate,
    reason: draft.reason,
    transportMode: draft.transportMode,
    accommodationType: draft.accommodationType,
    estimatedCosts: {
      transport: draft.transportCost,
      accommodation: draft.accommodationCost,
      meals: draft.mealsCost,
    },
    totalEstimatedCost: getDraftTotalCost(draft),
    status: 'pending_n1',
    createdAt: new Date().toISOString().split('T')[0],
    costCenterId: currentUser.costCenterId,
    policyAlerts: buildPolicyAlerts(draft, policy),
  };
}
