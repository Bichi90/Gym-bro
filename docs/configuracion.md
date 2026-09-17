# Configuración de servicios

Pasos para dejar el proyecto listo antes de la Etapa 2 (endpoints de acceso y envío de correo).
Todos requieren entrar a las consolas de cada servicio con tu cuenta.

---

## 1. Dominio en Vercel

Hecho: el dominio es **https://gymbro-ar.vercel.app**, y es el valor que va en `URL_PUBLICA`.
(`gymbro.vercel.app` estaba ocupado; los subdominios de `.vercel.app` son únicos para todas las
cuentas de Vercel, no solo para la tuya.)

El alias que Vercel asigna por defecto (`gym-bro-soporteck-srl.vercel.app`) sigue funcionando; el
nuevo se sumó, no lo reemplazó.

---

## 2. Base de datos en Neon

Lo más limpio es la integración del marketplace, porque inyecta las variables sola y no hay que
copiar credenciales a mano:

**Vercel → gym-bro → Integrations → Browse Marketplace → Neon → Install**

Al terminar, el proyecto queda con `DATABASE_URL` cargada. Verificalo en Settings → Environment
Variables.

Si preferís hacerlo a mano: creá el proyecto en [neon.tech](https://neon.tech), copiá la cadena de
conexión *pooled* y cargala como `DATABASE_URL`.

### Ramas separadas para preview

**Esto importa.** Neon permite ramas de base de datos, y la integración suele crear una por rama de
git. Comprobá que la `DATABASE_URL` del entorno **Preview** apunte a una rama distinta de la de
**Production**.

Si las dos apuntan a la misma base, cualquier pull request mío escribiría sobre tus datos reales.

### Aplicar el esquema

Una vez creada la base, corré `db/001_inicial.sql` contra ella. Desde el SQL Editor de Neon,
pegando el archivo entero, o desde tu máquina:

```bash
psql "$DATABASE_URL" -f db/001_inicial.sql
```

---

## 3. Correo en Resend

> **Un `.vercel.app` no sirve como dominio de envío.** No se controla su DNS, así que no se pueden
> cargar los registros SPF y DKIM que exige Resend. El remitente tiene que salir de un dominio
> propio (por ejemplo un subdominio de `elsimetrico.com.ar`) o del dominio de pruebas de Resend,
> que solo envía a tu propia dirección. Que la app y el remitente estén en dominios distintos es
> normal y no da problemas.

1. Cuenta en [resend.com](https://resend.com).
2. **Domains → Add Domain.** Acá hay una decisión:
   - **Dominio propio** (por ejemplo `gymbro.elsimetrico.com.ar`): hay que agregar los registros
     DNS que Resend indica (SPF, DKIM y DMARC). Es lo que hace que los correos lleguen a la bandeja
     y no a spam. Recomendado.
   - **Dominio de pruebas de Resend**: funciona sin configurar nada, pero solo puede enviarte
     correos a vos mismo. Sirve para probar, no para usuarios reales.
3. **API Keys → Create**, con permiso de solo envío. Ese valor es `RESEND_API_KEY`.
4. El remitente (`CORREO_REMITENTE`) tiene que estar en el dominio verificado. Por ejemplo
   `Gym Bro <acceso@gymbro.elsimetrico.com.ar>`.

---

## 4. Variables en Vercel

**Settings → Environment Variables.** Marcá los tres entornos salvo donde se indique.

| Variable | Dónde | Cómo se obtiene |
|---|---|---|
| `DATABASE_URL` | Production, Preview, Development | Neon. **Distinta en Preview** (ver arriba). |
| `AUTH_SECRET` | Production, Preview, Development | Generado por vos, uno distinto por entorno. |
| `RESEND_API_KEY` | Production, Preview | Resend → API Keys. |
| `CORREO_REMITENTE` | Production, Preview | Buzón del dominio verificado. |
| `URL_PUBLICA` | Production, Preview, Development | La URL de cada entorno. |

Generá cada `AUTH_SECRET` así:

```bash
openssl rand -base64 32
```

Un secreto distinto por entorno: si se filtrara el de preview, las sesiones de producción siguen a
salvo.

`URL_PUBLICA` en Development es `http://localhost:3000`.

---

## 5. Comprobación

`servidor/entorno.ts` valida todo esto al arrancar y falla con la lista completa de lo que falta,
en vez de con un error opaco en mitad de un login. Nunca imprime el valor de una variable, solo su
nombre.

Para probarlo en tu máquina, copiá `.env.example` a `.env.local` y completá los valores. Ese
archivo está en `.gitignore` y no debe subirse nunca.

---

## 6. Mientras no haya base configurada

Sin `DATABASE_URL`, el middleware no obliga a entrar y la app sigue funcionando como hasta ahora:
todo en el navegador, sin cuentas. Las pantallas de acceso se ven igual, pero al enviar el
formulario el servidor contesta con un error genérico, porque no tiene dónde guardar nada.

En cuanto la variable está cargada, el middleware empieza a mandar a `/entrar` a quien no tenga
cookie de sesión. Conviene cargar las cinco variables de una vez y desplegar después, para no
dejar el sitio pidiendo un login que todavía no puede funcionar.

---

## Qué NO hacer

- **No pegues estas claves en el chat con Claude.** Quedan en el historial de la conversación.
  Cargalas directamente en el panel de Vercel.
- **No reutilices el `AUTH_SECRET` entre entornos**, ni lo guardes en el repositorio.
- **No apuntes Preview a la base de producción.**
