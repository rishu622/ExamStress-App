# AI-Powered Voice Stress Analysis Platform Architecture

This document defines the target architecture for the voice stress analysis platform and maps it to the current ExamStress-App codebase.

## 1. Target System Overview

The platform receives a user voice note, transcribes the audio, analyzes acoustic and semantic stress signals in parallel, fuses the results into a single stress-risk assessment, and returns personalized recommendations and trend insights.

## 2. High-Level Architecture Diagram

```mermaid
flowchart LR
  subgraph User[User Layer]
    Mobile[Mobile App\nFlutter]
    Web[Web App\nReact]
  end

  subgraph API[API Gateway Layer]
    Gateway[FastAPI Backend\nAuth, Validation, Uploads]
  end

  subgraph Audio[Audio Processing Layer]
    Clean[Audio Cleaning\nNoise Reduction]
    Features[Feature Extraction]
    Spectrogram[Spectrogram Generation]
  end

  subgraph STT[Speech-to-Text Layer]
    Whisper[Whisper Model\nTranscription]
  end

  subgraph Analysis[Parallel Analysis Layer]
    Acoustic[Acoustic Stress Analysis\nWav2Vec2 / HuBERT]
    Semantic[Semantic Stress Analysis\nGPT / Claude / Gemini]
  end

  subgraph Fusion[Stress Fusion Engine]
    Fuse[Weighted Scoring\nStress Score + Confidence + Risk Category]
  end

  subgraph Reco[Recommendation Engine]
    Rec[Rules + LLM Recommendations]
  end

  subgraph Data[Data Storage Layer]
    Blob[Encrypted Audio Storage]
    DB[(MongoDB / PostgreSQL)]
  end

  subgraph Dash[Analytics Dashboard]
    Report[Stress Trends\nHistory\nMonitoring]
  end

  Mobile --> Gateway
  Web --> Gateway
  Gateway --> Clean
  Clean --> Features
  Clean --> Spectrogram
  Clean --> Whisper
  Whisper --> Acoustic
  Whisper --> Semantic
  Acoustic --> Fuse
  Semantic --> Fuse
  Fuse --> Rec
  Rec --> Report

  Gateway --> Blob
  Gateway --> DB
  Whisper --> DB
  Acoustic --> DB
  Semantic --> DB
  Fuse --> DB
  Rec --> DB
  DB --> Report
```

## 3. Data Flow Diagram

```mermaid
flowchart TD
  U[User records or uploads voice note] --> V[API Gateway validates auth, consent, file type]
  V --> S[Store audio metadata and encrypted file reference]
  V --> P[Preprocess audio: normalize, denoise, segment]
  P --> W[Whisper transcription]
  P --> A[Acoustic feature extraction]
  W --> T[Transcript text]
  T --> L[Semantic stress analysis]
  A --> M[Acoustic stress score]
  L --> N[Semantic stress score]
  M --> F[Stress fusion engine]
  N --> F
  F --> R[Overall stress score, confidence, risk category]
  R --> G[Recommendation engine]
  G --> O[Final stress report]
  O --> D[Persist report, history, and trends]
```

## 4. Component Interaction Diagram

```mermaid
flowchart LR
  Client[Flutter / React Client] --> Gateway[FastAPI Gateway]
  Gateway --> Auth[Authentication Service]
  Gateway --> Upload[Upload Management]
  Gateway --> Job[Processing Orchestrator]

  Job --> Pre[Audio Preprocessor]
  Pre --> STT[Whisper STT Service]
  Pre --> Acoustic[Acoustic Model Service]
  STT --> Semantic[LLM Semantic Analyzer]
  Acoustic --> Fusion[Fusion Service]
  Semantic --> Fusion
  Fusion --> Reco[Recommendation Service]

  Gateway --> Store[(Database + Object Storage)]
  STT --> Store
  Acoustic --> Store
  Semantic --> Store
  Fusion --> Store
  Reco --> Store
```

## 5. Deployment Architecture

```mermaid
flowchart TB
  User[Users\nMobile + Web] --> Edge[CDN / WAF]
  Edge --> LB[Load Balancer]
  LB --> Ingress[Kubernetes Ingress]

  subgraph Cluster[Kubernetes Cluster]
    Frontend[Frontend Container]
    API[FastAPI API Service]
    Queue[Job Queue / Worker]
    Preprocess[Preprocessing Service]
    STT[Whisper Inference Service]
    Acoustic[Acoustic Analysis Service]
    Semantic[Semantic LLM Orchestrator]
    Fusion[Fusion + Recommendation Service]
    Obs[Logs, Metrics, Traces]
  end

  subgraph Storage[Storage Layer]
    DB[(PostgreSQL or MongoDB)]
    Audio[(Encrypted Object Storage)]
    Cache[(Redis Cache)]
  end

  Ingress --> Frontend
  Ingress --> API
  API --> Queue
  Queue --> Preprocess
  Preprocess --> STT
  Preprocess --> Acoustic
  STT --> Semantic
  Acoustic --> Fusion
  Semantic --> Fusion
  API --> DB
  API --> Audio
  API --> Cache
  Fusion --> DB
  Cluster --> Obs
```

## 6. Sequence Flow: Voice Upload to Stress Report

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant C as Client App
  participant A as FastAPI Backend
  participant P as Preprocessor
  participant W as Whisper
  participant V as Acoustic Model
  participant L as LLM Analyzer
  participant F as Fusion Engine
  participant R as Recommendation Engine
  participant D as Database
  participant O as Report UI

  U->>C: Record or upload voice note
  C->>A: Send audio + auth token + consent context
  A->>A: Validate request and file
  A->>D: Store metadata and job record
  A->>P: Dispatch processing job
  P->>P: Clean audio, normalize, generate spectrogram
  P->>W: Transcribe audio
  W->>D: Save transcript
  P->>V: Extract acoustic stress features
  V->>D: Save acoustic score and metrics
  W->>L: Send transcript for semantic analysis
  L->>D: Save semantic score and indicators
  V->>F: Acoustic stress score
  L->>F: Semantic stress score
  F->>D: Save fused score, confidence, and risk category
  F->>R: Combined stress context
  R->>D: Save recommendations and explanation
  R->>O: Return final report payload
  O->>U: Show stress level, confidence, summary, and trend chart
```

## 7. Non-Functional Requirements

- Secure cloud deployment with TLS everywhere and encrypted storage at rest.
- Scalable microservice architecture so transcription, acoustic analysis, and LLM analysis can scale independently.
- Real-time or near-real-time processing using an async worker queue.
- End-to-end encryption for transport and stored audio.
- GDPR-compliant retention, deletion, auditability, and consent handling.
- API-driven architecture for mobile, web, and downstream analytics integrations.

## 8. Recommended Technology Stack

- Frontend: Flutter, React
- API Backend: FastAPI
- Transcription: Whisper
- Acoustic Analysis: Wav2Vec2 or HuBERT
- Semantic Analysis: GPT, Claude, or Gemini
- Database: PostgreSQL for relational reporting or MongoDB for document-oriented reports
- Infrastructure: Docker, Kubernetes, AWS / Azure / GCP

## 9. How This Maps to the Current Repo

Current implementation notes in this repository:

- [src/pages/VoiceSensePage.tsx](../src/pages/VoiceSensePage.tsx) currently performs browser-side audio analysis and uses the selected prompt as context. It does not yet call the backend transcription or scoring pipeline.
- [backend/routes/voice.py](../backend/routes/voice.py) already accepts voice uploads and stores derived acoustic features, but it does not yet run transcription or semantic analysis.
- [backend/services/audio_service.py](../backend/services/audio_service.py) contains placeholder acoustic feature extraction and score calculation logic suitable for a demo MVP.

## 10. Implementation Gaps To Close

1. Add a transcription service that receives uploaded audio and returns a transcript.
2. Persist transcript text alongside the audio metadata and analysis record.
3. Add a semantic analysis service that scores transcript content for stress indicators.
4. Add a fusion service to combine acoustic and semantic scores into one report.
5. Replace the current browser-only analysis path in the voice page with API calls to the backend workflow.
6. Add background jobs for long-running processing so upload requests stay responsive.
7. Add trend/report APIs for dashboard views and historical comparisons.

## 11. Suggested Delivery Phases

- Phase 1: Backend transcription and transcript persistence.
- Phase 2: Semantic analysis and fusion scoring.
- Phase 3: Recommendation generation and report APIs.
- Phase 4: Frontend integration for upload, live progress, and report display.
- Phase 5: Hardening for encryption, retention, audit logs, and scaling.
