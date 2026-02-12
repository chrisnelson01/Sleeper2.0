FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python deps early to leverage cache
COPY backend/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

# Copy only backend source and the run entrypoint to minimize context
COPY backend /app/backend
COPY run.py /app/run.py

EXPOSE 5000
CMD ["sh", "-c", "gunicorn -b 0.0.0.0:${PORT:-5000} backend.app:app"]
