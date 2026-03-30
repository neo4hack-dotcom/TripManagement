import React, {useMemo, useState} from 'react';
import {useAppContext} from '../context/AppContext';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {Activity, AlertTriangle, CheckCircle2, DollarSign, TrendingUp} from 'lucide-react';

export default function BudgetPilot() {
  const {costCenters, trips, currentUser, policy} = useAppContext();
  const [simulationReduction, setSimulationReduction] = useState(0);

  if (!currentUser) {
    return null;
  }

  const budgetData = costCenters.map(costCenter => ({
    name: costCenter.name,
    Initial: costCenter.initialBudget,
    Engage: costCenter.engagedBudget,
    Reel: costCenter.actualBudget,
    Restant: Math.max(0, costCenter.initialBudget - costCenter.engagedBudget - costCenter.actualBudget),
  }));

  const seasonalityData = useMemo(() => {
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data = months.map(month => ({name: month, voyages: 0, cout: 0}));

    trips.forEach(trip => {
      const monthIndex = new Date(trip.startDate).getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        data[monthIndex].voyages += 1;
        data[monthIndex].cout += trip.totalEstimatedCost;
      }
    });

    return data;
  }, [trips]);

  const budgetAlerts = costCenters.filter(costCenter => {
    const consumed = costCenter.engagedBudget + costCenter.actualBudget;
    return consumed > costCenter.initialBudget * (policy.budgetAlertThreshold / 100);
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pilotage budgetaire</h2>
          <p className="text-slate-500 mt-1">Vue consolidee, alertes et simulation simple.</p>
        </div>
      </div>

      {budgetAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-red-800">
              Alertes depassement budget (&gt;{policy.budgetAlertThreshold}%)
            </h3>
            <ul className="mt-2 space-y-1">
              {budgetAlerts.map(costCenter => {
                const consumed = costCenter.engagedBudget + costCenter.actualBudget;
                const percentage = ((consumed / costCenter.initialBudget) * 100).toFixed(1);
                return (
                  <li key={costCenter.id} className="text-sm text-red-700">
                    <strong>{costCenter.name}</strong> a consomme {percentage}% ({consumed} EUR /{' '}
                    {costCenter.initialBudget} EUR).
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <DollarSign size={20} />
            </div>
            <h3 className="font-semibold text-slate-700">Budget global initial</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800 mt-4">
            {costCenters.reduce((sum, costCenter) => sum + costCenter.initialBudget, 0).toLocaleString()} EUR
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <Activity size={20} />
            </div>
            <h3 className="font-semibold text-slate-700">Total engage</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800 mt-4">
            {costCenters.reduce((sum, costCenter) => sum + costCenter.engagedBudget, 0).toLocaleString()} EUR
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle2 size={20} />
            </div>
            <h3 className="font-semibold text-slate-700">Total reel</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800 mt-4">
            {costCenters.reduce((sum, costCenter) => sum + costCenter.actualBudget, 0).toLocaleString()} EUR
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Consommation par centre de cout</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" />
                <Bar dataKey="Reel" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Engage" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Restant" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Saisonnalite des deplacements</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonalityData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend iconType="circle" />
                <Line yAxisId="left" type="monotone" dataKey="cout" name="Cout (EUR)" stroke="#3b82f6" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="voyages" name="Nb voyages" stroke="#8b5cf6" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
            <TrendingUp size={20} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Simulation budgetaire</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 border-r border-slate-100 pr-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reduction budgetaire (%)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                value={simulationReduction}
                onChange={event => setSimulationReduction(Number(event.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="font-bold text-indigo-600 w-12 text-right">{simulationReduction}%</span>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">
              Impact sur les centres de cout
            </h4>
            <div className="space-y-4">
              {costCenters.map(costCenter => {
                const newBudget = costCenter.initialBudget * (1 - simulationReduction / 100);
                const consumed = costCenter.engagedBudget + costCenter.actualBudget;
                const remaining = Math.max(0, newBudget - consumed);
                const isCritical = consumed > newBudget;

                return (
                  <div
                    key={costCenter.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50"
                  >
                    <span className="font-medium text-slate-800">{costCenter.name}</span>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-slate-500 block text-xs">Nouveau budget</span>
                        <span className="font-semibold text-slate-700">{newBudget.toLocaleString()} EUR</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-xs">Capacite restante</span>
                        <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-green-600'}`}>
                          {isCritical ? 'DEPASSE' : `${remaining.toLocaleString()} EUR`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
