FROM python:3.11-slim

# playwright --with-deps installs chromium + all system libs it needs
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install chromium and its OS dependencies in one step
RUN playwright install --with-deps chromium

COPY . .

CMD ["python", "run_all.py"]
