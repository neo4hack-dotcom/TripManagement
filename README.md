# TripFlow

TripFlow est une application de gestion des deplacements professionnels avec frontend React et backend Python FastAPI.

L'application couvre aujourd'hui:

- l'authentification locale
- la saisie de demandes de voyage par formulaire ou assistant guide
- le controle de politique voyage en temps reel
- le workflow de validation multi-niveaux
- le suivi des voyages et validations
- le pilotage budgetaire
- l'administration complete de la configuration metier
- la connexion a un LLM local compatible OpenAI
- l'export et la reimportation complete de la base JSON

## Architecture

TripFlow est organise en deux couches:

- frontend: React 19 + TypeScript + Vite + Tailwind CSS
- backend: FastAPI + stockage JSON local

Le backend est responsable de:

- l'etat applicatif
- les utilisateurs
- les voyages
- les centres de cout
- la politique voyage
- le workflow de validation
- les profils de demande et d'approbation
- la configuration LLM
- l'import/export complet de la base

Le frontend consomme l'API du backend et ne gere plus la persistance lui-meme.

## Stockage des donnees

La base applicative est stockee dans [DB.json](/Users/mathieumasson/Documents/TripManagement/DB.json).

Ce fichier contient l'ensemble des donnees:

- utilisateurs
- voyages
- centres de cout
- politique voyage
- workflow
- configuration LLM
- profils de demande
- profils N+1 / N+2

Le backend lit et ecrit directement dans ce fichier. L'admin permet aussi d'exporter son contenu et de le reimporter pour resynchroniser integralement l'application.

## Fonctionnalites principales

### Authentification

L'application demarre sur une page de connexion.

- la connexion est verifiee par le backend FastAPI
- la session front conserve simplement l'utilisateur courant
- les comptes de demonstration sont precharges dans `DB.json`

### Creation d'une demande de voyage

Deux modes sont disponibles:

- formulaire structure
- assistant guide en mode conversationnel

Les informations collectées couvrent:

- destination
- continent
- dates
- motif
- transport
- hebergement
- estimation des couts

Le systeme calcule ensuite:

- le nombre de jours et de nuits
- le cout total
- les alertes de conformite
- le circuit de validation prevu

### Politique voyage

La politique voyage gere notamment:

- les plafonds hoteliers par destination
- le plafond repas par jour
- le seuil d'alerte budgetaire

Les alertes sont rattachees a chaque demande et visibles pendant la validation.

### Workflow de validation

Le workflow supporte:

- `pending_n1`
- `pending_n2`
- `pending_n3`
- `approved`
- `rejected`
- `completed`

Les seuils et regles de routage sont configurables depuis l'admin.

### Tableau de bord

Le tableau de bord permet:

- aux validateurs de traiter les demandes en attente
- aux collaborateurs de suivre leurs voyages
- d'afficher l'impact budgetaire d'une demande sur le centre de cout

### Pilotage budgetaire

Les roles `finance` et `director` disposent de:

- KPI budgetaires
- consommation par centre de cout
- saisonnalite
- simulation de reduction budgetaire

### Administration

Le centre d'administration permet de gerer:

- les utilisateurs
- les centres de cout
- la politique voyage
- le workflow
- les profils
- la configuration LLM local
- l'export et l'import complet de la base

L'acces depend du flag `isAdmin`.

## Profils de configuration

L'onglet `Profils` de l'admin permet de creer:

### Profils de demande

Ils servent a definir des templates metier pour les voyages:

- departement
- centre de cout
- continent par defaut
- transport par defaut
- hebergement par defaut
- budget maximal
- notes d'usage

### Profils d'approbation N+1 et N+2

Ils servent a cadrer les validations:

- niveau (`n1` ou `n2`)
- departement
- montant maximal
- continents couverts
- checklist de validation

## LLM local

L'admin permet de configurer un serveur LLM local compatible OpenAI via HTTP.

Configuration disponible:

- `baseUrl`
- `apiKey`
- `selectedModel`
- `systemPrompt`

Fonctions disponibles:

- charger la liste des modeles
- tester la connexion au modele

Le frontend ne parle pas directement au serveur LLM: il passe par le backend FastAPI.

## Export / Import de la base

L'onglet `Base JSON` permet:

- d'exporter toutes les donnees courantes depuis le backend
- de reimporter un snapshot JSON complet

L'import remplace la base actuelle puis recharge l'etat du frontend pour garantir une synchronisation immediate avec `DB.json`.

## Comptes de demonstration

Les comptes suivants sont fournis par defaut:

- `alice@company.com` / `password123` - employe
- `bob@company.com` / `password123` - manager
- `charlie@company.com` / `password123` - directeur
- `diana@company.com` / `password123` - finance
- `MM2026` / `MM@2026` - admin

## Arborescence utile

- [src/App.tsx](/Users/mathieumasson/Documents/TripManagement/src/App.tsx): shell principal
- [src/context/AppContext.tsx](/Users/mathieumasson/Documents/TripManagement/src/context/AppContext.tsx): etat frontend et appels API
- [src/lib/api.ts](/Users/mathieumasson/Documents/TripManagement/src/lib/api.ts): client HTTP frontend
- [src/components/AdminPanel.tsx](/Users/mathieumasson/Documents/TripManagement/src/components/AdminPanel.tsx): centre d'administration
- [src/components/RequestWorkspace.tsx](/Users/mathieumasson/Documents/TripManagement/src/components/RequestWorkspace.tsx): entree de creation des demandes
- [src/components/TravelAssistantChat.tsx](/Users/mathieumasson/Documents/TripManagement/src/components/TravelAssistantChat.tsx): assistant guide
- [src/lib/travel.ts](/Users/mathieumasson/Documents/TripManagement/src/lib/travel.ts): logique metier partagee
- [backend/app.py](/Users/mathieumasson/Documents/TripManagement/backend/app.py): API FastAPI
- [backend/requirements.txt](/Users/mathieumasson/Documents/TripManagement/backend/requirements.txt): dependances Python
- [DB.json](/Users/mathieumasson/Documents/TripManagement/DB.json): base de donnees JSON

## Installation

### Prerequis

- Node.js 18+
- npm
- Python 3.11+ recommande

### Installation frontend

```bash
npm install
```

### Installation backend

```bash
python3 -m pip install -r backend/requirements.txt
```

## Lancement en local

### 1. Lancer l'API FastAPI

```bash
npm run dev:api
```

L'API ecoute sur `http://127.0.0.1:8000`.

### 2. Lancer le frontend

```bash
npm run dev
```

Le frontend ecoute sur `http://127.0.0.1:3000`.

En developpement, Vite proxy automatiquement `/api` vers le backend FastAPI local.

## Verification

### Frontend

```bash
npm run lint
npm run build
```

### Backend

```bash
python3 -m py_compile backend/app.py
```

## Configuration

Le fichier [.env.example](/Users/mathieumasson/Documents/TripManagement/.env.example) contient:

- `APP_URL`
- `VITE_API_BASE_URL`

En local, `VITE_API_BASE_URL` peut rester vide pour utiliser le proxy Vite.

## Etat actuel

TripFlow est maintenant une application locale complete pour prototypage metier avance.

Le produit est coherent pour:

- une demo metier
- un prototype fonctionnel RH / Finance / Travel
- une base de travail avant industrialisation

## Limites actuelles

- la base est un fichier JSON unique, pas une base SQL
- l'authentification reste simple et non securisee pour la production
- il n'y a pas encore de gestion de permissions fine par action
- les profils sont configures dans l'admin mais pas encore appliques automatiquement dans les parcours metier
- le projet n'inclut pas encore de tests automatises backend/frontend

## Evolutions naturelles

- brancher une vraie base de donnees SQL
- ajouter des migrations de schema
- renforcer l'authentification et l'autorisation
- appliquer automatiquement les profils de demande et d'approbation dans les flux
- ajouter des pieces jointes et justificatifs
- historiser les validations
- ajouter des tests unitaires et end-to-end
