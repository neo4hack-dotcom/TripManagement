import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserPlus, Edit2, Trash2, Shield, User as UserIcon, X, Check } from 'lucide-react';
import { User, Role } from '../types';

export default function AdminPanel() {
  const { users, addUser, updateUser, deleteUser, costCenters } = useAppContext();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    password: 'password123',
    role: 'employee',
    department: '',
    costCenterId: costCenters[0]?.id || '',
  });

  const handleSave = () => {
    if (editingId) {
      updateUser({ ...formData, id: editingId } as User);
      setEditingId(null);
    } else {
      const newUser = {
        ...formData,
        id: `u${Date.now()}`,
      } as User;
      addUser(newUser);
      setIsAdding(false);
    }
    setFormData({ name: '', email: '', password: 'password123', role: 'employee', department: '', costCenterId: costCenters[0]?.id || '' });
  };

  const startEdit = (user: User) => {
    setFormData(user);
    setEditingId(user.id);
    setIsAdding(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Gestion des Utilisateurs</h2>
        <button 
          onClick={() => { setIsAdding(true); setEditingId(null); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium"
        >
          <UserPlus size={18} />
          Ajouter un utilisateur
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-blue-200 shadow-sm space-y-4">
          <h3 className="font-bold text-slate-800">{editingId ? 'Modifier' : 'Nouvel'} Utilisateur</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input 
              className="border p-2 rounded-lg text-sm" 
              placeholder="Nom complet" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <input 
              className="border p-2 rounded-lg text-sm" 
              placeholder="Email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
            <input 
              className="border p-2 rounded-lg text-sm" 
              placeholder="Mot de passe" 
              type="password"
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
            <select 
              className="border p-2 rounded-lg text-sm bg-white"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value as Role})}
            >
              <option value="employee">Employé</option>
              <option value="manager">Manager (N+1)</option>
              <option value="director">Directeur (N+2)</option>
              <option value="finance">Finance / Admin</option>
            </select>
            <input 
              className="border p-2 rounded-lg text-sm" 
              placeholder="Département" 
              value={formData.department} 
              onChange={e => setFormData({...formData, department: e.target.value})}
            />
            <select 
              className="border p-2 rounded-lg text-sm bg-white"
              value={formData.costCenterId}
              onChange={e => setFormData({...formData, costCenterId: e.target.value})}
            >
              {costCenters.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 text-sm font-medium">Annuler</button>
            <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center gap-2">
              <Check size={16} /> Enregistrer
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="p-4 font-medium">Utilisateur</th>
              <th className="p-4 font-medium">Rôle</th>
              <th className="p-4 font-medium">Département</th>
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
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'finance' ? 'bg-purple-100 text-purple-700' :
                    user.role === 'director' ? 'bg-blue-100 text-blue-700' :
                    user.role === 'manager' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="p-4 text-slate-600">{user.department}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => startEdit(user)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteUser(user.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
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
  );
}
