from __future__ import annotations

import json
import threading
from copy import deepcopy
from pathlib import Path
from typing import Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


Role = Literal["employee", "manager", "director", "finance"]
Continent = Literal["Europe", "North America", "South America", "Asia", "Africa", "Oceania"]
TransportMode = Literal["plane", "train", "car"]
AccommodationType = Literal["hotel", "airbnb", "other"]
ApprovalLevel = Literal["n1", "n2"]
TripStatus = Literal[
    "draft",
    "pending_n1",
    "pending_n2",
    "pending_n3",
    "approved",
    "rejected",
    "completed",
]

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_FILE = ROOT_DIR / "DB.json"
LEGACY_STATE_FILE = ROOT_DIR / "backend" / "state.json"


class User(BaseModel):
    id: str
    name: str
    role: Role
    managerId: str | None = None
    department: str
    costCenterId: str
    email: str
    password: str | None = None
    isAdmin: bool | None = False


class EstimatedCosts(BaseModel):
    transport: float = 0
    accommodation: float = 0
    meals: float = 0


class TripRequest(BaseModel):
    id: str
    userId: str
    destination: str
    continent: Continent
    startDate: str
    endDate: str
    reason: str
    transportMode: TransportMode
    accommodationType: AccommodationType
    estimatedCosts: EstimatedCosts
    totalEstimatedCost: float
    status: TripStatus
    createdAt: str
    costCenterId: str
    policyAlerts: list[str] = Field(default_factory=list)


class CostCenter(BaseModel):
    id: str
    name: str
    initialBudget: float
    engagedBudget: float
    actualBudget: float


class TravelPolicy(BaseModel):
    maxHotelPerNight: dict[str, float]
    maxMealPerDay: float
    budgetAlertThreshold: float


class ApprovalWorkflowConfig(BaseModel):
    level2AmountThreshold: float
    level3AmountThreshold: float
    requireLevel2ForNonEurope: bool
    level3Continents: list[Continent]


class LocalLlmConfig(BaseModel):
    baseUrl: str
    apiKey: str = ""
    selectedModel: str = ""
    systemPrompt: str = ""


class TravelRequestProfile(BaseModel):
    id: str
    name: str
    description: str = ""
    department: str = ""
    costCenterId: str
    defaultContinent: Continent
    defaultTransportMode: TransportMode
    defaultAccommodationType: AccommodationType
    maxBudget: float = 0
    notes: str = ""


class ApprovalProfile(BaseModel):
    id: str
    level: ApprovalLevel
    name: str
    description: str = ""
    department: str = ""
    maxApprovalAmount: float = 0
    allowedContinents: list[Continent] = Field(default_factory=list)
    checklist: str = ""


class AppStatePayload(BaseModel):
    users: list[User]
    trips: list[TripRequest]
    costCenters: list[CostCenter]
    policy: TravelPolicy
    workflowConfig: ApprovalWorkflowConfig
    llmConfig: LocalLlmConfig
    requestProfiles: list[TravelRequestProfile] = Field(default_factory=list)
    approvalProfiles: list[ApprovalProfile] = Field(default_factory=list)


class BootstrapResponse(AppStatePayload):
    currentUser: User | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    user: User


class TripStatusUpdate(BaseModel):
    status: TripStatus


class LlmModelsRequest(BaseModel):
    config: LocalLlmConfig


class LlmTestResponse(BaseModel):
    content: str
    model: str


class LlmModelsResponse(BaseModel):
    data: list[dict]


class DataStore:
    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.Lock()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        if not self.path.exists():
            if LEGACY_STATE_FILE.exists():
                self.path.write_text(LEGACY_STATE_FILE.read_text(encoding="utf-8"), encoding="utf-8")
            else:
                self.save_payload(default_payload())

    def load_payload(self) -> AppStatePayload:
        with self.lock:
            raw_payload = json.loads(self.path.read_text(encoding="utf-8"))
        default_data = default_payload().model_dump()
        merged_payload = {
            **default_data,
            **raw_payload,
            "requestProfiles": raw_payload.get("requestProfiles", default_data["requestProfiles"]),
            "approvalProfiles": raw_payload.get("approvalProfiles", default_data["approvalProfiles"]),
        }
        return AppStatePayload.model_validate(merged_payload)

    def save_payload(self, payload: AppStatePayload) -> AppStatePayload:
        with self.lock:
            self.path.write_text(
                payload.model_dump_json(indent=2),
                encoding="utf-8",
            )
        return payload

    def reset(self) -> AppStatePayload:
        return self.save_payload(default_payload())


def counts_against_engaged(status: TripStatus) -> bool:
    return status in {"pending_n1", "pending_n2", "pending_n3", "approved"}


def counts_against_actual(status: TripStatus) -> bool:
    return status == "completed"


def apply_status_change(payload: AppStatePayload, trip: TripRequest, next_status: TripStatus) -> None:
    for cost_center in payload.costCenters:
        if cost_center.id != trip.costCenterId:
            continue

        previous_engaged = counts_against_engaged(trip.status)
        next_engaged = counts_against_engaged(next_status)
        previous_actual = counts_against_actual(trip.status)
        next_actual = counts_against_actual(next_status)

        if previous_engaged and not next_engaged:
            cost_center.engagedBudget = max(0, cost_center.engagedBudget - trip.totalEstimatedCost)
        if not previous_engaged and next_engaged:
            cost_center.engagedBudget += trip.totalEstimatedCost
        if previous_actual and not next_actual:
            cost_center.actualBudget = max(0, cost_center.actualBudget - trip.totalEstimatedCost)
        if not previous_actual and next_actual:
            cost_center.actualBudget += trip.totalEstimatedCost
        break


def default_payload() -> AppStatePayload:
    return AppStatePayload(
        users=[
            User(
                id="u1",
                name="Alice Employee",
                role="employee",
                managerId="m1",
                department="Sales",
                costCenterId="cc1",
                email="alice@company.com",
                password="password123",
            ),
            User(
                id="m1",
                name="Bob Manager",
                role="manager",
                managerId="d1",
                department="Sales",
                costCenterId="cc1",
                email="bob@company.com",
                password="password123",
            ),
            User(
                id="d1",
                name="Charlie Director",
                role="director",
                department="Sales",
                costCenterId="cc1",
                email="charlie@company.com",
                password="password123",
            ),
            User(
                id="f1",
                name="Diana Finance",
                role="finance",
                department="Finance",
                costCenterId="cc2",
                email="diana@company.com",
                password="password123",
            ),
            User(
                id="admin",
                name="Admin System",
                role="finance",
                department="IT",
                costCenterId="cc2",
                email="MM2026",
                password="MM@2026",
                isAdmin=True,
            ),
        ],
        trips=[
            TripRequest(
                id="t1",
                userId="u1",
                destination="London",
                continent="Europe",
                startDate="2026-04-10",
                endDate="2026-04-12",
                reason="Client Meeting",
                transportMode="plane",
                accommodationType="hotel",
                estimatedCosts=EstimatedCosts(transport=300, accommodation=400, meals=150),
                totalEstimatedCost=850,
                status="pending_n1",
                createdAt="2026-03-25",
                costCenterId="cc1",
                policyAlerts=["La nuitee a London depasse le forfait de 180 EUR (estime: 200 EUR/nuit)"],
            ),
            TripRequest(
                id="t2",
                userId="u1",
                destination="New York",
                continent="North America",
                startDate="2026-05-01",
                endDate="2026-05-05",
                reason="Conference",
                transportMode="plane",
                accommodationType="hotel",
                estimatedCosts=EstimatedCosts(transport=1200, accommodation=1000, meals=300),
                totalEstimatedCost=2500,
                status="pending_n2",
                createdAt="2026-03-20",
                costCenterId="cc1",
                policyAlerts=[],
            ),
            TripRequest(
                id="t3",
                userId="u1",
                destination="Paris",
                continent="Europe",
                startDate="2026-02-10",
                endDate="2026-02-12",
                reason="Internal Training",
                transportMode="train",
                accommodationType="hotel",
                estimatedCosts=EstimatedCosts(transport=100, accommodation=200, meals=100),
                totalEstimatedCost=400,
                status="completed",
                createdAt="2026-01-15",
                costCenterId="cc1",
                policyAlerts=[],
            ),
        ],
        costCenters=[
            CostCenter(id="cc1", name="Sales Dept", initialBudget=50000, engagedBudget=5000, actualBudget=15000),
            CostCenter(id="cc2", name="Finance Dept", initialBudget=20000, engagedBudget=1000, actualBudget=5000),
        ],
        policy=TravelPolicy(
            maxHotelPerNight={"London": 180, "Paris": 150, "New York": 250, "default": 120},
            maxMealPerDay=60,
            budgetAlertThreshold=80,
        ),
        workflowConfig=ApprovalWorkflowConfig(
            level2AmountThreshold=2000,
            level3AmountThreshold=5000,
            requireLevel2ForNonEurope=True,
            level3Continents=["Asia", "Oceania"],
        ),
        llmConfig=LocalLlmConfig(
            baseUrl="http://127.0.0.1:1234/v1",
            apiKey="",
            selectedModel="",
            systemPrompt="You are a local travel assistant helping complete business trip requests.",
        ),
        requestProfiles=[
            TravelRequestProfile(
                id="rp-sales-europe",
                name="Deplacement commercial Europe",
                description="Profil standard pour les rendez-vous clients en Europe.",
                department="Sales",
                costCenterId="cc1",
                defaultContinent="Europe",
                defaultTransportMode="plane",
                defaultAccommodationType="hotel",
                maxBudget=1800,
                notes="Verifier la reservation au moins 14 jours avant le depart.",
            )
        ],
        approvalProfiles=[
            ApprovalProfile(
                id="ap-n1-sales",
                level="n1",
                name="Validation N+1 Sales",
                description="Controle manager pour les deplacements commerciaux.",
                department="Sales",
                maxApprovalAmount=2000,
                allowedContinents=["Europe", "North America"],
                checklist="Verifier l'objectif, la priorite business et la coherence budgetaire.",
            ),
            ApprovalProfile(
                id="ap-n2-direction",
                level="n2",
                name="Validation N+2 Direction",
                description="Arbitrage direction pour les voyages sensibles ou engages.",
                department="Sales",
                maxApprovalAmount=5000,
                allowedContinents=["Europe", "North America", "Asia", "Oceania"],
                checklist="Confirmer le ROI, les alternatives possibles et le respect du budget annuel.",
            ),
        ],
    )


store = DataStore(DB_FILE)
app = FastAPI(title="TripFlow API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_payload_copy() -> AppStatePayload:
    return AppStatePayload.model_validate(deepcopy(store.load_payload().model_dump()))


@app.get("/api/health")
def healthcheck():
    return {"status": "ok"}


@app.get("/api/bootstrap", response_model=BootstrapResponse)
def bootstrap():
    payload = store.load_payload()
    return BootstrapResponse(**payload.model_dump(), currentUser=None)


@app.post("/api/login", response_model=LoginResponse)
def login(request: LoginRequest):
    payload = store.load_payload()
    user = next(
        (user for user in payload.users if user.email == request.email and user.password == request.password),
        None,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return LoginResponse(user=user)


@app.post("/api/trips", response_model=AppStatePayload)
def create_trip(trip: TripRequest):
    payload = get_payload_copy()
    if any(existing_trip.id == trip.id for existing_trip in payload.trips):
        raise HTTPException(status_code=409, detail="Trip already exists")
    payload.trips.append(trip)
    if counts_against_engaged(trip.status):
        for cost_center in payload.costCenters:
            if cost_center.id == trip.costCenterId:
                cost_center.engagedBudget += trip.totalEstimatedCost
                break
    return store.save_payload(payload)


@app.patch("/api/trips/{trip_id}/status", response_model=AppStatePayload)
def update_trip_status(trip_id: str, body: TripStatusUpdate):
    payload = get_payload_copy()
    trip = next((item for item in payload.trips if item.id == trip_id), None)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status != body.status:
        apply_status_change(payload, trip, body.status)
        trip.status = body.status
    return store.save_payload(payload)


@app.post("/api/users", response_model=AppStatePayload)
def create_user(user: User):
    payload = get_payload_copy()
    if any(existing_user.id == user.id or existing_user.email == user.email for existing_user in payload.users):
        raise HTTPException(status_code=409, detail="User already exists")
    payload.users.append(user)
    return store.save_payload(payload)


@app.put("/api/users/{user_id}", response_model=AppStatePayload)
def replace_user(user_id: str, user: User):
    payload = get_payload_copy()
    updated = False
    for index, existing_user in enumerate(payload.users):
        if existing_user.id == user_id:
            payload.users[index] = user
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return store.save_payload(payload)


@app.delete("/api/users/{user_id}", response_model=AppStatePayload)
def remove_user(user_id: str):
    payload = get_payload_copy()
    original_length = len(payload.users)
    payload.users = [user for user in payload.users if user.id != user_id]
    if len(payload.users) == original_length:
        raise HTTPException(status_code=404, detail="User not found")
    return store.save_payload(payload)


@app.post("/api/cost-centers", response_model=AppStatePayload)
def create_cost_center(cost_center: CostCenter):
    payload = get_payload_copy()
    if any(existing_cost_center.id == cost_center.id for existing_cost_center in payload.costCenters):
        raise HTTPException(status_code=409, detail="Cost center already exists")
    payload.costCenters.append(cost_center)
    return store.save_payload(payload)


@app.put("/api/cost-centers/{cost_center_id}", response_model=AppStatePayload)
def replace_cost_center(cost_center_id: str, cost_center: CostCenter):
    payload = get_payload_copy()
    updated = False
    for index, existing_cost_center in enumerate(payload.costCenters):
        if existing_cost_center.id == cost_center_id:
            payload.costCenters[index] = cost_center
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return store.save_payload(payload)


@app.delete("/api/cost-centers/{cost_center_id}", response_model=AppStatePayload)
def remove_cost_center(cost_center_id: str):
    payload = get_payload_copy()
    if any(user.costCenterId == cost_center_id for user in payload.users):
        raise HTTPException(status_code=409, detail="Cost center still assigned to users")
    if any(trip.costCenterId == cost_center_id for trip in payload.trips):
        raise HTTPException(status_code=409, detail="Cost center still assigned to trips")
    original_length = len(payload.costCenters)
    payload.costCenters = [item for item in payload.costCenters if item.id != cost_center_id]
    if len(payload.costCenters) == original_length:
        raise HTTPException(status_code=404, detail="Cost center not found")
    return store.save_payload(payload)


@app.put("/api/policy", response_model=AppStatePayload)
def replace_policy(policy: TravelPolicy):
    payload = get_payload_copy()
    payload.policy = policy
    return store.save_payload(payload)


@app.put("/api/workflow-config", response_model=AppStatePayload)
def replace_workflow_config(workflow_config: ApprovalWorkflowConfig):
    payload = get_payload_copy()
    payload.workflowConfig = workflow_config
    return store.save_payload(payload)


@app.put("/api/llm-config", response_model=AppStatePayload)
def replace_llm_config(llm_config: LocalLlmConfig):
    payload = get_payload_copy()
    payload.llmConfig = llm_config
    return store.save_payload(payload)


@app.post("/api/request-profiles", response_model=AppStatePayload)
def create_request_profile(profile: TravelRequestProfile):
    payload = get_payload_copy()
    if any(existing_profile.id == profile.id for existing_profile in payload.requestProfiles):
        raise HTTPException(status_code=409, detail="Request profile already exists")
    payload.requestProfiles.append(profile)
    return store.save_payload(payload)


@app.put("/api/request-profiles/{profile_id}", response_model=AppStatePayload)
def replace_request_profile(profile_id: str, profile: TravelRequestProfile):
    payload = get_payload_copy()
    updated = False
    for index, existing_profile in enumerate(payload.requestProfiles):
        if existing_profile.id == profile_id:
            payload.requestProfiles[index] = profile
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Request profile not found")
    return store.save_payload(payload)


@app.delete("/api/request-profiles/{profile_id}", response_model=AppStatePayload)
def delete_request_profile(profile_id: str):
    payload = get_payload_copy()
    original_length = len(payload.requestProfiles)
    payload.requestProfiles = [profile for profile in payload.requestProfiles if profile.id != profile_id]
    if len(payload.requestProfiles) == original_length:
        raise HTTPException(status_code=404, detail="Request profile not found")
    return store.save_payload(payload)


@app.post("/api/approval-profiles", response_model=AppStatePayload)
def create_approval_profile(profile: ApprovalProfile):
    payload = get_payload_copy()
    if any(existing_profile.id == profile.id for existing_profile in payload.approvalProfiles):
        raise HTTPException(status_code=409, detail="Approval profile already exists")
    payload.approvalProfiles.append(profile)
    return store.save_payload(payload)


@app.put("/api/approval-profiles/{profile_id}", response_model=AppStatePayload)
def replace_approval_profile(profile_id: str, profile: ApprovalProfile):
    payload = get_payload_copy()
    updated = False
    for index, existing_profile in enumerate(payload.approvalProfiles):
        if existing_profile.id == profile_id:
            payload.approvalProfiles[index] = profile
            updated = True
            break
    if not updated:
        raise HTTPException(status_code=404, detail="Approval profile not found")
    return store.save_payload(payload)


@app.delete("/api/approval-profiles/{profile_id}", response_model=AppStatePayload)
def delete_approval_profile(profile_id: str):
    payload = get_payload_copy()
    original_length = len(payload.approvalProfiles)
    payload.approvalProfiles = [profile for profile in payload.approvalProfiles if profile.id != profile_id]
    if len(payload.approvalProfiles) == original_length:
        raise HTTPException(status_code=404, detail="Approval profile not found")
    return store.save_payload(payload)


@app.post("/api/admin/reset", response_model=AppStatePayload)
def reset_demo_data():
    return store.reset()


@app.get("/api/admin/export", response_model=AppStatePayload)
def export_database():
    return store.load_payload()


@app.post("/api/admin/import", response_model=AppStatePayload)
def import_database(payload: AppStatePayload):
    return store.save_payload(payload)


async def fetch_llm_models(config: LocalLlmConfig) -> list[dict]:
    async with httpx.AsyncClient(timeout=20.0) as client:
        headers = {}
        if config.apiKey.strip():
            headers["Authorization"] = f"Bearer {config.apiKey.strip()}"
        response = await client.get(f"{config.baseUrl.rstrip('/')}/models", headers=headers)
        response.raise_for_status()
        payload = response.json()
        return payload.get("data", [])


async def run_llm_test(config: LocalLlmConfig) -> tuple[str, str]:
    model = config.selectedModel.strip()
    if not model:
        raise HTTPException(status_code=400, detail="A model must be selected for testing")
    headers = {"Content-Type": "application/json"}
    if config.apiKey.strip():
        headers["Authorization"] = f"Bearer {config.apiKey.strip()}"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{config.baseUrl.rstrip('/')}/chat/completions",
            headers=headers,
            json={
                "model": model,
                "temperature": 0,
                "messages": [
                    {
                        "role": "system",
                        "content": config.systemPrompt or "You are a test assistant.",
                    },
                    {
                        "role": "user",
                        "content": "Reply in one short French sentence confirming the connection.",
                    },
                ],
            },
        )
        response.raise_for_status()
        payload = response.json()
        content = (
            payload.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
            .strip()
        )
        return content or "Test reussi, mais aucune reponse lisible n a ete retournee.", model


@app.post("/api/llm/models", response_model=LlmModelsResponse)
async def llm_models(body: LlmModelsRequest):
    try:
        data = await fetch_llm_models(body.config)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return LlmModelsResponse(data=data)


@app.post("/api/llm/test", response_model=LlmTestResponse)
async def llm_test(body: LlmModelsRequest):
    try:
        content, model = await run_llm_test(body.config)
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error
    return LlmTestResponse(content=content, model=model)
