import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { AlertCircle, CheckCircle2, Plane, Train, Car, Hotel, Home, MapPin, Calendar, DollarSign } from 'lucide-react';
import { TripRequest } from '../types';

export default function RequestForm() {
  const { currentUser, policy, addTrip } = useAppContext();
  
  if (!currentUser) return null;

  const [formData, setFormData] = useState({
    destination: '',
    continent: 'Europe',
    startDate: '',
    endDate: '',
    reason: '',
    transportMode: 'plane' as 'plane' | 'train' | 'car',
    accommodationType: 'hotel' as 'hotel' | 'airbnb' | 'other',
    transportCost: 0,
    accommodationCost: 0,
    mealsCost: 0,
  });

  const [alerts, setAlerts] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  // Calculate days
  const getDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const days = getDays();
  const nights = Math.max(0, days - 1);
  const totalCost = formData.transportCost + formData.accommodationCost + formData.mealsCost;

  // Real-time policy checking
  useEffect(() => {
    const newAlerts: string[] = [];
    
    if (nights > 0 && formData.accommodationCost > 0) {
      const costPerNight = formData.accommodationCost / nights;
      const maxAllowed = policy.maxHotelPerNight[formData.destination] || policy.maxHotelPerNight['default'];
      
      if (costPerNight > maxAllowed) {
        newAlerts.push(`La nuitée à ${formData.destination || 'cette destination'} dépasse le forfait de ${maxAllowed}€ (Estimé: ${costPerNight.toFixed(0)}€/nuit)`);
      }
    }

    if (days > 0 && formData.mealsCost > 0) {
      const mealsPerDay = formData.mealsCost / days;
      if (mealsPerDay > policy.maxMealPerDay) {
        newAlerts.push(`Les frais de repas dépassent le forfait de ${policy.maxMealPerDay}€/jour (Estimé: ${mealsPerDay.toFixed(0)}€/jour)`);
      }
    }

    setAlerts(newAlerts);
  }, [formData, days, nights, policy]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine workflow routing
    let initialStatus: TripRequest['status'] = 'pending_n1';
    // In a real app, the backend would evaluate this. We simulate it here.
    
    const newTrip: TripRequest = {
      id: `t${Date.now()}`,
      userId: currentUser.id,
      destination: formData.destination,
      continent: formData.continent,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason,
      transportMode: formData.transportMode,
      accommodationType: formData.accommodationType,
      estimatedCosts: {
        transport: formData.transportCost,
        accommodation: formData.accommodationCost,
        meals: formData.mealsCost,
      },
      totalEstimatedCost: totalCost,
      status: initialStatus,
      createdAt: new Date().toISOString().split('T')[0],
      costCenterId: currentUser.costCenterId,
      policyAlerts: alerts,
    };

    addTrip(newTrip);
    setSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
      setFormData({
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
      });
    }, 3000);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Demande Soumise !</h2>
        <p className="text-slate-600">Votre demande de voyage a été envoyée pour validation.</p>
        <p className="text-sm text-slate-500 mt-4">Redirection vers le formulaire...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800">Nouvelle Demande de Voyage</h2>
        <p className="text-sm text-slate-500 mt-1">Remplissez les informations ci-dessous pour estimer et soumettre votre demande.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Section 1: Informations Générales */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" />
            Informations Générales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
              <input 
                required
                type="text" 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Ex: Londres, Paris, New York"
                value={formData.destination}
                onChange={e => setFormData({...formData, destination: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Continent</label>
              <select 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                value={formData.continent}
                onChange={e => setFormData({...formData, continent: e.target.value})}
              >
                <option value="Europe">Europe</option>
                <option value="North America">Amérique du Nord</option>
                <option value="South America">Amérique du Sud</option>
                <option value="Asia">Asie</option>
                <option value="Africa">Afrique</option>
                <option value="Oceania">Océanie</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de départ</label>
              <input 
                required
                type="date" 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.startDate}
                onChange={e => setFormData({...formData, startDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de retour</label>
              <input 
                required
                type="date" 
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.endDate}
                min={formData.startDate}
                onChange={e => setFormData({...formData, endDate: e.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Motif du déplacement</label>
              <textarea 
                required
                rows={3}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="Décrivez brièvement le but de ce voyage..."
                value={formData.reason}
                onChange={e => setFormData({...formData, reason: e.target.value})}
              ></textarea>
            </div>
          </div>
        </section>

        {/* Section 2: Logistique */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plane size={20} className="text-blue-500" />
            Logistique
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mode de transport</label>
              <div className="flex gap-4">
                {['plane', 'train', 'car'].map((mode) => (
                  <label key={mode} className={`flex-1 flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${formData.transportMode === mode ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                    <input type="radio" name="transport" value={mode} className="sr-only" checked={formData.transportMode === mode} onChange={() => setFormData({...formData, transportMode: mode as any})} />
                    {mode === 'plane' && <Plane size={24} className="mb-2" />}
                    {mode === 'train' && <Train size={24} className="mb-2" />}
                    {mode === 'car' && <Car size={24} className="mb-2" />}
                    <span className="text-sm font-medium capitalize">{mode === 'plane' ? 'Avion' : mode === 'train' ? 'Train' : 'Voiture'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hébergement</label>
              <div className="flex gap-4">
                {['hotel', 'airbnb', 'other'].map((type) => (
                  <label key={type} className={`flex-1 flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${formData.accommodationType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'}`}>
                    <input type="radio" name="accommodation" value={type} className="sr-only" checked={formData.accommodationType === type} onChange={() => setFormData({...formData, accommodationType: type as any})} />
                    {type === 'hotel' && <Hotel size={24} className="mb-2" />}
                    {type === 'airbnb' && <Home size={24} className="mb-2" />}
                    {type === 'other' && <MapPin size={24} className="mb-2" />}
                    <span className="text-sm font-medium capitalize">{type === 'other' ? 'Autre' : type}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Estimation des Coûts */}
        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-blue-500" />
            Estimation des Coûts
          </h3>
          
          {alerts.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800">Alerte Politique Voyage</h4>
                  <ul className="mt-1 space-y-1">
                    {alerts.map((alert, i) => (
                      <li key={i} className="text-sm text-amber-700">• {alert}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transport (€)</label>
              <input 
                type="number" 
                min="0"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.transportCost || ''}
                onChange={e => setFormData({...formData, transportCost: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Hébergement (€) <span className="text-xs text-slate-500 font-normal">({nights} nuits)</span></label>
              <input 
                type="number" 
                min="0"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.accommodationCost || ''}
                onChange={e => setFormData({...formData, accommodationCost: Number(e.target.value)})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Repas (€) <span className="text-xs text-slate-500 font-normal">({days} jours)</span></label>
              <input 
                type="number" 
                min="0"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={formData.mealsCost || ''}
                onChange={e => setFormData({...formData, mealsCost: Number(e.target.value)})}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
            <span className="text-slate-600 font-medium">Coût Total Estimé</span>
            <span className="text-2xl font-bold text-slate-800">{totalCost} €</span>
          </div>
          
          {/* Workflow Routing Info */}
          <div className="mt-4 text-sm text-slate-500 bg-blue-50/50 p-3 rounded-md border border-blue-100">
            <strong>Circuit de validation prévu :</strong> 
            <span className="ml-2">
              N+1 (Systématique)
              {(totalCost > 2000 || formData.continent !== 'Europe') && ' → N+2 (>2000€ ou Hors Continent)'}
              {(totalCost > 5000 || formData.continent === 'Asia' || formData.continent === 'Oceania') && ' → N+3 / Direction (>5000€ ou Lointain)'}
            </span>
          </div>
        </section>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button 
            type="submit"
            disabled={!formData.destination || !formData.startDate || !formData.endDate || !formData.reason}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plane size={18} />
            Soumettre la demande
          </button>
        </div>
      </form>
    </div>
  );
}
