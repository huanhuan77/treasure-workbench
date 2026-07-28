FROM python:3.11-slim

WORKDIR /app

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY watermark-server/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY watermark-server/ .

# Port
ENV PORT=5002
EXPOSE 5002

CMD ["python", "main.py"]
