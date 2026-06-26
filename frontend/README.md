# AIOps Platform Frontend Agent

A modern, production-ready frontend for the AIOps platform built with Next.js 15 (App Router), TypeScript, and TailwindCSS. It integrates directly with the FastAPI backend API gateways.

---

## Technical Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **State & Data Fetching**: TanStack Query (React Query)
- **Networking**: Axios with request/response interceptors for JWT token lifecycle and auto-refresh
- **Styling**: TailwindCSS with HSL color tokens for dark/light theme transitions
- **Charts**: Recharts time-series and resource allocation metrics
- **Icons**: Lucide Icons
- **Simulation**: High-fidelity local RBAC and user directories simulation for offline setups

---

## Getting Started

### Local Development

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## API Configuration

The frontend connects to the backend API endpoint specified by the `NEXT_PUBLIC_API_URL` environment variable. 
You can also dynamically override the connection endpoint in the **Settings** panel of the running dashboard, which persists the endpoint in local storage.

---

## Production Deployment

### Docker Orchestration

Run both the frontend and backend together:
```bash
docker-compose up --build
```

### Kubernetes Manifests

Apply the deployment manifests:
```bash
kubectl apply -f k8s-manifests/
```
