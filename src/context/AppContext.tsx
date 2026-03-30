import React, {createContext, ReactNode, useContext, useEffect, useState} from 'react';
import {api, AppStatePayload} from '../lib/api';
import {
  ApprovalProfile,
  ApprovalWorkflowConfig,
  CostCenter,
  LocalLlmConfig,
  TravelRequestProfile,
  TravelPolicy,
  TripRequest,
  User,
} from '../types';

interface AppState {
  currentUser: User | null;
  users: User[];
  trips: TripRequest[];
  costCenters: CostCenter[];
  policy: TravelPolicy;
  workflowConfig: ApprovalWorkflowConfig;
  llmConfig: LocalLlmConfig;
  requestProfiles: TravelRequestProfile[];
  approvalProfiles: ApprovalProfile[];
  isBootstrapping: boolean;
  errorMessage: string;
  clearErrorMessage: () => void;
  addTrip: (trip: TripRequest) => Promise<boolean>;
  updateTripStatus: (tripId: string, status: TripRequest['status']) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  addUser: (user: User) => Promise<boolean>;
  updateUser: (user: User) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  addCostCenter: (costCenter: CostCenter) => Promise<boolean>;
  updateCostCenter: (costCenter: CostCenter) => Promise<boolean>;
  deleteCostCenter: (costCenterId: string) => Promise<boolean>;
  updatePolicy: (policy: TravelPolicy) => Promise<boolean>;
  updateWorkflowConfig: (workflowConfig: ApprovalWorkflowConfig) => Promise<boolean>;
  updateLlmConfig: (llmConfig: LocalLlmConfig) => Promise<boolean>;
  addRequestProfile: (profile: TravelRequestProfile) => Promise<boolean>;
  updateRequestProfile: (profile: TravelRequestProfile) => Promise<boolean>;
  deleteRequestProfile: (profileId: string) => Promise<boolean>;
  addApprovalProfile: (profile: ApprovalProfile) => Promise<boolean>;
  updateApprovalProfile: (profile: ApprovalProfile) => Promise<boolean>;
  deleteApprovalProfile: (profileId: string) => Promise<boolean>;
  importDatabase: (payload: AppStatePayload) => Promise<boolean>;
  resetDemoData: () => Promise<boolean>;
}

const SESSION_USER_KEY = 'tripflow-current-user-id';

const emptyPolicy: TravelPolicy = {
  maxHotelPerNight: {default: 120},
  maxMealPerDay: 60,
  budgetAlertThreshold: 80,
};

const emptyWorkflowConfig: ApprovalWorkflowConfig = {
  level2AmountThreshold: 2000,
  level3AmountThreshold: 5000,
  requireLevel2ForNonEurope: true,
  level3Continents: ['Asia', 'Oceania'],
};

const emptyLlmConfig: LocalLlmConfig = {
  baseUrl: 'http://127.0.0.1:1234/v1',
  apiKey: '',
  selectedModel: '',
  systemPrompt: 'You are a local travel assistant helping complete business trip requests.',
};

const AppContext = createContext<AppState | undefined>(undefined);

function getStoredCurrentUserId() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.sessionStorage.getItem(SESSION_USER_KEY) ?? '';
}

function storeCurrentUserId(userId: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (userId) {
    window.sessionStorage.setItem(SESSION_USER_KEY, userId);
    return;
  }

  window.sessionStorage.removeItem(SESSION_USER_KEY);
}

export const AppProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [trips, setTrips] = useState<TripRequest[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [policy, setPolicy] = useState<TravelPolicy>(emptyPolicy);
  const [workflowConfig, setWorkflowConfig] = useState<ApprovalWorkflowConfig>(emptyWorkflowConfig);
  const [llmConfig, setLlmConfig] = useState<LocalLlmConfig>(emptyLlmConfig);
  const [requestProfiles, setRequestProfiles] = useState<TravelRequestProfile[]>([]);
  const [approvalProfiles, setApprovalProfiles] = useState<ApprovalProfile[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const clearErrorMessage = () => setErrorMessage('');

  const applyPayload = (payload: AppStatePayload, preferredCurrentUserId?: string | null) => {
    setUsers(payload.users);
    setTrips(payload.trips);
    setCostCenters(payload.costCenters);
    setPolicy(payload.policy);
    setWorkflowConfig(payload.workflowConfig);
    setLlmConfig(payload.llmConfig);
    setRequestProfiles(payload.requestProfiles);
    setApprovalProfiles(payload.approvalProfiles);

    const nextCurrentUserId = preferredCurrentUserId ?? getStoredCurrentUserId();
    const nextCurrentUser = payload.users.find(user => user.id === nextCurrentUserId) ?? null;
    setCurrentUser(nextCurrentUser);
    storeCurrentUserId(nextCurrentUser?.id ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialState = async () => {
      setIsBootstrapping(true);

      try {
        const payload = await api.bootstrap();
        if (!isMounted) {
          return;
        }
        applyPayload(payload);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message = error instanceof Error ? error.message : 'Impossible de charger les donnees.';
        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    };

    void loadInitialState();

    return () => {
      isMounted = false;
    };
  }, []);

  const runMutation = async (
    action: () => Promise<AppStatePayload>,
    preferredCurrentUserId?: string | null,
  ) => {
    try {
      const payload = await action();
      applyPayload(payload, preferredCurrentUserId);
      setErrorMessage('');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Operation impossible.';
      setErrorMessage(message);
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      setCurrentUser(response.user);
      storeCurrentUserId(response.user.id);
      setErrorMessage('');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Identifiants invalides.';
      setErrorMessage(message);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    storeCurrentUserId(null);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        trips,
        costCenters,
        policy,
        workflowConfig,
        llmConfig,
        requestProfiles,
        approvalProfiles,
        isBootstrapping,
        errorMessage,
        clearErrorMessage,
        addTrip: trip => runMutation(() => api.addTrip(trip)),
        updateTripStatus: (tripId, status) => runMutation(() => api.updateTripStatus(tripId, status)),
        login,
        logout,
        addUser: user => runMutation(() => api.addUser(user), currentUser?.id ?? null),
        updateUser: user =>
          runMutation(() => api.updateUser(user), currentUser?.id === user.id ? user.id : currentUser?.id ?? null),
        deleteUser: userId =>
          runMutation(
            () => api.deleteUser(userId),
            currentUser?.id === userId ? null : currentUser?.id ?? null,
          ),
        addCostCenter: costCenter => runMutation(() => api.addCostCenter(costCenter), currentUser?.id ?? null),
        updateCostCenter: costCenter =>
          runMutation(() => api.updateCostCenter(costCenter), currentUser?.id ?? null),
        deleteCostCenter: costCenterId =>
          runMutation(() => api.deleteCostCenter(costCenterId), currentUser?.id ?? null),
        updatePolicy: nextPolicy => runMutation(() => api.updatePolicy(nextPolicy), currentUser?.id ?? null),
        updateWorkflowConfig: nextWorkflowConfig =>
          runMutation(() => api.updateWorkflowConfig(nextWorkflowConfig), currentUser?.id ?? null),
        updateLlmConfig: nextLlmConfig =>
          runMutation(() => api.updateLlmConfig(nextLlmConfig), currentUser?.id ?? null),
        addRequestProfile: profile =>
          runMutation(() => api.addRequestProfile(profile), currentUser?.id ?? null),
        updateRequestProfile: profile =>
          runMutation(() => api.updateRequestProfile(profile), currentUser?.id ?? null),
        deleteRequestProfile: profileId =>
          runMutation(() => api.deleteRequestProfile(profileId), currentUser?.id ?? null),
        addApprovalProfile: profile =>
          runMutation(() => api.addApprovalProfile(profile), currentUser?.id ?? null),
        updateApprovalProfile: profile =>
          runMutation(() => api.updateApprovalProfile(profile), currentUser?.id ?? null),
        deleteApprovalProfile: profileId =>
          runMutation(() => api.deleteApprovalProfile(profileId), currentUser?.id ?? null),
        importDatabase: payload => runMutation(() => api.importDatabase(payload), currentUser?.id ?? null),
        resetDemoData: async () => {
          const success = await runMutation(() => api.resetDemoData(), null);
          if (success) {
            setCurrentUser(null);
            storeCurrentUserId(null);
          }
          return success;
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
};
