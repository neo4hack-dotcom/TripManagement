export type Role = 'employee' | 'manager' | 'director' | 'finance';

export interface User {
  id: string;
  name: string;
  role: Role;
  managerId?: string;
  department: string;
  costCenterId: string;
  email: string;
  password?: string;
}

export type TripStatus = 'draft' | 'pending_n1' | 'pending_n2' | 'pending_n3' | 'approved' | 'rejected' | 'completed';

export interface TripRequest {
  id: string;
  userId: string;
  destination: string;
  continent: string;
  startDate: string;
  endDate: string;
  reason: string;
  transportMode: 'plane' | 'train' | 'car';
  accommodationType: 'hotel' | 'airbnb' | 'other';
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
}
