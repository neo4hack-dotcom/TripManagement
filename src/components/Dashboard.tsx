import React from 'react';
import { useAppContext } from '../context/AppContext';
import { Check, X, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import { TripRequest } from '../types';

export default function Dashboard() {
  const { currentUser, trips, users, updateTripStatus, costCenters } = useAppContext();

  if (!currentUser) return null;

  // Filter trips based on role
  const myTrips = trips.filter(t => t.userId === currentUser.id);
  
  // For managers, show trips they need to approve
  const pendingApprovals = trips.filter(t => {
    if (currentUser.role === 'employee') return false;
    
    // N+1 sees pending_n1
    if (currentUser.role === 'manager' && t.status === 'pending_n1') return true;
    
    // N+2 sees pending_n2
    if (currentUser.role === 'director' && t.status === 'pending_n2') return true;
    
    // Finance/Global sees pending_n3
    if (currentUser.role === 'finance' && t.status === 'pending_n3') return true;
    
    return false;
  });

  const getStatusBadge = (status: TripRequest['status']) => {
    switch (status) {
      case 'approved': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Approuvé</span>;
      case 'rejected': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Refusé</span>;
      case 'completed': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">Terminé</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 flex items-center gap-1"><Clock size={12} /> En attente</span>;
    }
  };

  const handleApprove = (trip: TripRequest) => {
    let nextStatus: TripRequest['status'] = 'approved';
    
    // Workflow routing logic
    if (currentUser.role === 'manager') {
      // N+1 is approving. Does it need N+2?
      if (trip.totalEstimatedCost > 2000 || trip.continent !== 'Europe') {
        nextStatus = 'pending_n2';
      }
    } else if (currentUser.role === 'director') {
      // N+2 is approving. Does it need N+3?
      if (trip.totalEstimatedCost > 5000 || trip.continent === 'Asia' || trip.continent === 'Oceania') {
        nextStatus = 'pending_n3';
      }
    }
    
    updateTripStatus(trip.id, nextStatus);
  };

  const handleReject = (tripId: string) => {
    updateTripStatus(tripId, 'rejected');
  };

  const handleComplete = (tripId: string) => {
    updateTripStatus(tripId, 'completed');
  };

  return (
    <div className="space-y-8">
      {/* Approvals Section (Managers only) */}
      {currentUser.role !== 'employee' && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800">Validations en attente</h2>
            <span className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-sm font-semibold">
              {pendingApprovals.length} demande(s)
            </span>
          </div>
          
          {pendingApprovals.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center text-slate-500">
              Aucune demande en attente de validation.
            </div>
          ) : (
            <div className="grid gap-4">
              {pendingApprovals.map(trip => {
                const requester = users.find(u => u.id === trip.userId);
                const costCenter = costCenters.find(cc => cc.id === trip.costCenterId);
                const budgetImpact = costCenter ? ((costCenter.engagedBudget + costCenter.actualBudget + trip.totalEstimatedCost) / costCenter.initialBudget) * 100 : 0;
                
                return (
                  <div key={trip.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-slate-800">{requester?.name}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-600">{trip.destination} ({trip.continent})</span>
                      </div>
                      <div className="text-sm text-slate-500 mb-3">
                        Du {trip.startDate} au {trip.endDate} — {trip.reason}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="font-semibold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">
                          {trip.totalEstimatedCost} €
                        </div>
                        
                        {/* Budget Impact Indicator */}
                        {costCenter && (
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-xs">Impact Budget ({costCenter.name}):</span>
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${budgetImpact > 90 ? 'bg-red-500' : budgetImpact > 75 ? 'bg-amber-500' : 'bg-green-500'}`} 
                                style={{ width: `${Math.min(100, budgetImpact)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs font-medium text-slate-600">{budgetImpact.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>

                      {trip.policyAlerts.length > 0 && (
                        <div className="mt-3 text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 flex items-start gap-2">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                          <span>{trip.policyAlerts[0]} {trip.policyAlerts.length > 1 && `(+${trip.policyAlerts.length - 1} autres)`}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => handleReject(trip.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-red-200"
                        title="Refuser"
                      >
                        <X size={20} />
                      </button>
                      <button 
                        onClick={() => handleApprove(trip)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                      >
                        <Check size={18} />
                        Approuver
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* My History Section */}
      <section>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Mes Voyages</h2>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {myTrips.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Vous n'avez aucun voyage enregistré.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-4 font-medium">Destination</th>
                    <th className="p-4 font-medium">Dates</th>
                    <th className="p-4 font-medium">Motif</th>
                    <th className="p-4 font-medium">Coût Estimé</th>
                    <th className="p-4 font-medium">Statut</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {myTrips.map(trip => (
                    <tr key={trip.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-800">{trip.destination}</td>
                      <td className="p-4 text-slate-600">{trip.startDate} <ArrowRight size={12} className="inline mx-1" /> {trip.endDate}</td>
                      <td className="p-4 text-slate-600 truncate max-w-[200px]">{trip.reason}</td>
                      <td className="p-4 text-slate-800 font-medium">{trip.totalEstimatedCost} €</td>
                      <td className="p-4">{getStatusBadge(trip.status)}</td>
                      <td className="p-4">
                        {trip.status === 'approved' && (
                          <button 
                            onClick={() => handleComplete(trip.id)}
                            className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                          >
                            Marquer terminé
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
