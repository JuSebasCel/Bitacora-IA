# El backend de Menti Vault en un contenedor, con LibreOffice para los PDF.
#
# Pensado para el servidor gratuito de Oracle Cloud (ARM, Ampere A1): la
# imagen base y los paquetes de Debian existen para ARM y para x86, así que
# el mismo archivo sirve en los dos.

FROM python:3.12-slim

# Solo Writer y sin interfaz gráfica: es lo único que usa la conversión de
# .docx a PDF, y la instalación completa de LibreOffice pesa varias veces más.
# Las fuentes son las métricamente compatibles con las de Office (Carlito por
# Calibri, Caladea por Cambria, Liberation por Arial y Times): sin ellas, un
# documento de Word se pagina distinto en el PDF que en Word.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-writer-nogui \
        fonts-liberation \
        fonts-dejavu \
        fonts-crosextra-carlito \
        fonts-crosextra-caladea \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Las dependencias antes que el código: cambiar una línea de Python no
# vuelve a instalar todo.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1 \
    BITACORA_SOFFICE=/usr/bin/soffice

EXPOSE 8000

# Detrás de Caddy (ver despliegue/docker-compose.yml): las cabeceras del
# proxy se aceptan para que las URLs y los registros vean la dirección real.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
