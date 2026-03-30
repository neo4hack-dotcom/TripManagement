export type Role = 'employee' | 'manager' | 'director' | 'finance';
export type Continent = 'Europe' | 'North America' | 'South America' | 'Asia' | 'Africa' | 'Oceania';
export type TransportMode = 'plane' | 'train' | 'car';
export type AccommodationType = 'hotel' | 'airbnb' | 'other';

export interface User {
  id: string;
  name: string;
  role: Role;
  managerId?: string;
  department: string;
  costCenterId: string;
  email: string;
  password?: string;
  isAdmin?: boolean;
}

export type TripStatus = 'draft' | 'pending_n1' | 'pending_n2' | 'pending_n3' | 'approved' | 'rejected' | 'completed';

export interface TripRequest {
  id: string;
  userId: string;
  destination: string;
  continent: Continent;
  startDate: string;
  endDate: string;
  reason: string;
  transportMode: TransportMode;
  accommodationType: AccommodationType;
  estimatedCosts: {
    transport: number;
    accommodation: number;
    meals: number;
  };
  totalEstimatedCost: number;
  status: TripStatus;
  createdAt: string;
  costCenterId: string;
  policyAlerts: string[];
}

export interface CostCenter {
  id: string;
  name: string;
  initialBudget: number;
  engagedBudget: number; // Approved but not completed
  actualBudget: number; // Completed
}

export interface TravelPolicy {
  maxHotelPerNight: Record<string, number>; // e.g., { 'London': 180, 'Paris': 150, 'default': 100 }
  maxMealPerDay: number;
  budgetAlertThreshold: number;
}

export interface ApprovalWorkflowConfig {
  level2AmountThreshold: number;
  level3AmountThreshold: number;
  requireLevel2ForNonEurope: boolean;
  level3Continents: Continent[];
}

export interface LocalLlmConfig {
  baseUrl: string;
  apiKey: string;
  selectedModel: string;
  systemPrompt: string;
}

export interface TravelRequestProfile {
  id: string;
  name: string;
  description: string;
  department: string;
  costCenterId: string;
  defaultContinent: Continent;
  defaultTransportMode: TransportMode;
  defaultAccommodationType: AccommodationType;
  maxBudget: number;
  notes: string;
}

export interface ApprovalProfile {
  id: string;
  level: 'n1' | 'n2';
  name: string;
  description: string;
  department: string;
  maxApprovalAmount: number;
  allowedContinents: Continent[];
  checklist: string;
}

export interface TravelAssistantDraft {
  destination: string;
  continent: Continent;
  startDate: string;
  endDate: string;
  reason: string;
  transportMode: TransportMode;
  accommodationType: AccommodationType;
  transportCost: number;
  accommodationCost: number;
  mealsCost: number;
}
