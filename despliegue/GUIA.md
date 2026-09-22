# Despliegue de Menti Vault en menti.site

Al terminar:

- **`https://menti.site/apps/vault`** abre Menti Vault.
- **`https://menti.site`** (y cualquier otra ruta) redirige a Menti Vault por
  ahora. El día que exista la landing de todas las apps, se quita esa
  redirección y la raíz queda libre para ella.

| Pieza | Dónde | Costo |
|---|---|---|
| Base de datos, sesiones, archivos | Supabase | Ya está; no hay que tocar nada salvo el paso 4. |
| Backend (la IA) | Render | Gratis, sin tarjeta. |
| Frontend | Vercel | Gratis, sin tarjeta. |
| Dominio `menti.site` | Hostinger | El que ya pagaste. |

Hazlo **en este orden**: cada paso usa un dato que sale del anterior.

---

## Antes de empezar: de dónde salen los valores

Todo lo que vas a pegar ya está en dos archivos de tu computador. Ábrelos
con el Bloc de notas o VS Code:

**`backend/.env`** (el del backend, no el del frontend):

| Variable | Para qué |
|---|---|
| `SUPABASE_URL` | Dirección de tu proyecto de Supabase. |
| `SUPABASE_ANON_KEY` | La clave pública de Supabase. |
| `BITACORA_SECRETO_DEL_SERVIDOR` | Está **al final del archivo**. Ver abajo. |

**`frontend/.env.local`**:

| Variable | Para qué |
|---|---|
| `VITE_SUPABASE_URL` | La misma dirección de Supabase. |
| `VITE_SUPABASE_ANON_KEY` | La misma clave pública. |

### ¿Qué es `BITACORA_SECRETO_DEL_SERVIDOR`?

Una contraseña larga que solo conocen el backend y la base de datos. Sirve
para una sola cosa: cuando activas en Configuración que los demás usen
**tus** claves de Groq, la base solo le entrega esas claves a quien presente
este secreto. Así, aunque alguien tenga una cuenta en la app, no puede leer
tus claves: solo el backend puede.

- Ya existe: se generó al montar la administración y quedó escrita en la
  última línea de `backend/.env`, con un comentario encima. Copia lo que va
  **después del `=`**, sin espacios ni comillas.
- Es **opcional**. Si no lo pones, todo funciona, excepto que las claves
  compartidas de la administración dejan de funcionar para los demás: cada
  persona tendría que poner las suyas.
- No lo pegues en el frontend (Vercel) ni en ningún otro sitio: vive solo en
  `backend/.env` y en Render.
- Si no lo encuentras en el archivo, pídeme que genere uno nuevo: hay que
  actualizar también su huella en la base de datos, y eso lo hago yo.

---

## 1. El backend en Render

Plan gratuito: 512 MB de RAM y 750 horas al mes (alcanza para el mes
entero). Se duerme tras **15 minutos sin uso** y tarda **cerca de un minuto**
en despertar. El código ya lo tiene en cuenta:

- Mientras hay un análisis en curso, el backend se llama a sí mismo cada 5
  minutos, así que no se duerme a mitad de un análisis aunque se cierre la
  pestaña.
- Al entrar a la app, el frontend lo va despertando, para que el minuto de
  arranque pase mientras navegas y no al pulsar "Analizar".

Pasos:

1. Entra a <https://render.com> con **GitHub**. No pide tarjeta.
2. **New → Web Service** y conecta el repositorio **`Menti-Vault`**.
3. Llena el formulario:

   | Campo | Valor |
   |---|---|
   | Name | `menti-vault-api` (esto define la dirección final) |
   | Branch | `dev` |
   | Language | `Docker` |
   | Root Directory | `backend` |
   | Dockerfile Path | déjalo como viene (`./Dockerfile`) |
   | Region | `Virginia (US East)` |
   | Instance Type | **`Free`** |

4. **Environment Variables** — cuatro, con los valores de `backend/.env`:

   | Variable | Valor |
   |---|---|
   | `SUPABASE_URL` | el de `backend/.env` |
   | `SUPABASE_ANON_KEY` | el de `backend/.env` |
   | `BITACORA_SECRETO_DEL_SERVIDOR` | el de `backend/.env` (opcional, ver arriba) |
   | `BITACORA_ORIGENES_PERMITIDOS` | `https://menti.site,https://www.menti.site` |

   Esta última es la lista de sitios a los que el backend les responde. Sin
   ella, rechaza las peticiones que vengan de menti.site.

5. Abre **Advanced** y pon en **Health Check Path**: `/salud`.
6. **Deploy Web Service**. La primera vez tarda varios minutos (instala
   LibreOffice, que es lo que convierte las memorias a PDF).
7. Cuando arriba diga **Live**, copia la dirección que aparece bajo el nombre,
   algo como `https://menti-vault-api.onrender.com`. Ábrela con `/docs` al
   final: tiene que salir la documentación de la API.

**Guarda esa dirección: es el `VITE_API_URL` del paso 2.**

Desde ahora, cada `git push` a `dev` vuelve a desplegar el backend solo.

---

## 2. El frontend en Vercel

1. Entra a <https://vercel.com> con **GitHub**.
2. **Add New → Project** e importa **`Menti-Vault`**.
3. **Root Directory**: `frontend` (botón *Edit* junto al campo). Vercel
   detecta Vite solo; no cambies los comandos de construcción.
4. **Environment Variables**:

   | Variable | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | el de `frontend/.env.local` |
   | `VITE_SUPABASE_ANON_KEY` | el de `frontend/.env.local` |
   | `VITE_API_URL` | la dirección de Render del paso 1, **sin barra al final** |

5. **Deploy**.
6. Vercel publica desde `main`, y el trabajo está en `dev`. En
   **Settings → Git → Production Branch**, escribe `dev` y guarda. Luego, en
   **Deployments**, vuelve a desplegar el último (`⋯ → Redeploy`).
7. Prueba la dirección provisional que te da Vercel
   (`https://….vercel.app`): tiene que redirigir sola a `/apps/vault` y
   mostrar la pantalla de acceso.

El proyecto ya viene preparado para vivir en `/apps/vault`
(`frontend/vite.config.ts` y `frontend/vercel.json`): recargar en cualquier
pantalla funciona, y todo lo que no empiece por `/apps/` redirige a Menti
Vault.

---

## 3. El dominio menti.site

**En Vercel**: el proyecto → **Settings → Domains → Add**, escribe
`menti.site` y acepta que también añada `www.menti.site` (que redirige a
`menti.site`). Vercel te muestra qué registros DNS poner. Déjalo abierto.

**En Hostinger**: hPanel → **Dominios → menti.site → DNS / Nameservers →
Registros DNS**.

1. **Borra primero** los registros que Hostinger trae por defecto y que
   chocan con los nuevos: el **A** con nombre `@` y el **CNAME** (o A) con
   nombre `www`. Si se quedan, el dominio sigue mostrando la página de
   Hostinger.
2. Añade los que te mostró Vercel. Normalmente son:

   | Tipo | Nombre | Apunta a | TTL |
   |---|---|---|---|
   | A | `@` | `76.76.21.21` | el que venga |
   | CNAME | `www` | `cname.vercel-dns.com` | el que venga |

   Si Vercel te muestra otros valores, usa los de Vercel.

No toques los registros **MX** ni **TXT**: son del correo.

El cambio tarda de minutos a unas horas. Cuando en Vercel los dos dominios
salgan con ✓ **Valid Configuration**, está listo; el candado (HTTPS) lo pone
Vercel solo.

---

## 4. Supabase: a dónde vuelven los correos

En Supabase → tu proyecto → **Authentication → URL Configuration**:

- **Site URL**: `https://menti.site/apps/vault`
- **Redirect URLs** → *Add URL*, estas dos:
  - `https://menti.site/apps/vault/**`
  - `http://localhost:5173/**` (para seguir probando en tu computador)

Sin esto, el enlace del correo de confirmación de cuenta lleva a
`localhost` y no le funciona a nadie más.

---

## 5. Comprobar que todo está bien

1. Abre `https://menti.site`: tiene que llevarte a `https://menti.site/apps/vault`.
2. Entra con tu cuenta.
3. **Configuración**: tus claves siguen ahí (viven en Supabase, no en el
   servidor).
4. Carga una conferencia **corta** y analízala. Si la primera vez tarda un
   minuto más en arrancar, es Render despertando.
5. Abre una memoria y descarga el PDF: eso prueba LibreOffice en el servidor.

**Si algo falla:**

| Síntoma | Dónde mirar |
|---|---|
| La app abre, pero analizar o generar memorias falla | Render → el servicio → **Logs**. |
| En la consola del navegador sale `CORS` | `BITACORA_ORIGENES_PERMITIDOS` en Render: tiene que decir exactamente `https://menti.site,https://www.menti.site`. |
| La pantalla sale en blanco | `VITE_*` en Vercel; al cambiarlas hay que volver a desplegar (**Redeploy**). |
| El PDF falla y el Word no | Con 512 MB, la conversión a PDF es lo más justo. La memoria se sigue pudiendo descargar en Word. |
| Una conferencia se queda en "procesando" para siempre | Render reinició el servicio a mitad de un análisis (puede pasar en el plan gratuito). La transcripción ya quedó guardada, así que volver a analizarla no gasta audio. |

---
---

## Apéndice: alternativas descartadas

Solo por si algún día Render deja de servir. **No hace falta nada de esto
para el despliegue de arriba.**

- **Koyeb**: desde que se unió a Mistral (febrero de 2026), las cuentas
  nuevas ya no tienen plan gratuito.
- **Google Cloud Run / VM e2-micro**: piden tarjeta y no son gratis del todo
  (la IP y el tráfico de salida se cobran); una alerta de presupuesto avisa,
  pero no corta el gasto.
- **Hugging Face Spaces con Docker**: exigen plan de pago.
- **Oracle Cloud**: 4 núcleos y 24 GB gratis, mucho más que Render, pero la
  verificación de la tarjeta falló. Si algún día pasa, estos son los pasos.

### Oracle Cloud, paso a paso

**Cuenta.** <https://signup.cloud.oracle.com>, cuenta **Free Tier**. Retiene
USD 1 para verificar la tarjeta y lo devuelve; no cobra mientras no pases la
cuenta a "Pay As You Go". La región de inicio no se puede cambiar después.

**Máquina.** Compute → Instances → Create instance:

- Image: Canonical Ubuntu 24.04.
- Shape: Ampere → `VM.Standard.A1.Flex`, 2 OCPU y 12 GB.
- Networking: red nueva con **IP pública**.
- SSH keys: "Generate a key pair" y **descarga la clave privada**.

Si dice "Out of capacity", reintenta más tarde u otro "Availability domain".

**Puertos 80 y 443.** En la instancia → Subnet → Security List → Add Ingress
Rules: TCP desde `0.0.0.0/0` a los puertos `80` y `443`. Y dentro del
servidor:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

**Docker.**

```bash
ssh -i ruta/a/la-clave.key ubuntu@IP_PUBLICA
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit      # y vuelve a entrar con ssh
```

**DNS.** En Hostinger, un registro **A** con nombre `api` apuntando a la IP
pública del servidor. El backend queda en `https://api.menti.site`.

**Backend.**

```bash
git clone https://github.com/JuSebasCel/Menti-Vault.git
cd Menti-Vault && git checkout dev
cp backend/.env.example backend/.env
nano backend/.env     # las mismas cuatro variables del paso 1
cd despliegue
cp .env.example .env
nano .env             # DOMINIO_API=api.menti.site
docker compose up -d --build
docker compose logs -f api     # hasta que diga "Application startup complete"
```

Si el repositorio es privado, la contraseña que pide `git clone` es un token
de GitHub (Settings → Developer settings → Personal access tokens →
Fine-grained, solo lectura de este repositorio).

Luego, en Vercel, `VITE_API_URL` = `https://api.menti.site`.

Para actualizar tras un cambio:

```bash
cd ~/Menti-Vault && git pull && cd despliegue && docker compose up -d --build
```
