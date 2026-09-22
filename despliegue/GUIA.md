# Despliegue de Menti Vault

Tres piezas, las tres en plan gratuito y sin tarjeta:

| Pieza | Dónde | Qué |
|---|---|---|
| Base de datos, sesiones, archivos | Supabase | Ya está en producción. |
| Frontend | Vercel | La app de React, con tu dominio. |
| Backend | **Koyeb** | La API de IA, construida desde `backend/Dockerfile`. |

`tudominio.com` apunta a Vercel. El backend queda en una dirección de Koyeb
(`https://<algo>.koyeb.app`) que solo usa el frontend, así que no necesita
subdominio propio. En toda la guía, cambia `tudominio.com` por el tuyo.

Oracle Cloud (sección 1, más abajo) queda como alternativa con más memoria,
pero pide una tarjeta que acepte su verificación.

---

## 0. El backend en Koyeb (sin tarjeta)

Plan gratuito: 512 MB de RAM, 0,1 CPU, un servicio. Se duerme tras una hora
sin tráfico y despierta en segundos, así que un análisis de una hora de
audio (unos 10 minutos de trabajo) no se corta.

1. Crea la cuenta en <https://www.koyeb.com> entrando con **GitHub**.
2. **Create Service → Web Service → GitHub**, y elige el repositorio
   `Menti-Vault`, rama `dev`.
3. **Builder**: `Dockerfile`, con **Work directory** `backend` (ahí está el
   `Dockerfile`).
4. **Instance**: `Free`. **Region**: Washington, D.C. o Frankfurt (las únicas
   del plan gratuito).
5. **Exposed ports**: `8000`, protocolo HTTP, ruta `/`.
6. **Health check**: HTTP en la ruta `/docs`.
7. **Environment variables** (marca como *Secret* las dos últimas):

   | Variable | Valor |
   |---|---|
   | `BITACORA_ORIGENES_PERMITIDOS` | `https://tudominio.com,https://www.tudominio.com` |
   | `SUPABASE_URL` | La de Supabase (Project Settings → API). |
   | `SUPABASE_ANON_KEY` | La anon key de Supabase. |
   | `BITACORA_SECRETO_DEL_SERVIDOR` | **El mismo** de `backend/.env` en tu computador. |

8. **Deploy**. La primera construcción tarda varios minutos (instala
   LibreOffice). Cuando diga *Healthy*, copia la dirección pública del
   servicio (`https://….koyeb.app`) y comprueba que `…/docs` abre.

Esa dirección es el `VITE_API_URL` del frontend (sección 4).

Cada `git push` a `dev` vuelve a desplegar solo.

**Si algo falla**: la pestaña *Logs* del servicio. Lo que más probablemente
se quede corto con 512 MB es la conversión de una memoria a PDF; si pasa, la
memoria se sigue pudiendo descargar en Word.

---

## 1. Alternativa: el servidor en Oracle Cloud

### 1.1 Crear la cuenta

1. Entra a <https://signup.cloud.oracle.com> y crea una cuenta **Free Tier**.
2. Te pide una tarjeta para verificar identidad: retiene USD 1 y lo devuelve.
   Mientras no pases la cuenta a "Pay As You Go" por tu cuenta, **no cobra**.
3. Elige una **región de inicio** cercana (por ejemplo, `US East (Ashburn)` o
   `Brazil East (São Paulo)`). No se puede cambiar después.

### 1.2 Crear la máquina

En el menú: **Compute → Instances → Create instance**.

- **Image**: Canonical Ubuntu 24.04.
- **Shape**: Ampere → `VM.Standard.A1.Flex`, con **2 OCPU y 12 GB** de memoria
  (es todo el cupo gratuito de ARM).
- **Networking**: deja que cree la red nueva, con **dirección IP pública**.
- **SSH keys**: "Generate a key pair" y **descarga la clave privada**. Sin
  ella no vas a poder entrar al servidor.

Si dice **"Out of capacity"**, es falta de máquinas ARM libres en la región:
reintenta un rato después, o prueba otro "Availability domain" en el mismo
formulario.

Cuando termine, copia la **Public IP address** de la instancia.

### 1.3 Abrir los puertos 80 y 443

Oracle los bloquea en dos sitios, y hay que abrir los dos.

**En la red de Oracle**: en la instancia → Subnet → Security List → **Add
Ingress Rules**:

- Source CIDR `0.0.0.0/0`, protocolo TCP, puerto destino `80`.
- Otra igual con el puerto `443`.

**En el propio Ubuntu** (ya dentro del servidor, en el paso 1.4):

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

### 1.4 Entrar e instalar Docker

Desde tu computador, con la clave que descargaste:

```bash
ssh -i ruta/a/la-clave.key ubuntu@IP_PUBLICA
```

Ya dentro:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit
```

Vuelve a entrar con `ssh` para que el cambio de grupo tome efecto.

---

## 2. El dominio en Hostinger

En hPanel → **Dominios → tu dominio → DNS / Nameservers → Registros DNS**:

| Tipo | Nombre | Apunta a |
|---|---|---|
| A | `api` | la IP pública del servidor de Oracle |

(Los registros del dominio principal para Vercel van en el paso 4.)

Los cambios de DNS tardan de minutos a unas horas. Se puede comprobar con
`ping api.tudominio.com`: cuando responda la IP del servidor, está listo.

---

## 3. El backend en el servidor

```bash
git clone https://github.com/JuSebasCel/Menti-Vault.git
cd Menti-Vault
git checkout dev
```

Si el repositorio es **privado**, `git clone` pide usuario y contraseña: la
contraseña es un **token** de GitHub (Settings → Developer settings →
Personal access tokens → *Fine-grained*, con acceso de lectura solo a este
repositorio), no tu contraseña de GitHub.

### 3.1 Las variables del backend

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | La de Supabase (Project Settings → API). |
| `SUPABASE_ANON_KEY` | La anon key de Supabase. |
| `BITACORA_ORIGENES_PERMITIDOS` | `https://tudominio.com,https://www.tudominio.com` |
| `BITACORA_SECRETO_DEL_SERVIDOR` | **El mismo** que tienes en `backend/.env` de tu computador. Sin él, nadie puede usar las claves compartidas de la administración. |

Las demás (`OPENAI_MODELO_*`, `BITACORA_MODELOS_GROQ_*`) se pueden dejar
vacías: tienen valores por defecto.

### 3.2 El dominio de la API y el arranque

```bash
cd despliegue
cp .env.example .env
nano .env          # DOMINIO_API=api.tudominio.com
docker compose up -d --build
```

La primera construcción tarda varios minutos (instala LibreOffice). Para ver
que arrancó:

```bash
docker compose logs -f api
```

Tiene que decir `Application startup complete`. En el navegador,
`https://api.tudominio.com/docs` tiene que abrir la documentación de la API,
ya con candado (HTTPS).

### 3.3 Actualizar después de un cambio

```bash
cd ~/Menti-Vault && git pull && cd despliegue && docker compose up -d --build
```

---

## 4. El frontend en Vercel

1. En <https://vercel.com>, **Add New → Project** e importa el repositorio
   `Menti-Vault` desde GitHub.
2. **Root Directory**: `frontend`. Vercel detecta Vite solo.
3. **Environment Variables**:

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | La de Supabase. |
   | `VITE_SUPABASE_ANON_KEY` | La anon key de Supabase. |
   | `VITE_API_URL` | La dirección del backend: `https://….koyeb.app` (o `https://api.tudominio.com` si usaste Oracle). |

4. **Deploy**. En **Settings → Git**, la rama de producción debería ser
   `main`; mientras el trabajo siga en `dev`, cambia esa rama a `dev` o une
   `dev` en `main` antes.
5. **Settings → Domains → Add** `tudominio.com`. Vercel te dice qué registros
   poner; en Hostinger normalmente son:

   | Tipo | Nombre | Apunta a |
   |---|---|---|
   | A | `@` | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |

   Usa los que te muestre Vercel si son distintos.

`frontend/vercel.json` ya está: hace que recargar en cualquier ruta
(`/conferencias`, `/plantillas/…`) abra la app en vez de un 404.

---

## 5. Supabase

En Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://tudominio.com`
- **Redirect URLs**: añade `https://tudominio.com/**` y
  `https://www.tudominio.com/**`.

Sin esto, los correos de confirmación de cuenta llevan a `localhost`.

---

## 6. Comprobar que todo está bien

1. Abre `https://tudominio.com` y entra con tu cuenta.
2. Configuración: tus claves siguen ahí (viven en Supabase, no en el servidor).
3. Carga una conferencia corta y analízala.
4. Abre una memoria y descarga el PDF: eso prueba LibreOffice en el servidor.

Si algo falla, lo primero es `docker compose logs api` en el servidor.
