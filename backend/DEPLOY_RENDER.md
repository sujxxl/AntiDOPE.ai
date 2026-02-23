# Deploy AntiDOPE API on Render

This guide deploys your FastAPI backend (`api.py`) to Render.

## 1) Files you must have in repo root

- `api.py`
- `analyze_pipeline.py`
- `reg_model.pkl`
- `iso_model.pkl`
- `scaler.pkl`
- `requirements.txt`
- `render.yaml`
- `runtime.txt`

## 2) Verify locally first

```bash
pip install -r requirements.txt
python api.py
```

Open:
- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

Test analyze endpoint:

```bash
curl -X POST "http://127.0.0.1:8000/analyze" -F "file=@sample_master_input.csv"
```

## 3) Push to GitHub

From project folder:

```bash
git init
git add .
git commit -m "Render-ready AntiDOPE API"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## 4) Deploy on Render (Blueprint way - recommended)

1. Go to Render Dashboard
2. Click **New +** -> **Blueprint**
3. Connect your GitHub repo
4. Render detects `render.yaml`
5. Click **Apply** / **Deploy**

Render will use:
- Build command: `pip install --upgrade pip && pip install -r requirements.txt`
- Start command: `uvicorn api:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

## 5) Environment variables (Render)

Set in Render service settings:

- `APP_CORS_ORIGINS` = `*` (for testing)
  - For production frontend, set exact origins, comma-separated:
  - Example: `https://your-frontend.vercel.app,https://yourdomain.com`

Optional:
- `PYTHON_VERSION` already configured in `render.yaml` and `runtime.txt`.

## 6) Backend API contract for frontend

Endpoint:
- `POST /analyze`

Request:
- `multipart/form-data`
- field name must be `file`
- file must be CSV

Required CSV columns:
- `athlete_id`
- `timestamp`  (per-second or parseable time)
- `heart_rate`
- `recovery_heart_rate`
- `time_post_exertion`
- and either:
  - `acceleration`
  - OR all three: `acc_x`, `acc_y`, `acc_z`

Health endpoint:
- `GET /health`

Docs:
- `GET /docs`

## 7) Frontend fetch example

```javascript
const form = new FormData();
form.append("file", csvFile);

const res = await fetch("https://<your-render-url>/analyze", {
  method: "POST",
  body: form,
});

if (!res.ok) {
  const err = await res.json();
  throw new Error(err.detail || "API request failed");
}

const data = await res.json();
console.log(data);
```

## 8) Common issues and fixes

### A) `Models are not loaded`
- Ensure `.pkl` files are committed and in same folder as `api.py`.

### B) Build fails with sklearn mismatch
- Keep `scikit-learn` version aligned with model training version.
- `requirements.txt` pins version for consistency.

### C) CORS blocked in browser
- Set `APP_CORS_ORIGINS` to your frontend URL(s), not `*` in production.

### D) `Missing required columns`
- Confirm exact CSV header names.

## 9) Post-deploy smoke tests

Run after deploy:

```bash
curl "https://<your-render-url>/health"
curl -X POST "https://<your-render-url>/analyze" -F "file=@sample_master_input.csv"
```

If both pass, backend is production-ready.
