import React, {useEffect, useMemo, useState} from 'react';
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
import {TravelAssistantDraft} from '../types';
import {Bot, CheckCircle2, RotateCcw, SendHorizonal, Sparkles, User} from 'lucide-react';

type ChatRole = 'assistant' | 'user';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

type StepType = 'text' | 'date' | 'number' | 'choice';

interface StepDefinition {
  key: keyof TravelAssistantDraft;
  label: string;
  question: string;
  type: StepType;
  placeholder?: string;
  options?: Array<{label: string; value: string}>;
}

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    key: 'destination',
    label: 'Destination',
    question: 'Commencons. Quelle est la destination du voyage ?',
    type: 'text',
    placeholder: 'Ex: Londres',
  },
  {
    key: 'continent',
    label: 'Continent',
    question: 'Dans quel continent se situe cette destination ?',
    type: 'choice',
    options: CONTINENT_OPTIONS.map(continent => ({label: continent, value: continent})),
  },
  {
    key: 'startDate',
    label: 'Date de depart',
    question: 'Quelle est la date de depart ?',
    type: 'date',
  },
  {
    key: 'endDate',
    label: 'Date de retour',
    question: 'Quelle est la date de retour ?',
    type: 'date',
  },
  {
    key: 'reason',
    label: 'Motif',
    question: 'Quel est le motif du deplacement ?',
    type: 'text',
    placeholder: 'Ex: Rendez-vous client',
  },
  {
    key: 'transportMode',
    label: 'Transport',
    question: 'Quel mode de transport est prevu ?',
    type: 'choice',
    options: TRANSPORT_OPTIONS.map(option => ({label: option.label, value: option.value})),
  },
  {
    key: 'accommodationType',
    label: 'Hebergement',
    question: 'Quel type d hebergement est prevu ?',
    type: 'choice',
    options: ACCOMMODATION_OPTIONS.map(option => ({label: option.label, value: option.value})),
  },
  {
    key: 'transportCost',
    label: 'Cout transport',
    question: 'Quel est le cout estime du transport en EUR ?',
    type: 'number',
    placeholder: '0',
  },
  {
    key: 'accommodationCost',
    label: 'Cout hebergement',
    question: 'Quel est le cout estime de l hebergement en EUR ?',
    type: 'number',
    placeholder: '0',
  },
  {
    key: 'mealsCost',
    label: 'Cout repas',
    question: 'Quel est le budget repas estime en EUR ?',
    type: 'number',
    placeholder: '0',
  },
];

function getInitialMessages() {
  return [
    {
      id: 'intro',
      role: 'assistant' as const,
      content:
        'Je vais vous guider pas a pas pour preparer une demande de voyage complete, de l initialisation a la soumission finale.',
    },
    {
      id: 'step-0',
      role: 'assistant' as const,
      content: STEP_DEFINITIONS[0].question,
    },
  ];
}

function humanizeAnswer(step: StepDefinition, value: string) {
  if (step.type === 'choice') {
    return step.options?.find(option => option.value === value)?.label ?? value;
  }
  return value;
}

export default function TravelAssistantChat() {
  const {currentUser, policy, workflowConfig, addTrip} = useAppContext();
  const [draft, setDraft] = useState<TravelAssistantDraft>(createEmptyTravelDraft());
  const [messages, setMessages] = useState<ChatMessage[]>(getInitialMessages);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const currentStep = STEP_DEFINITIONS[currentStepIndex];
  const alerts = useMemo(() => buildPolicyAlerts(draft, policy), [draft, policy]);
  const totalCost = getDraftTotalCost(draft);
  const {days, nights} = getTripDuration(draft.startDate, draft.endDate);
  const isComplete = currentStepIndex >= STEP_DEFINITIONS.length;

  useEffect(() => {
    if (!currentStep || currentStep.type === 'choice') {
      setInputValue('');
      return;
    }

    const existingValue = draft[currentStep.key];
    setInputValue(existingValue ? String(existingValue) : '');
  }, [currentStep, draft]);

  if (!currentUser) {
    return null;
  }

  const resetConversation = () => {
    setDraft(createEmptyTravelDraft());
    setMessages(getInitialMessages());
    setCurrentStepIndex(0);
    setInputValue('');
    setError('');
    setSubmitted(false);
  };

  const validateAnswer = (step: StepDefinition, rawValue: string) => {
    const trimmedValue = rawValue.trim();

    if (step.type === 'text') {
      if (!trimmedValue) {
        return {errorMessage: `Merci de renseigner ${step.label.toLowerCase()}.`};
      }
      return {value: trimmedValue};
    }

    if (step.type === 'date') {
      if (!trimmedValue) {
        return {errorMessage: `Merci de choisir ${step.label.toLowerCase()}.`};
      }
      const parsedDate = new Date(trimmedValue);
      if (Number.isNaN(parsedDate.getTime())) {
        return {errorMessage: 'Le format de date est invalide.'};
      }
      if (step.key === 'endDate' && draft.startDate && trimmedValue < draft.startDate) {
        return {errorMessage: 'La date de retour doit etre posterieure a la date de depart.'};
      }
      return {value: trimmedValue};
    }

    if (step.type === 'number') {
      const numericValue = Number(trimmedValue);
      if (!trimmedValue || Number.isNaN(numericValue) || numericValue < 0) {
        return {errorMessage: 'Merci de saisir un montant positif.'};
      }
      return {value: numericValue};
    }

    if (step.type === 'choice') {
      const resolvedOption = step.options?.find(
        option =>
          option.value.toLowerCase() === trimmedValue.toLowerCase() ||
          option.label.toLowerCase() === trimmedValue.toLowerCase(),
      );

      if (!resolvedOption) {
        return {errorMessage: 'Merci de choisir une option proposee.'};
      }

      return {value: resolvedOption.value};
    }

    return {errorMessage: 'Reponse invalide.'};
  };

  const applyAnswer = (rawValue: string) => {
    if (!currentStep) {
      return;
    }

    const result = validateAnswer(currentStep, rawValue);

    if (!('value' in result)) {
      setError(result.errorMessage);
      return;
    }

    setError('');
    setDraft(prevDraft => ({
      ...prevDraft,
      [currentStep.key]: result.value,
    }));

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: humanizeAnswer(currentStep, String(result.value)),
    };

    const nextStepIndex = currentStepIndex + 1;
    const nextStep = STEP_DEFINITIONS[nextStepIndex];

    if (nextStep) {
      setMessages(prevMessages => [
        ...prevMessages,
        userMessage,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: nextStep.question,
        },
      ]);
      setCurrentStepIndex(nextStepIndex);
      setInputValue('');
      return;
    }

    setMessages(prevMessages => [
      ...prevMessages,
      userMessage,
      {
        id: `assistant-final-${Date.now()}`,
        role: 'assistant',
        content:
          'Parfait, j ai toutes les informations necessaires. Verifiez le recapitulatif ci-dessous puis finalisez la demande.',
      },
    ]);
    setCurrentStepIndex(STEP_DEFINITIONS.length);
  };

  const submitCurrentInput = () => {
    applyAnswer(inputValue);
  };

  const submitTrip = async () => {
    const success = await addTrip(createTripRequestFromDraft(currentUser, draft, policy));
    if (!success) {
      return;
    }
    setSubmitted(true);
    setMessages(prevMessages => [
      ...prevMessages,
      {
        id: `assistant-success-${Date.now()}`,
        role: 'assistant',
        content: 'La demande a ete creee et envoyee dans le circuit de validation.',
      },
    ]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Assistant guide</h2>
            <p className="text-sm text-slate-500 mt-1">
              Conversation structuree pour preparer la demande de voyage complete.
            </p>
          </div>
          <button
            onClick={resetConversation}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg"
          >
            <RotateCcw size={16} />
            Recommencer
          </button>
        </div>

        <div className="p-4 md:p-6 space-y-4 max-h-[640px] overflow-y-auto bg-slate-50/60">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  message.role === 'assistant'
                    ? 'bg-white border border-slate-200 text-slate-700'
                    : 'bg-blue-600 text-white'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold mb-2 opacity-80">
                  {message.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                  {message.role === 'assistant' ? 'Assistant' : 'Vous'}
                </div>
                <p className="text-sm leading-6 whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
        </div>

        {!isComplete && (
          <div className="p-4 md:p-6 border-t border-slate-200 space-y-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-400">
              <span>Etape {currentStepIndex + 1}</span>
              <span>{STEP_DEFINITIONS.length} questions</span>
            </div>

            {currentStep.type === 'choice' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentStep.options?.map(option => (
                  <button
                    key={option.value}
                    onClick={() => applyAnswer(option.value)}
                    className="text-left p-3 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="font-medium text-slate-800">{option.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type={currentStep.type === 'date' ? 'date' : currentStep.type === 'number' ? 'number' : 'text'}
                  value={inputValue}
                  min={currentStep.type === 'number' ? '0' : undefined}
                  placeholder={currentStep.placeholder}
                  onChange={event => setInputValue(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      submitCurrentInput();
                    }
                  }}
                  className="flex-1 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={submitCurrentInput}
                  className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-medium"
                >
                  <SendHorizonal size={16} />
                  Envoyer
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">Recapitulatif</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Destination</span>
              <span className="font-medium text-slate-800">{draft.destination || '-'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Continent</span>
              <span className="font-medium text-slate-800">{draft.continent}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Dates</span>
              <span className="font-medium text-slate-800">
                {draft.startDate || '-'} / {draft.endDate || '-'}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Transport</span>
              <span className="font-medium text-slate-800">
                {TRANSPORT_OPTIONS.find(option => option.value === draft.transportMode)?.label}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Hebergement</span>
              <span className="font-medium text-slate-800">
                {ACCOMMODATION_OPTIONS.find(option => option.value === draft.accommodationType)?.label}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Duree</span>
              <span className="font-medium text-slate-800">
                {days} jour(s) / {nights} nuit(s)
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex justify-between gap-4">
              <span className="text-slate-500">Cout total</span>
              <span className="font-semibold text-slate-800">{totalCost} EUR</span>
            </div>
            <div className="pt-3 border-t border-slate-200">
              <p className="text-slate-500 mb-2">Circuit de validation</p>
              <p className="font-medium text-slate-800">
                {getApprovalRouteLabel(totalCost, draft.continent, workflowConfig)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 mb-3">Controle politique voyage</h3>
          {alerts.length === 0 ? (
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              Aucun depassement detecte pour le moment.
            </p>
          ) : (
            <div className="space-y-2">
              {alerts.map(alert => (
                <div
                  key={alert}
                  className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3"
                >
                  {alert}
                </div>
              ))}
            </div>
          )}
        </div>

        {isComplete && (
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-800">Finalisation</h3>
            <p className="text-sm text-slate-500">
              Une fois verifie, vous pouvez soumettre directement la demande.
            </p>
            <button
              onClick={() => void submitTrip()}
              disabled={submitted}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-3 rounded-xl font-medium"
            >
              <CheckCircle2 size={18} />
              {submitted ? 'Demande envoyee' : 'Finaliser et soumettre'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
