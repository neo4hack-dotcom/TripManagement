import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, AlertTriangle, DollarSign, Activity, CheckCircle2 } from 'lucide-react';

export default function BudgetPilot() {
  const { costCenters, trips, currentUser } = useAppContext();
  const [simulationReduction, setSimulationReduction] = useState<number>(0);

  if (!currentUser) return null;

  // Colors for charts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Data preparation for charts
  const budgetData = costCenters.map(cc => ({
    name: cc.name,
    Initial: cc.initialBudget,
    Engagé: cc.engagedBudget,
    Réel: cc.actualBudget,
    Restant: Math.max(0, cc.initialBudget - cc.engagedBudget - cc.actualBudget),
    Consommé: cc.engagedBudget + cc.actualBudget
  }));

  // Seasonality analysis (mocking months based on trips)
  const seasonalityData = useMemo(() => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const data = months.map(m => ({ name: m, voyages: 0, cout: 0 }));
    
    trips.forEach(trip => {
      const date = new Date(trip.startDate);
      const monthIndex = date.getMonth();
      if (monthIndex >= 0 && monthIndex < 12) {
        data[monthIndex].voyages += 1;
        data[monthIndex].cout += trip.totalEstimatedCost;
      }
    });
    
    return data;
  }, [trips]);

  // Alerts for budget > 80%
  const budgetAlerts = costCenters.filter(cc => {
    const consumed = cc.engagedBudget + cc.actualBudget;
    return consumed > cc.initialBudget * 0.8;
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Pilotage Budgétaire</h2>
          <p className="text-slate-500 mt-1">Vue consolidée et prévisions financières</p>
        </div>
      </div>

      {/* Alerts Section */}
      {budgetAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-4">
          <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-bold text-red-800">Alertes Dépassement Budget (&gt;80%)</h3>
            <ul className="mt-2 space-y-1">
              {budgetAlerts.map(cc => {
                const consumed = cc.engagedBudget + cc.actualBudget;
                const percentage = ((consumed / cc.initialBudget) * 100).toFixed(1);
                return (
                  <li key={cc.id} className="text-sm text-red-700">
                    <strong>{cc.name}</strong> a consommé {percentage}% de son enveloppe annuelle ({consumed}€ / {cc.initialBudget}€).
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
            <h3 className="font-semibold text-slate-700">Budget Global Initial</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800 mt-4">
            {costCenters.reduce((acc, cc) => acc + cc.initialBudget, 0).toLocaleString()} €
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Activity size={20} /></div>
            <h3 className="font-semibold text-slate-700">Total Engagé (En cours)</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800 mt-4">
            {costCenters.reduce((acc, cc) => acc + cc.engagedBudget, 0).toLocaleString()} €
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CheckCircle2 size={20} /></div>
            <h3 className="font-semibold text-slate-700">Total Réel (Consommé)</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800 mt-4">
            {costCenters.reduce((acc, cc) => acc + cc.actualBudget, 0).toLocaleString()} €
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Center Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Consommation par Centre de Coût</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="Réel" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                <Bar dataKey="Engagé" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Restant" stackId="a" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Seasonality */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Saisonnalité des Déplacements</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seasonalityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Line yAxisId="left" type="monotone" dataKey="cout" name="Coût (€)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                <Line yAxisId="right" type="monotone" dataKey="voyages" name="Nb Voyages" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Simulation Module */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><TrendingUp size={20} /></div>
          <h3 className="text-lg font-bold text-slate-800">Simulation & Forecasting</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 border-r border-slate-100 pr-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Scénario de réduction budgétaire (%)
            </label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="0" 
                max="30" 
                step="5"
                value={simulationReduction}
                onChange={(e) => setSimulationReduction(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <span className="font-bold text-indigo-600 w-12 text-right">{simulationReduction}%</span>
            </div>
            <p className="text-xs text-slate-500 mt-4">
              Ajustez le curseur pour simuler l'impact d'une coupe budgétaire sur les capacités de déplacement restantes.
            </p>
          </div>
          
          <div className="md:col-span-2">
            <h4 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wider">Impact sur les Centres de Coût</h4>
            <div className="space-y-4">
              {costCenters.map(cc => {
                const newBudget = cc.initialBudget * (1 - simulationReduction / 100);
                const consumed = cc.engagedBudget + cc.actualBudget;
                const remaining = Math.max(0, newBudget - consumed);
                const isCritical = consumed > newBudget;
                
                return (
                  <div key={cc.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <span className="font-medium text-slate-800">{cc.name}</span>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <span className="text-slate-500 block text-xs">Nouveau Budget</span>
                        <span className="font-semibold text-slate-700">{newBudget.toLocaleString()} €</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-xs">Capacité Restante</span>
                        <span className={`font-bold ${isCritical ? 'text-red-600' : 'text-green-600'}`}>
                          {isCritical ? 'DÉPASSÉ' : `${remaining.toLocaleString()} €`}
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

