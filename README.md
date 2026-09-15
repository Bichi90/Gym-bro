# Gym Bro

Herramienta de seguimiento de gimnasio: rutinas, cargas, repeticiones, antropometría y progreso
hacia un objetivo concreto.

Es una aplicación web que corre entera en el navegador. **No hay servidor ni cuenta**: todos los
datos se guardan en el `localStorage` del dispositivo y se pueden exportar e importar como JSON.
Funciona en el móvil y se puede instalar como app desde el navegador (es una PWA básica).

## Qué hace

**Antropometría.** Registrás peso y circunferencias (cuello, cintura, cadera, pecho, brazo,
antebrazo, muslo, gemelo, hombros) y la app calcula:

- % de grasa estimado por el método de la **US Navy** (o el valor que midas con balanza, plicómetro
  o DEXA, que tiene prioridad),
- masa magra y masa grasa,
- IMC y ratio cintura/altura,
- metabolismo basal por **Katch-McArdle** si conoce tu masa magra, o **Mifflin-St Jeor** si no,
- gasto diario total según tu actividad y tus días de entrenamiento,
- tendencia real de peso (regresión lineal de las últimas 4 semanas) y media móvil de 7 días para
  filtrar el ruido del día a día.

**Objetivo.** Elegís qué querés conseguir (perder grasa, ganar músculo, ganar fuerza, recomposición
o mantenimiento), un peso o un % de grasa objetivo y una fecha. Con eso la app:

- calcula calorías y macros (proteína, grasas, carbohidratos),
- deriva el déficit o superávit del ritmo que exige tu fecha, **recortándolo siempre al rango
  seguro** (0,25–1 % del peso por semana para bajar, 0,1–0,5 % para subir),
- te dice si el plazo es cómodo, exigente o directamente inviable, y en ese caso qué fecha sí es
  alcanzable,
- compara el ritmo previsto con el que están mostrando tus mediciones reales,
- guarda marcas de 1RM objetivo por ejercicio y su progreso.

**Rutina.** Se genera a partir del objetivo, los días y minutos que tenés, tu experiencia y el
equipamiento disponible:

- elige el reparto (full body, empuje/tirón/pierna, torso/pierna…) según días y nivel,
- elige los ejercicios del catálogo filtrando por el equipamiento que marcaste,
- aplica el esquema de series, repeticiones, RIR y descanso que corresponde al objetivo,
- da volumen extra a los grupos que priorices y los coloca primero en la sesión,
- recorta la sesión para que entre en los minutos de los que disponés,
- muestra el volumen semanal por grupo muscular frente al rango recomendado para tu nivel.

Todo es editable a mano: series, repeticiones, RIR, descansos, añadir y quitar ejercicios.

**Entrenar.** Registro de la sesión en vivo: peso, repeticiones, RIR y tipo de cada serie, con
cronómetro de descanso que arranca al marcar una serie como hecha. Antes de cada ejercicio te
sugiere la carga por **doble progresión**: si la última vez cerraste el tope del rango cumpliendo
el RIR, sube el peso; si te quedaste corto, lo baja; si estás dentro del rango, mantiene y pide una
repetición más. También ves qué hiciste la última vez.

**Progreso.** Evolución del 1RM estimado por ejercicio (Epley, ajustado por RIR) frente a tu marca
objetivo, series efectivas y tonelaje por semana, volumen real por grupo muscular frente al
recomendado, adherencia al plan, récords personales e historial completo de sesiones.

## Cómo se usa

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # tests de la lógica de cálculo
npm run build      # build de producción en dist/
npm run preview    # sirve el build
```

`dist/` es estático: se puede publicar en cualquier hosting de archivos.

El primer arranque va vacío. El orden recomendado es **Ajustes** (altura, fecha de nacimiento,
experiencia, equipamiento) → **Antropometría** (primera medición) → **Objetivo** → *Generar rutina*
→ **Entrenar**.

## Estructura

```
src/
  lib/                 lógica pura, sin React, con tests
    types.ts           modelo de dominio
    ejercicios.ts      catálogo de ejercicios
    antropometria.ts   % de grasa, masa magra, metabolismo, tendencias
    objetivo.ts        calorías, macros, viabilidad y proyección
    rutina.ts          generador de rutinas y volumen recomendado
    entrenamiento.ts   1RM, volumen, progresión, récords, adherencia
    almacenamiento.ts  persistencia en localStorage, export/import
    formato.ts         formateo de números, pesos y fechas
  estado/              store de React y derivados compartidos
  componentes/         primitivas de interfaz y gráficos SVG
  paginas/             una por sección de la app
```

La lógica de cálculo está separada de la interfaz y cubierta por tests (`npm test`), así que se
puede tocar una fórmula sin miedo a romper la pantalla.

## Aviso

Los cálculos son estimaciones con fórmulas estándar de uso común, útiles para seguir tendencias, no
medidas clínicas. Ante lesiones, patologías o dudas sobre tu alimentación, consultá con un
profesional de la salud.
