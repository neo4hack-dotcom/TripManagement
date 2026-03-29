import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, TripRequest, CostCenter, TravelPolicy } from '../types';

interface AppState {
  currentUser: User | null;
  users: User[];
  trips: TripRequest[];
  costCenters: CostCenter[];
  policy: TravelPolicy;
  addTrip: (trip: TripRequest) => void;
  updateTripStatus: (tripId: string, status: TripRequest['status']) => void;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
}

const mockUsers: User[] = [
  { id: 'u1', name: 'Alice Employee', role: 'employee', managerId: 'm1', department: 'Sales', costCenterId: 'cc1', email: 'alice@company.com', password: 'password123' },
  { id: 'm1', name: 'Bob Manager', role: 'manager', managerId: 'd1', department: 'Sales', costCenterId: 'cc1', email: 'bob@company.com', password: 'password123' },
  { id: 'd1', name: 'Charlie Director', role: 'director', department: 'Sales', costCenterId: 'cc1', email: 'charlie@company.com', password: 'password123' },
  { id: 'f1', name: 'Diana Finance', role: 'finance', department: 'Finance', costCenterId: 'cc2', email: 'diana@company.com', password: 'password123' },
  { id: 'admin', name: 'Admin System', role: 'finance', department: 'IT', costCenterId: 'cc2', email: 'MM2026', password: 'MM@2026' },
];

const mockCostCenters: CostCenter[] = [
  { id: 'cc1', name: 'Sales Dept', initialBudget: 50000, engagedBudget: 5000, actualBudget: 15000 },
  { id: 'cc2', name: 'Finance Dept', initialBudget: 20000, engagedBudget: 1000, actualBudget: 5000 },
];

const mockTrips: TripRequest[] = [
  {
    id: 't1',
    userId: 'u1',
    destination: 'London',
    continent: 'Europe',
    startDate: '2026-04-10',
    endDate: '2026-04-12',
    reason: 'Client Meeting',
    transportMode: 'plane',
    accommodationType: 'hotel',
    estimatedCosts: { transport: 300, accommodation: 400, meals: 150 },
    totalEstimatedCost: 850,
    status: 'pending_n1',
    createdAt: '2026-03-25',
    costCenterId: 'cc1',
    policyAlerts: ['La nuitée à Londres dépasse le forfait de 180€ (Estimé: 200€/nuit)'],
  },
  {
    id: 't2',
    userId: 'u1',
    destination: 'New York',
    continent: 'North America',
    startDate: '2026-05-01',
    endDate: '2026-05-05',
    reason: 'Conference',
    transportMode: 'plane',
    accommodationType: 'hotel',
    estimatedCosts: { transport: 1200, accommodation: 1000, meals: 300 },
    totalEstimatedCost: 2500,
    status: 'pending_n2', // N+1 approved, waiting for N+2
    createdAt: '2026-03-20',
    costCenterId: 'cc1',
    policyAlerts: [],
  },
  {
    id: 't3',
    userId: 'u1',
    destination: 'Paris',
    continent: 'Europe',
    startDate: '2026-02-10',
    endDate: '2026-02-12',
    reason: 'Internal Training',
    transportMode: 'train',
    accommodationType: 'hotel',
    estimatedCosts: { transport: 100, accommodation: 200, meals: 100 },
    totalEstimatedCost: 400,
    status: 'completed',
    createdAt: '2026-01-15',
    costCenterId: 'cc1',
    policyAlerts: [],
  }
];

const mockPolicy: TravelPolicy = {
  maxHotelPerNight: { 'London': 180, 'Paris': 150, 'New York': 250, 'default': 120 },
  maxMealPerDay: 60,
};

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [trips, setTrips] = useState<TripRequest[]>(mockTrips);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(mockCostCenters);
  const [policy] = useState<TravelPolicy>(mockPolicy);

  const login = (email: string, password: string) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const addUser = (user: User) => setUsers([...users, user]);
  const updateUser = (user: User) => setUsers(users.map(u => u.id === user.id ? user : u));
  const deleteUser = (userId: string) => setUsers(users.filter(u => u.id !== userId));

  const addTrip = (trip: TripRequest) => {
    setTrips([...trips, trip]);
    // Update engaged budget
    setCostCenters(prev => prev.map(cc => 
      cc.id === trip.costCenterId 
        ? { ...cc, engagedBudget: cc.engagedBudget + trip.totalEstimatedCost }
        : cc
    ));
  };

  const updateTripStatus = (tripId: string, status: TripRequest['status']) => {
    setTrips(prev => prev.map(t => t.id === tripId ? { ...t, status } : t));
    
    // If completed, move from engaged to actual
    if (status === 'completed') {
      const trip = trips.find(t => t.id === tripId);
      if (trip) {
        setCostCenters(prev => prev.map(cc => 
          cc.id === trip.costCenterId 
            ? { 
                ...cc, 
                engagedBudget: Math.max(0, cc.engagedBudget - trip.totalEstimatedCost),
                actualBudget: cc.actualBudget + trip.totalEstimatedCost
              }
            : cc
        ));
      }
    }
  };

  return (
    <AppContext.Provider value={{ 
      currentUser, 
      users, 
      trips, 
      costCenters, 
      policy, 
      addTrip, 
      updateTripStatus, 
      login, 
      logout,
      addUser,
      updateUser,
      deleteUser
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
