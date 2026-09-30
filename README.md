# Emergency Resource & Medicine Allocation Console

A production-grade, hardened clinical logistics command center engineered to monitor ventilator saturation, clinician ratios, and critical care medicine stock availability across regional health zones. Features automated cross-schema regulatory verification powered by the Google Gemini API with a resilient model fallback ladder.

---

## Architecture Overview

```
Client (React 18 + Vite + Tailwind CSS + motion)
   │  (1) Live telemetry monitoring (Ventilators, Staff, Medicine Stocks)
   │  (2) Real-time interactive triage & inventory draw/restock simulation
   │  (3) Triggers Cross-Schema Regulatory & Pharma Compliance Audit
   ▼
Backend (Node.js Express on Cloud Run)
   │  (4) Top-level request deserialization & defensive schema parsing
   │  (5) Resilient Gemini Model Fallback Ladder (gemini-3.6-flash -> 3.1-flash-lite -> flash-latest -> 3.7-flash)
   │  (6) Cross-Schema Verification (FDA/WHO guidelines, DEA Schedule IV exemptions, 2°C-8°C cold-chain integrity)
   ▼
Cloud Firestore & Secret Manager (Production Zero-Trust Security Boundary)
```

---

## Security Architecture & Threat Model

| Threat Zone | Identified Scenario Risk | Countermeasure Implemented |
|---|---|---|
| **Input Surfaces** | Malicious or malformed payload injection during cross-schema audit requests. | Defensive payload ingestion with type checking, null-safe destructuring, and 2MB request body parsing caps. |
| **Planning & Reasoning** | Prompt injection attempting to bypass regulatory safety checks or transfer illegal quantities. | Server-side encapsulated system instructions enforcing authoritative clinical-regulatory schemas with explicit JSON typing. |
| **Tool / Model Execution** | Gemini API rate limiting (`429`), server unavailability (`503`), or quota starvation. | Resilient 4-tier model fallback ladder with automated HTTP status code trapping and guaranteed fallback reporting. |
| **Memory & State** | Cross-tenant data leakage or unauthorized manipulation of regional medical inventory. | Tenant isolation schema (`/users/{userId}/interactions/{interactionId}`) with owner-bound Firestore security rules asserting `request.auth.uid == userId`. |
| **Inter-System Communication** | Leakage of Gemini API credentials in client browser bundles or network headers. | Zero-Hardcoding policy: All Gemini requests are proxied via server-side endpoints; secrets are injected strictly via Google Cloud Secret Manager or environment variables. |

---

## 1. Prerequisites & GCP Setup

Enable the required Google Cloud services:

```bash
# Set your project ID
export PROJECT_ID="YOUR_PROJECT_ID"
export REGION="asia-southeast1"

gcloud config set project $PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  artifactregistry.googleapis.com
```

---

## 2. Secret Management via Secret Manager

Store the Gemini API Key securely in Google Cloud Secret Manager:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_ID}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Cloud Firestore Rules)

Deploy the owner-isolated security rules to Firestore:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Deny all unmatched root collections by default
    match /{document=**} {
      allow read, write: if false;
    }

    // Tenant-isolated interaction and reallocation logs
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Clinical audit logs & telemetry
    match /users/{userId}/journals/{journalId} {
      allow read, write, delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## 4. Cloud Run Deployment Flow

Build and deploy the application container to Cloud Run:

```bash
# Build and deploy service
gcloud run deploy emergency-reallocation-console \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"

# Apply mandatory campaign verification label
gcloud run services update emergency-reallocation-console \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=$REGION
```

---

## Functional Test Walkthroughs

### Walkthrough 1: Telemetry & Facility Monitoring
1. **View Health Zones**: Observe the 4 regional health zones on the dashboard.
2. **Observe Critical Alerts**: Notice `CN-HEALTH-ZONE-3` highlighted with the **CRITICAL OVERLOAD** badge (Ventilators: 94%, Sedatives: Critical Shortage).
3. **Simulate Dynamic Triage**: Click the `+` or `-` buttons under "Simulate ventilator patient triage" on any facility card. Verify that:
   - Utilization percentages re-calculate in real time.
   - Status badge transitions dynamically between `OPTIMAL`, `MODERATE LOAD`, and `CRITICAL OVERLOAD`.
   - An event log is recorded in the System Console Logs panel with timestamp and metric values.

### Walkthrough 2: Medicine Stock Availability Matrix
1. **Switch Telemetry Tabs**: In the main column header, click **"Medicine Stock Availability"**.
2. **Filter by Facility**: Choose `CN-HEALTH-ZONE-3` in the facility selector dropdown to inspect its specific depleted stocks.
3. **Filter by Class**: Select `Sedatives & Hypnotics (Propofol)` or `Neuromuscular Blockers (Rocuronium)`.
4. **Search Functionality**: Type "Cold-Chain" or "Propofol" into the search bar to filter real-time drug items.
5. **Interactive Stock Intake/Draw**: Click `+` or `-` on any medication card to simulate clinical dispensing or pharmacy restock (+/- 5 units). Observe dynamic threshold status recalculation and real-time logging.

### Walkthrough 3: Cross-Schema Verification Engine
1. **Initiate Compliance Audit**: Click the **"VERIFY SCHEMAS & REGULATIONS"** button in the Verification Engine panel.
2. **Observe Progressive Audit**: Watch the multi-step audit animation checking:
   - Regional emergency declaration thresholds.
   - DEA Schedule IV sedative exemptions and drug-to-ventilator ratios.
   - Cold-chain transport integrity (2°C - 8°C).
   - Schema field mapping between hospital electronic registries.
3. **Inspect Certification Report**: Confirm safety rating badge (`[A]`), compliance rules matrix with `PASSED` status, and the authorized mobilization package including ventilators, staff, and medicine units.

### Walkthrough 4: End-to-End Reallocation Dispatch Simulation
1. **Configure Transfer Quantities**: In the Reallocation Tool panel, adjust the sliders for ventilators (1-18) and respiratory therapists (0-12), and verify/edit the medicine transfer bundle units.
2. **Launch Dispatch**: Click **"INITIATE EMERGENCY REALLOCATION DISPATCH"**.
3. **Track Transit**: Follow the multi-step progress bar visualizing sterilization, cold-chain verification, helipad transit, and schema synchronization.
4. **Confirm Resolution**: Upon arrival (100%):
   - `CN-HEALTH-ZONE-3` ventilator utilization decreases from 94% to normal capacity.
   - Transferred medicine units (Propofol, Rocuronium, RSI Kits) replenish `CN-HEALTH-ZONE-3`, clearing its critical shortages.
   - Source zone `CN-HEALTH-ZONE-4` inventories update accordingly.
   - Completion log is committed to the console with success status.
