import React, {useEffect, useState} from 'react';
import {useAppContext} from '../context/AppContext';
import {
  ACCOMMODATION_OPTIONS,
  buildPolicyAlerts,
  CONTINENT_OPTIONS,
  createEmptyTravelDraft,
  createTripRequestFromDraft,
  getApprovalRouteLabel,
  getDraftTotalCost,
  getTripDuration,
  TRANSPORT_OPTIONS,
} from '../lib/travel';
import {AlertCircle, CheckCircle2, DollarSign, MapPin, Plane} from 'lucide-react';
import {TravelAssistantDraft} from '../types';

export default function RequestForm() {
  const {currentUser, policy, workflowConfig, addTrip} = useAppContext();

  const [formData, setFormData] = useState<TravelAssistantDraft>(createEmptyTravelDraft());
  const [alerts, setAlerts] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setAlerts(buildPolicyAlerts(formData, policy));
  }, [formData, policy]);

  if (!currentUser) {
    return null;
  }

  const {days, nights} = getTripDuration(formData.startDate, formData.endDate);
  const totalCost = getDraftTotalCost(formData);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const success = await addTrip(createTripRequestFromDraft(currentUser, formData, policy));
    if (!success) {
      return;
    }
    setSubmitted(true);

    window.setTimeout(() => {
      setSubmitted(false);
      setFormData(createEmptyTravelDraft());
    }, 2500);
  };

  if (submitted) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Demande soumise</h2>
        <p className="text-slate-600">Le voyage a ete envoye dans le circuit de validation.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <h2 className="text-xl font-bold text-slate-800">Formulaire structure</h2>
        <p className="text-sm text-slate-500 mt-1">
          Saisissez les informations du voyage et verifiez la politique en direct.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-blue-500" />
            Informations generales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination</label>
              <input
                required
                type="text"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Ex: Londres, Paris, New York"
                value={formData.destination}
                onChange={event => setFormData({...formData, destination: event.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Continent</label>
              <select
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                value={formData.continent}
                onChange={event =>
                  setFormData({...formData, continent: event.target.value as TravelAssistantDraft['continent']})
                }
              >
                {CONTINENT_OPTIONS.map(continent => (
                  <option key={continent} value={continent}>
                    {continent}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de depart</label>
              <input
                required
                type="date"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.startDate}
                onChange={event => setFormData({...formData, startDate: event.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date de retour</label>
              <input
                required
                type="date"
                min={formData.startDate}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.endDate}
                onChange={event => setFormData({...formData, endDate: event.target.value})}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Motif du deplacement</label>
              <textarea
                required
                rows={3}
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Precisez l'objectif du voyage."
                value={formData.reason}
                onChange={event => setFormData({...formData, reason: event.target.value})}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Plane size={20} className="text-blue-500" />
            Logistique
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mode de transport</label>
              <div className="grid grid-cols-3 gap-3">
                {TRANSPORT_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                      formData.transportMode === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="transport"
                      className="sr-only"
                      checked={formData.transportMode === option.value}
                      onChange={() => setFormData({...formData, transportMode: option.value})}
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Hebergement</label>
              <div className="grid grid-cols-3 gap-3">
                {ACCOMMODATION_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={`flex flex-col items-center justify-center p-4 border rounded-xl cursor-pointer transition-all ${
                      formData.accommodationType === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accommodation"
                      className="sr-only"
                      checked={formData.accommodationType === option.value}
                      onChange={() => setFormData({...formData, accommodationType: option.value})}
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-blue-500" />
            Estimation des couts
          </h3>

          {alerts.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h4 className="text-sm font-semibold text-amber-800">Alerte politique voyage</h4>
                  <ul className="mt-1 space-y-1">
                    {alerts.map(alert => (
                      <li key={alert} className="text-sm text-amber-700">
                        • {alert}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transport (EUR)</label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.transportCost || ''}
                onChange={event =>
                  setFormData({...formData, transportCost: Number(event.target.value || 0)})
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Hebergement (EUR) <span className="text-xs text-slate-500">({nights} nuit(s))</span>
              </label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.accommodationCost || ''}
                onChange={event =>
                  setFormData({...formData, accommodationCost: Number(event.target.value || 0)})
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Repas (EUR) <span className="text-xs text-slate-500">({days} jour(s))</span>
              </label>
              <input
                type="number"
                min="0"
                className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.mealsCost || ''}
                onChange={event => setFormData({...formData, mealsCost: Number(event.target.value || 0)})}
              />
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex justify-between items-center">
            <span className="text-slate-600 font-medium">Cout total estime</span>
            <span className="text-2xl font-bold text-slate-800">{totalCost} EUR</span>
          </div>

          <div className="mt-4 text-sm text-slate-600 bg-blue-50 p-3 rounded-md border border-blue-100">
            <strong>Circuit de validation prevu :</strong>{' '}
            {getApprovalRouteLabel(totalCost, formData.continent, workflowConfig)}
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
