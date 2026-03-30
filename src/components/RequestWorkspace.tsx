import React, {useState} from 'react';
import RequestForm from './RequestForm';
import TravelAssistantChat from './TravelAssistantChat';
import {Bot, FileText} from 'lucide-react';

type RequestMode = 'chat' | 'form';

export default function RequestWorkspace() {
  const [mode, setMode] = useState<RequestMode>('chat');

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Nouvelle demande de voyage</h1>
            <p className="text-slate-500 mt-1">
              Choisissez le mode de saisie le plus adapte a votre besoin.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setMode('chat')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'chat'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Bot size={16} />
              Assistant guide
            </button>
            <button
              onClick={() => setMode('form')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'form'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FileText size={16} />
              Formulaire
            </button>
          </div>
        </div>
      </div>

      {mode === 'chat' ? <TravelAssistantChat /> : <RequestForm />}
    </div>
  );
}
