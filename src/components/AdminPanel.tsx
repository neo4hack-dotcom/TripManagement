import React, {useEffect, useMemo, useRef, useState} from 'react';
import {useAppContext} from '../context/AppContext';
import {api, AppStatePayload} from '../lib/api';
import {ACCOMMODATION_OPTIONS, CONTINENT_OPTIONS, TRANSPORT_OPTIONS} from '../lib/travel';
import {
  ApprovalProfile,
  ApprovalWorkflowConfig,
  CostCenter,
  LocalLlmConfig,
  Role,
  TravelPolicy,
  TravelRequestProfile,
  User,
} from '../types';
import {
  Check,
  ClipboardList,
  Cpu,
  Database,
  Download,
  Edit2,
  Globe,
  RefreshCcw,
  Save,
  Settings2,
  Shield,
  Trash2,
  Upload,
  UserPlus,
  User as UserIcon,
} from 'lucide-react';

type AdminTab = 'users' | 'cost-centers' | 'profiles' | 'policy' | 'workflow' | 'llm' | 'database';

type LlmModelEntry = {
  id: string;
  owned_by?: string;
};

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

function toCityRateEntries(policy: TravelPolicy) {
  return Object.entries(policy.maxHotelPerNight)
    .filter(([city]) => city !== 'default')
    .map(([city, value]) => ({city, value}));
}

function createEmptyRequestProfile(costCenterId: string): TravelRequestProfile {
  return {
    id: '',
    name: '',
    description: '',
    department: '',
    costCenterId,
    defaultContinent: 'Europe',
    defaultTransportMode: 'plane',
    defaultAccommodationType: 'hotel',
    maxBudget: 0,
    notes: '',
  };
}

function createEmptyApprovalProfile(level: 'n1' | 'n2'): ApprovalProfile {
  return {
    id: '',
    level,
    name: '',
    description: '',
    department: '',
    maxApprovalAmount: 0,
    allowedContinents: ['Europe'],
    checklist: '',
  };
}

export default function AdminPanel() {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    costCenters,
    trips,
    addCostCenter,
    updateCostCenter,
    deleteCostCenter,
    policy,
    updatePolicy,
    workflowConfig,
    updateWorkflowConfig,
    llmConfig,
    updateLlmConfig,
    requestProfiles,
    approvalProfiles,
    addRequestProfile,
    updateRequestProfile,
    deleteRequestProfile,
    addApprovalProfile,
    updateApprovalProfile,
    deleteApprovalProfile,
    importDatabase,
    resetDemoData,
    errorMessage,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [adminStatus, setAdminStatus] = useState('');

  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState<Partial<User>>({
    name: '',
    email: '',
    password: 'password123',
    role: 'employee',
    department: '',
    costCenterId: costCenters[0]?.id ?? '',
    isAdmin: false,
  });

  const [isCostCenterFormOpen, setIsCostCenterFormOpen] = useState(false);
  const [editingCostCenterId, setEditingCostCenterId] = useState<string | null>(null);
  const [costCenterForm, setCostCenterForm] = useState<CostCenter>({
    id: '',
    name: '',
    initialBudget: 0,
    engagedBudget: 0,
    actualBudget: 0,
  });

  const [isRequestProfileFormOpen, setIsRequestProfileFormOpen] = useState(false);
  const [editingRequestProfileId, setEditingRequestProfileId] = useState<string | null>(null);
  const [requestProfileForm, setRequestProfileForm] = useState<TravelRequestProfile>(
    createEmptyRequestProfile(costCenters[0]?.id ?? ''),
  );

  const [isApprovalProfileFormOpen, setIsApprovalProfileFormOpen] = useState(false);
  const [editingApprovalProfileId, setEditingApprovalProfileId] = useState<string | null>(null);
  const [approvalProfileForm, setApprovalProfileForm] = useState<ApprovalProfile>(
    createEmptyApprovalProfile('n1'),
  );

  const [policyForm, setPolicyForm] = useState<TravelPolicy>(policy);
  const [workflowForm, setWorkflowForm] = useState<ApprovalWorkflowConfig>(workflowConfig);
  const [llmForm, setLlmForm] = useState<LocalLlmConfig>(llmConfig);
  const [cityRateEntries, setCityRateEntries] = useState(toCityRateEntries(policy));
  const [availableModels, setAvailableModels] = useState<LlmModelEntry[]>([]);
  const [llmStatus, setLlmStatus] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isTestingLlm, setIsTestingLlm] = useState(false);
  const [isExportingDatabase, setIsExportingDatabase] = useState(false);
  const [isImportingDatabase, setIsImportingDatabase] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setPolicyForm(policy);
    setCityRateEntries(toCityRateEntries(policy));
  }, [policy]);

  useEffect(() => {
    setWorkflowForm(workflowConfig);
  }, [workflowConfig]);

  useEffect(() => {
    setLlmForm(llmConfig);
  }, [llmConfig]);

  useEffect(() => {
    if (!requestProfileForm.costCenterId && costCenters[0]?.id) {
      setRequestProfileForm(prev => ({...prev, costCenterId: costCenters[0].id}));
    }
  }, [costCenters, requestProfileForm.costCenterId]);

  const costCenterUsage = useMemo(() => {
    return costCenters.reduce<Record<string, {users: number; trips: number}>>((usageMap, costCenter) => {
      usageMap[costCenter.id] = {
        users: users.filter(user => user.costCenterId === costCenter.id).length,
        trips: trips.filter(trip => trip.costCenterId === costCenter.id).length,
      };
      return usageMap;
    }, {});
  }, [costCenters, trips, users]);

  const resetStatus = () => {
    setAdminStatus('');
    setLlmStatus('');
  };

  const openNewUserForm = () => {
    resetStatus();
    setEditingUserId(null);
    setUserForm({
      name: '',
      email: '',
      password: 'password123',
      role: 'employee',
      department: '',
      costCenterId: costCenters[0]?.id ?? '',
      isAdmin: false,
    });
    setIsUserFormOpen(true);
  };

  const startEditingUser = (user: User) => {
    resetStatus();
    setEditingUserId(user.id);
    setUserForm(user);
    setIsUserFormOpen(true);
  };

  const saveUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.password || !userForm.costCenterId || !userForm.role) {
      return;
    }

    const nextUser = {
      ...userForm,
      id: editingUserId ?? `u${Date.now()}`,
    } as User;

    const success = editingUserId ? await updateUser(nextUser) : await addUser(nextUser);
    if (!success) {
      return;
    }

    setAdminStatus('Utilisateur enregistre.');
    setIsUserFormOpen(false);
    setEditingUserId(null);
  };

  const openNewCostCenterForm = () => {
    resetStatus();
    setEditingCostCenterId(null);
    setCostCenterForm({
      id: '',
      name: '',
      initialBudget: 0,
      engagedBudget: 0,
      actualBudget: 0,
    });
    setIsCostCenterFormOpen(true);
  };

  const startEditingCostCenter = (costCenter: CostCenter) => {
    resetStatus();
    setEditingCostCenterId(costCenter.id);
    setCostCenterForm(costCenter);
    setIsCostCenterFormOpen(true);
  };

  const saveCostCenter = async () => {
    if (!costCenterForm.name) {
      return;
    }

    const nextCostCenter = {
      ...costCenterForm,
      id: editingCostCenterId ?? `cc${Date.now()}`,
    };

    const success = editingCostCenterId
      ? await updateCostCenter(nextCostCenter)
      : await addCostCenter(nextCostCenter);
    if (!success) {
      return;
    }

    setAdminStatus('Centre de cout enregistre.');
    setIsCostCenterFormOpen(false);
    setEditingCostCenterId(null);
  };

  const openNewRequestProfileForm = () => {
    resetStatus();
    setEditingRequestProfileId(null);
    setRequestProfileForm(createEmptyRequestProfile(costCenters[0]?.id ?? ''));
    setIsRequestProfileFormOpen(true);
  };

  const startEditingRequestProfile = (profile: TravelRequestProfile) => {
    resetStatus();
    setEditingRequestProfileId(profile.id);
    setRequestProfileForm(profile);
    setIsRequestProfileFormOpen(true);
  };

  const saveRequestProfile = async () => {
    if (!requestProfileForm.name || !requestProfileForm.costCenterId) {
      return;
    }

    const nextProfile = {
      ...requestProfileForm,
      id: editingRequestProfileId ?? `rp${Date.now()}`,
    };

    const success = editingRequestProfileId
      ? await updateRequestProfile(nextProfile)
      : await addRequestProfile(nextProfile);
    if (!success) {
      return;
    }

    setAdminStatus('Profil de demande enregistre.');
    setIsRequestProfileFormOpen(false);
    setEditingRequestProfileId(null);
  };

  const openNewApprovalProfileForm = (level: 'n1' | 'n2') => {
    resetStatus();
    setEditingApprovalProfileId(null);
    setApprovalProfileForm(createEmptyApprovalProfile(level));
    setIsApprovalProfileFormOpen(true);
  };

  const startEditingApprovalProfile = (profile: ApprovalProfile) => {
    resetStatus();
    setEditingApprovalProfileId(profile.id);
    setApprovalProfileForm(profile);
    setIsApprovalProfileFormOpen(true);
  };

  const saveApprovalProfile = async () => {
    if (!approvalProfileForm.name) {
      return;
    }

    const nextProfile = {
      ...approvalProfileForm,
      id: editingApprovalProfileId ?? `ap${Date.now()}`,
    };

    const success = editingApprovalProfileId
      ? await updateApprovalProfile(nextProfile)
      : await addApprovalProfile(nextProfile);
    if (!success) {
      return;
    }

    setAdminStatus(`Profil ${nextProfile.level.toUpperCase()} enregistre.`);
    setIsApprovalProfileFormOpen(false);
    setEditingApprovalProfileId(null);
  };

  const savePolicy = async () => {
    const maxHotelPerNight = cityRateEntries.reduce<Record<string, number>>(
      (accumulator, entry) => {
        if (entry.city.trim()) {
          accumulator[entry.city.trim()] = Number(entry.value);
        }
        return accumulator;
      },
      {default: Number(policyForm.maxHotelPerNight.default ?? 120)},
    );

    const success = await updatePolicy({
      ...policyForm,
      maxHotelPerNight,
      budgetAlertThreshold: Number(policyForm.budgetAlertThreshold),
      maxMealPerDay: Number(policyForm.maxMealPerDay),
    });
    if (success) {
      setAdminStatus('Politique voyage mise a jour.');
    }
  };

  const saveWorkflow = async () => {
    const success = await updateWorkflowConfig({
      ...workflowForm,
      level2AmountThreshold: Number(workflowForm.level2AmountThreshold),
      level3AmountThreshold: Number(workflowForm.level3AmountThreshold),
    });
    if (success) {
      setAdminStatus('Workflow enregistre.');
    }
  };

  const saveLlm = async () => {
    const success = await updateLlmConfig({
      ...llmForm,
      baseUrl: normalizeBaseUrl(llmForm.baseUrl),
    });
    if (success) {
      setLlmStatus('Configuration LLM enregistree sur le backend.');
    }
  };

  const loadModels = async () => {
    const baseUrl = normalizeBaseUrl(llmForm.baseUrl);

    if (!baseUrl) {
      setLlmStatus('Renseignez d abord une URL de base pour le serveur OpenAI-compatible.');
      return;
    }

    setIsLoadingModels(true);
    setLlmStatus('');

    try {
      const payload = await api.loadLlmModels({
        ...llmForm,
        baseUrl,
      });
      const models = Array.isArray(payload.data) ? payload.data : [];
      setAvailableModels(models);

      if (models[0] && !llmForm.selectedModel) {
        setLlmForm(prev => ({...prev, selectedModel: models[0].id}));
      }

      setLlmStatus(
        models.length > 0
          ? `${models.length} modele(s) detecte(s) sur le serveur local.`
          : 'Le serveur repond mais n expose aucun modele.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setLlmStatus(`Impossible de charger les modeles: ${message}`);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const testLlm = async () => {
    const baseUrl = normalizeBaseUrl(llmForm.baseUrl);
    const model = llmForm.selectedModel || availableModels[0]?.id;

    if (!baseUrl) {
      setLlmStatus('Renseignez une URL de base avant le test.');
      return;
    }

    if (!model) {
      setLlmStatus('Choisissez ou chargez un modele avant le test.');
      return;
    }

    setIsTestingLlm(true);
    setLlmStatus('');

    try {
      const payload = await api.testLlm({
        ...llmForm,
        baseUrl,
        selectedModel: model,
      });
      setLlmStatus(`Connexion reussie avec ${payload.model}: ${payload.content}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setLlmStatus(`Echec du test LLM: ${message}`);
    } finally {
      setIsTestingLlm(false);
    }
  };

  const handleExportDatabase = async () => {
    setIsExportingDatabase(true);
    resetStatus();

    try {
      const payload = await api.exportDatabase();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type: 'application/json'});
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `DB-export-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setAdminStatus('Export complet telecharge depuis la base courante.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setAdminStatus(`Impossible d exporter la base: ${message}`);
    } finally {
      setIsExportingDatabase(false);
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsImportingDatabase(true);
    resetStatus();

    try {
      const rawContent = await file.text();
      const payload = JSON.parse(rawContent) as AppStatePayload;
      const success = await importDatabase(payload);

      if (!success) {
        return;
      }

      setAdminStatus('Import termine. Le frontend est maintenant resynchronise avec la base importee.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      setAdminStatus(`Import impossible: ${message}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setIsImportingDatabase(false);
    }
  };

  const tabs: Array<{id: AdminTab; label: string; icon: React.ReactNode}> = [
    {id: 'users', label: 'Utilisateurs', icon: <UserPlus size={16} />},
    {id: 'cost-centers', label: 'Centres de cout', icon: <Database size={16} />},
    {id: 'profiles', label: 'Profils', icon: <ClipboardList size={16} />},
    {id: 'policy', label: 'Politique voyage', icon: <Settings2 size={16} />},
    {id: 'workflow', label: 'Workflow', icon: <Shield size={16} />},
    {id: 'llm', label: 'LLM local', icon: <Cpu size={16} />},
    {id: 'database', label: 'Base JSON', icon: <Database size={16} />},
  ];

  const groupedApprovalProfiles = {
    n1: approvalProfiles.filter(profile => profile.level === 'n1'),
    n2: approvalProfiles.filter(profile => profile.level === 'n2'),
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Centre d administration</h2>
            <p className="text-slate-500 mt-1">
              Gere les utilisateurs, budgets, profils, regles metier et connexion LLM.
            </p>
          </div>

          <button
            onClick={() => void resetDemoData()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCcw size={16} />
            Reinitialiser les donnees de demo
          </button>
        </div>

        {(adminStatus || errorMessage) && (
          <div
            className={`mt-4 rounded-lg border p-4 text-sm ${
              errorMessage ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'
            }`}
          >
            {errorMessage || adminStatus}
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">Gestion des utilisateurs</h3>
            <button
              onClick={openNewUserForm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
            >
              <UserPlus size={18} />
              Ajouter un utilisateur
            </button>
          </div>

          {isUserFormOpen && (
            <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800">
                {editingUserId ? 'Modifier un utilisateur' : 'Nouvel utilisateur'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  className="border p-2 rounded-lg text-sm"
                  placeholder="Nom complet"
                  value={userForm.name ?? ''}
                  onChange={event => setUserForm({...userForm, name: event.target.value})}
                />
                <input
                  className="border p-2 rounded-lg text-sm"
                  placeholder="Email / identifiant"
                  value={userForm.email ?? ''}
                  onChange={event => setUserForm({...userForm, email: event.target.value})}
                />
                <input
                  className="border p-2 rounded-lg text-sm"
                  type="password"
                  placeholder="Mot de passe"
                  value={userForm.password ?? ''}
                  onChange={event => setUserForm({...userForm, password: event.target.value})}
                />
                <select
                  className="border p-2 rounded-lg text-sm bg-white"
                  value={userForm.role}
                  onChange={event => setUserForm({...userForm, role: event.target.value as Role})}
                >
                  <option value="employee">Employe</option>
                  <option value="manager">Manager</option>
                  <option value="director">Directeur</option>
                  <option value="finance">Finance</option>
                </select>
                <input
                  className="border p-2 rounded-lg text-sm"
                  placeholder="Departement"
                  value={userForm.department ?? ''}
                  onChange={event => setUserForm({...userForm, department: event.target.value})}
                />
                <select
                  className="border p-2 rounded-lg text-sm bg-white"
                  value={userForm.costCenterId}
                  onChange={event => setUserForm({...userForm, costCenterId: event.target.value})}
                >
                  {costCenters.map(costCenter => (
                    <option key={costCenter.id} value={costCenter.id}>
                      {costCenter.name}
                    </option>
                  ))}
                </select>
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={Boolean(userForm.isAdmin)}
                  onChange={event => setUserForm({...userForm, isAdmin: event.target.checked})}
                />
                Donner l acces a l administration complete
              </label>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsUserFormOpen(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void saveUser()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Check size={16} />
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Utilisateur</th>
                  <th className="p-4 font-medium">Role</th>
                  <th className="p-4 font-medium">Centre de cout</th>
                  <th className="p-4 font-medium">Admin</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                          <UserIcon size={16} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{user.name}</p>
                          <p className="text-xs text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">{user.role}</td>
                    <td className="p-4 text-slate-600">
                      {costCenters.find(costCenter => costCenter.id === user.costCenterId)?.name ?? '-'}
                    </td>
                    <td className="p-4 text-slate-600">{user.isAdmin ? 'Oui' : 'Non'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditingUser(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => void deleteUser(user.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'cost-centers' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-800">Configuration des centres de cout</h3>
            <button
              onClick={openNewCostCenterForm}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
            >
              <Database size={18} />
              Ajouter un centre de cout
            </button>
          </div>

          {isCostCenterFormOpen && (
            <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
              <h4 className="font-bold text-slate-800">
                {editingCostCenterId ? 'Modifier un centre de cout' : 'Nouveau centre de cout'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input
                  className="border p-2 rounded-lg text-sm md:col-span-2"
                  placeholder="Nom du centre de cout"
                  value={costCenterForm.name}
                  onChange={event => setCostCenterForm({...costCenterForm, name: event.target.value})}
                />
                <input
                  className="border p-2 rounded-lg text-sm"
                  type="number"
                  min="0"
                  placeholder="Budget initial"
                  value={costCenterForm.initialBudget}
                  onChange={event =>
                    setCostCenterForm({...costCenterForm, initialBudget: Number(event.target.value || 0)})
                  }
                />
                <input
                  className="border p-2 rounded-lg text-sm"
                  type="number"
                  min="0"
                  placeholder="Engage"
                  value={costCenterForm.engagedBudget}
                  onChange={event =>
                    setCostCenterForm({...costCenterForm, engagedBudget: Number(event.target.value || 0)})
                  }
                />
                <input
                  className="border p-2 rounded-lg text-sm"
                  type="number"
                  min="0"
                  placeholder="Reel"
                  value={costCenterForm.actualBudget}
                  onChange={event =>
                    setCostCenterForm({...costCenterForm, actualBudget: Number(event.target.value || 0)})
                  }
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setIsCostCenterFormOpen(false)}
                  className="px-4 py-2 text-slate-600 text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => void saveCostCenter()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                >
                  <Check size={16} />
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            {costCenters.map(costCenter => {
              const usage = costCenterUsage[costCenter.id];
              const canDelete = usage.users === 0 && usage.trips === 0;
              return (
                <div key={costCenter.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-800">{costCenter.name}</h4>
                      <p className="text-sm text-slate-500 mt-1">
                        Budget initial {costCenter.initialBudget} EUR • Engage {costCenter.engagedBudget} EUR • Reel{' '}
                        {costCenter.actualBudget} EUR
                      </p>
                      <p className="text-xs text-slate-400 mt-2">
                        {usage.users} utilisateur(s) rattache(s) • {usage.trips} voyage(s) rattache(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEditingCostCenter(costCenter)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => void deleteCostCenter(costCenter.id)}
                        disabled={!canDelete}
                        className="px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Profils de demande</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Cree des templates pour initialiser les demandes de voyage.
                  </p>
                </div>
                <button
                  onClick={openNewRequestProfileForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Ajouter
                </button>
              </div>

              {isRequestProfileFormOpen && (
                <div className="border border-blue-200 rounded-xl p-4 space-y-4 bg-blue-50/40">
                  <h4 className="font-semibold text-slate-800">
                    {editingRequestProfileId ? 'Modifier un profil de demande' : 'Nouveau profil de demande'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className="border p-2 rounded-lg text-sm"
                      placeholder="Nom du profil"
                      value={requestProfileForm.name}
                      onChange={event => setRequestProfileForm({...requestProfileForm, name: event.target.value})}
                    />
                    <input
                      className="border p-2 rounded-lg text-sm"
                      placeholder="Departement"
                      value={requestProfileForm.department}
                      onChange={event =>
                        setRequestProfileForm({...requestProfileForm, department: event.target.value})
                      }
                    />
                    <select
                      className="border p-2 rounded-lg text-sm bg-white"
                      value={requestProfileForm.costCenterId}
                      onChange={event =>
                        setRequestProfileForm({...requestProfileForm, costCenterId: event.target.value})
                      }
                    >
                      {costCenters.map(costCenter => (
                        <option key={costCenter.id} value={costCenter.id}>
                          {costCenter.name}
                        </option>
                      ))}
                    </select>
                    <input
                      className="border p-2 rounded-lg text-sm"
                      type="number"
                      min="0"
                      placeholder="Budget max"
                      value={requestProfileForm.maxBudget}
                      onChange={event =>
                        setRequestProfileForm({
                          ...requestProfileForm,
                          maxBudget: Number(event.target.value || 0),
                        })
                      }
                    />
                    <select
                      className="border p-2 rounded-lg text-sm bg-white"
                      value={requestProfileForm.defaultContinent}
                      onChange={event =>
                        setRequestProfileForm({
                          ...requestProfileForm,
                          defaultContinent: event.target.value as TravelRequestProfile['defaultContinent'],
                        })
                      }
                    >
                      {CONTINENT_OPTIONS.map(continent => (
                        <option key={continent} value={continent}>
                          {continent}
                        </option>
                      ))}
                    </select>
                    <select
                      className="border p-2 rounded-lg text-sm bg-white"
                      value={requestProfileForm.defaultTransportMode}
                      onChange={event =>
                        setRequestProfileForm({
                          ...requestProfileForm,
                          defaultTransportMode: event.target.value as TravelRequestProfile['defaultTransportMode'],
                        })
                      }
                    >
                      {TRANSPORT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="border p-2 rounded-lg text-sm bg-white"
                      value={requestProfileForm.defaultAccommodationType}
                      onChange={event =>
                        setRequestProfileForm({
                          ...requestProfileForm,
                          defaultAccommodationType:
                            event.target.value as TravelRequestProfile['defaultAccommodationType'],
                        })
                      }
                    >
                      {ACCOMMODATION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="border p-2 rounded-lg text-sm"
                      placeholder="Description courte"
                      value={requestProfileForm.description}
                      onChange={event =>
                        setRequestProfileForm({...requestProfileForm, description: event.target.value})
                      }
                    />
                  </div>
                  <textarea
                    className="border p-2 rounded-lg text-sm w-full"
                    rows={3}
                    placeholder="Notes d'utilisation"
                    value={requestProfileForm.notes}
                    onChange={event => setRequestProfileForm({...requestProfileForm, notes: event.target.value})}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsRequestProfileFormOpen(false)}
                      className="px-4 py-2 text-slate-600 text-sm font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => void saveRequestProfile()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <Check size={16} />
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {requestProfiles.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500 text-center">
                    Aucun profil de demande configure pour le moment.
                  </div>
                )}
                {requestProfiles.map(profile => (
                  <div key={profile.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-slate-800">{profile.name}</h4>
                        <p className="text-sm text-slate-500 mt-1">{profile.description || 'Sans description'}</p>
                        <p className="text-xs text-slate-500 mt-2">
                          {profile.department || 'Tous departements'} •{' '}
                          {costCenters.find(costCenter => costCenter.id === profile.costCenterId)?.name ?? profile.costCenterId}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {profile.defaultContinent} • {profile.defaultTransportMode} • {profile.defaultAccommodationType} • Budget max {profile.maxBudget} EUR
                        </p>
                        {profile.notes && <p className="text-xs text-slate-500 mt-2">{profile.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => startEditingRequestProfile(profile)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => void deleteRequestProfile(profile.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Profils d approbation N+1 / N+2</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Definis les cadres de validation pour les managers et directions.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openNewApprovalProfileForm('n1')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Ajouter N+1
                  </button>
                  <button
                    onClick={() => openNewApprovalProfileForm('n2')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium"
                  >
                    Ajouter N+2
                  </button>
                </div>
              </div>

              {isApprovalProfileFormOpen && (
                <div className="border border-blue-200 rounded-xl p-4 space-y-4 bg-blue-50/40">
                  <h4 className="font-semibold text-slate-800">
                    {editingApprovalProfileId
                      ? `Modifier un profil ${approvalProfileForm.level.toUpperCase()}`
                      : `Nouveau profil ${approvalProfileForm.level.toUpperCase()}`}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <select
                      className="border p-2 rounded-lg text-sm bg-white"
                      value={approvalProfileForm.level}
                      onChange={event =>
                        setApprovalProfileForm({
                          ...approvalProfileForm,
                          level: event.target.value as ApprovalProfile['level'],
                        })
                      }
                    >
                      <option value="n1">N+1</option>
                      <option value="n2">N+2</option>
                    </select>
                    <input
                      className="border p-2 rounded-lg text-sm"
                      placeholder="Nom du profil"
                      value={approvalProfileForm.name}
                      onChange={event => setApprovalProfileForm({...approvalProfileForm, name: event.target.value})}
                    />
                    <input
                      className="border p-2 rounded-lg text-sm"
                      placeholder="Departement"
                      value={approvalProfileForm.department}
                      onChange={event =>
                        setApprovalProfileForm({...approvalProfileForm, department: event.target.value})
                      }
                    />
                    <input
                      className="border p-2 rounded-lg text-sm"
                      type="number"
                      min="0"
                      placeholder="Montant max"
                      value={approvalProfileForm.maxApprovalAmount}
                      onChange={event =>
                        setApprovalProfileForm({
                          ...approvalProfileForm,
                          maxApprovalAmount: Number(event.target.value || 0),
                        })
                      }
                    />
                    <input
                      className="border p-2 rounded-lg text-sm md:col-span-2"
                      placeholder="Description"
                      value={approvalProfileForm.description}
                      onChange={event =>
                        setApprovalProfileForm({...approvalProfileForm, description: event.target.value})
                      }
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Continents couverts</p>
                    <div className="flex flex-wrap gap-2">
                      {CONTINENT_OPTIONS.map(continent => {
                        const isSelected = approvalProfileForm.allowedContinents.includes(continent);
                        return (
                          <button
                            key={continent}
                            onClick={() =>
                              setApprovalProfileForm(prev => ({
                                ...prev,
                                allowedContinents: isSelected
                                  ? prev.allowedContinents.filter(item => item !== continent)
                                  : [...prev.allowedContinents, continent],
                              }))
                            }
                            className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              isSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            {continent}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <textarea
                    className="border p-2 rounded-lg text-sm w-full"
                    rows={4}
                    placeholder="Checklist de validation"
                    value={approvalProfileForm.checklist}
                    onChange={event =>
                      setApprovalProfileForm({...approvalProfileForm, checklist: event.target.value})
                    }
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsApprovalProfileFormOpen(false)}
                      className="px-4 py-2 text-slate-600 text-sm font-medium"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => void saveApprovalProfile()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <Check size={16} />
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-4">
                {(['n1', 'n2'] as const).map(level => (
                  <div key={level} className="space-y-3">
                    <h4 className="font-semibold text-slate-800">Profils {level.toUpperCase()}</h4>
                    {groupedApprovalProfiles[level].length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                        Aucun profil {level.toUpperCase()} configure.
                      </div>
                    )}
                    {groupedApprovalProfiles[level].map(profile => (
                      <div key={profile.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h5 className="font-semibold text-slate-800">{profile.name}</h5>
                            <p className="text-sm text-slate-500 mt-1">{profile.description || 'Sans description'}</p>
                            <p className="text-xs text-slate-500 mt-2">
                              {profile.department || 'Tous departements'} • Plafond {profile.maxApprovalAmount} EUR
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Continents: {profile.allowedContinents.join(', ')}
                            </p>
                            {profile.checklist && <p className="text-xs text-slate-500 mt-2">{profile.checklist}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => startEditingApprovalProfile(profile)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => void deleteApprovalProfile(profile.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'policy' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Politique voyage</h3>
              <p className="text-sm text-slate-500 mt-1">
                Reglez les plafonds repas, hebergement et l alerte budgetaire.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Forfait repas / jour</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                  value={policyForm.maxMealPerDay}
                  onChange={event =>
                    setPolicyForm({...policyForm, maxMealPerDay: Number(event.target.value || 0)})
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Plafond hotel par defaut</label>
                <input
                  type="number"
                  min="0"
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                  value={policyForm.maxHotelPerNight.default ?? 0}
                  onChange={event =>
                    setPolicyForm({
                      ...policyForm,
                      maxHotelPerNight: {
                        ...policyForm.maxHotelPerNight,
                        default: Number(event.target.value || 0),
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Seuil d alerte budgetaire (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="w-full border border-slate-300 rounded-lg p-2.5"
                  value={policyForm.budgetAlertThreshold}
                  onChange={event =>
                    setPolicyForm({...policyForm, budgetAlertThreshold: Number(event.target.value || 0)})
                  }
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-slate-800">Plafonds hoteliers par ville</h4>
                <button
                  onClick={() => setCityRateEntries(prev => [...prev, {city: '', value: 0}])}
                  className="text-sm font-medium text-blue-600"
                >
                  Ajouter une ville
                </button>
              </div>

              {cityRateEntries.map((entry, index) => (
                <div key={`${entry.city}-${index}`} className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
                  <input
                    className="border border-slate-300 rounded-lg p-2.5"
                    placeholder="Ville"
                    value={entry.city}
                    onChange={event =>
                      setCityRateEntries(prev =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? {...item, city: event.target.value} : item,
                        ),
                      )
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    className="border border-slate-300 rounded-lg p-2.5"
                    placeholder="Montant"
                    value={entry.value}
                    onChange={event =>
                      setCityRateEntries(prev =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? {...item, value: Number(event.target.value || 0)} : item,
                        ),
                      )
                    }
                  />
                  <button
                    onClick={() => setCityRateEntries(prev => prev.filter((_, itemIndex) => itemIndex !== index))}
                    className="px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => void savePolicy()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
              >
                <Save size={16} />
                Enregistrer la politique
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workflow' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Workflow de validation</h3>
            <p className="text-sm text-slate-500 mt-1">
              Definissez les seuils financiers et geographiques de routage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Seuil N+2 (EUR)</label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-300 rounded-lg p-2.5"
                value={workflowForm.level2AmountThreshold}
                onChange={event =>
                  setWorkflowForm({
                    ...workflowForm,
                    level2AmountThreshold: Number(event.target.value || 0),
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Seuil Finance (EUR)</label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-300 rounded-lg p-2.5"
                value={workflowForm.level3AmountThreshold}
                onChange={event =>
                  setWorkflowForm({
                    ...workflowForm,
                    level3AmountThreshold: Number(event.target.value || 0),
                  })
                }
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={workflowForm.requireLevel2ForNonEurope}
              onChange={event =>
                setWorkflowForm({...workflowForm, requireLevel2ForNonEurope: event.target.checked})
              }
            />
            Exiger un passage N+2 pour tout voyage hors Europe
          </label>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Globe size={16} className="text-slate-500" />
              <h4 className="font-semibold text-slate-800">Continents envoyes en Finance</h4>
            </div>
            <div className="flex flex-wrap gap-3">
              {CONTINENT_OPTIONS.map(continent => {
                const isSelected = workflowForm.level3Continents.includes(continent);
                return (
                  <button
                    key={continent}
                    onClick={() =>
                      setWorkflowForm(prev => ({
                        ...prev,
                        level3Continents: isSelected
                          ? prev.level3Continents.filter(item => item !== continent)
                          : [...prev.level3Continents, continent],
                      }))
                    }
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {continent}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => void saveWorkflow()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              <Save size={16} />
              Enregistrer le workflow
            </button>
          </div>
        </div>
      )}

      {activeTab === 'llm' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Configuration LLM local</h3>
            <p className="text-sm text-slate-500 mt-1">
              Connectez un serveur HTTP compatible OpenAI, chargez les modeles disponibles puis testez la reponse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
              <input
                className="w-full border border-slate-300 rounded-lg p-2.5"
                placeholder="http://127.0.0.1:1234/v1"
                value={llmForm.baseUrl}
                onChange={event => setLlmForm({...llmForm, baseUrl: event.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API key</label>
              <input
                className="w-full border border-slate-300 rounded-lg p-2.5"
                type="password"
                placeholder="Optionnelle pour un serveur local"
                value={llmForm.apiKey}
                onChange={event => setLlmForm({...llmForm, apiKey: event.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modele selectionne</label>
              <input
                className="w-full border border-slate-300 rounded-lg p-2.5"
                placeholder="Nom du modele"
                value={llmForm.selectedModel}
                onChange={event => setLlmForm({...llmForm, selectedModel: event.target.value})}
              />
            </div>
            <button
              onClick={() => void loadModels()}
              disabled={isLoadingModels}
              className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {isLoadingModels ? 'Chargement...' : 'Afficher les models'}
            </button>
            <button
              onClick={() => void testLlm()}
              disabled={isTestingLlm}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {isTestingLlm ? 'Test en cours...' : 'Tester'}
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">System prompt</label>
            <textarea
              rows={4}
              className="w-full border border-slate-300 rounded-lg p-2.5"
              value={llmForm.systemPrompt}
              onChange={event => setLlmForm({...llmForm, systemPrompt: event.target.value})}
            />
          </div>

          {availableModels.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-800">Modeles disponibles</h4>
              <div className="flex flex-wrap gap-2">
                {availableModels.map(model => (
                  <button
                    key={model.id}
                    onClick={() => setLlmForm(prev => ({...prev, selectedModel: model.id}))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      llmForm.selectedModel === model.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {model.id}
                  </button>
                ))}
              </div>
            </div>
          )}

          {llmStatus && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              {llmStatus}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => void saveLlm()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium"
            >
              <Save size={16} />
              Enregistrer la configuration LLM
            </button>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Sauvegarde et restauration</h3>
            <p className="text-sm text-slate-500 mt-1">
              Exportez toutes les donnees courantes de l application depuis `DB.json`, ou reimportez un snapshot complet pour resynchroniser integralement le frontend et la base.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50 space-y-4">
              <div>
                <h4 className="font-semibold text-slate-800">Exporter toutes les donnees</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Genere un export JSON complet de la base actuelle, incluant utilisateurs, voyages, configuration, profils et connexion LLM.
                </p>
              </div>
              <button
                onClick={() => void handleExportDatabase()}
                disabled={isExportingDatabase}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-60"
              >
                <Download size={16} />
                {isExportingDatabase ? 'Export en cours...' : 'Exporter la base'}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50 space-y-4">
              <div>
                <h4 className="font-semibold text-slate-800">Reimporter toutes les donnees</h4>
                <p className="text-sm text-slate-500 mt-1">
                  Importe un fichier JSON complet et remplace la base actuelle. Toute l application est ensuite rechargee avec cet etat.
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={event => void handleImportDatabase(event)}
                className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-white"
              />
              <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                <Upload size={16} />
                {isImportingDatabase ? 'Import en cours...' : 'Choisissez un fichier JSON exporte depuis l application.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
