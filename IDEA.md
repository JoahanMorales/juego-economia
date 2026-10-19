# IDEA.md — "Pásala": la papa caliente del dinero

> Documento de especificación para construir el juego con **Claude Code** y desplegarlo en **Render**.
> Está pensado para que se lo pases completo a Claude Code ("lee IDEA.md y construye la fase 1") y vaya fase por fase.

---

## 0. Resumen en una línea

Un juego web en tiempo real para clase de Macroeconomía (IPN · UPIICSA): el dinero de una inversión rebota entre los celulares de los alumnos; quien lo recibe tiene 10 segundos para quedarse con su ahorro y pasar el resto. Al final el proyector muestra cuánto dinero se movió en total y se compara con el **multiplicador de la inversión** (k = 1 / (1 − PMC)).

---

## 1. Contexto: qué tema enseña

El juego acompaña la presentación **"El multiplicador de la inversión"**. Las ideas que el juego debe hacer *sentir*:

1. **El gasto de uno es el ingreso de otro.** Cuando alguien gasta, ese dinero se vuelve el ingreso de la siguiente persona.
2. **Cada quien guarda una parte.** De cada peso que recibe, una parte se consume (PMC) y otra se ahorra (PMS). PMC + PMS = 1.
3. **La cadena se va apagando.** Como en cada paso alguien ahorra, cada vez pasa menos dinero, pero la suma total es finita.
4. **El total es un múltiplo de la inversión.**
   - Ingreso total generado: ΔY = k × ΔI
   - Multiplicador: k = 1 / (1 − PMC) = 1 / PMS
   - El ahorro total al final siempre es igual a la inversión inicial.

### Números que deben coincidir con la presentación

| Caso de la presentación | Inversión | PMC | k | Ingreso total |
|---|---|---|---|---|
| Leñeras y carpinteros | $1,000 | 2/3 | 3 | $3,000 |
| Ejercicio 1 | $1,000,000 | 0.50 | 2 | $2,000,000 |
| Ejercicio 2 | $1,000,000 | 0.75 | 4 | $4,000,000 |

El presentador debe poder elegir estos valores para que lo que se ve en el juego cuadre con las diapositivas.

### Ejemplo de la cadena (PMC = 0.75, inversión $1,000)

| Pase | Ingreso que recibe | Ahorra (25%) | Pasa / consume (75%) |
|---|---|---|---|
| 1 | 1,000.00 | 250.00 | 750.00 |
| 2 | 750.00 | 187.50 | 562.50 |
| 3 | 562.50 | 140.63 | 421.87 |
| 4 | 421.87 | 105.47 | 316.40 |
| … | … | … | … |
| Total (∞) | **4,000.00** | **1,000.00** | 3,000.00 |

---

## 2. Reglas del juego (versión final para el usuario)

1. El presentador abre la sala en la computadora conectada al proyector. Aparece un **código de sala** de 4 letras y un **código QR**.
2. Los alumnos escanean el QR (o entran a la página y escriben el código) y ponen su nombre.
3. El presentador elige la **inversión inicial** y la **PMC** y presiona **¡Arrancar!**
4. El dinero le cae a un jugador al azar. Su celular vibra y se pone en "modo papa caliente":
   - Ve cuánto le llegó (su **ingreso**).
   - Tiene **10 segundos** para escribir cuánto se **ahorra**: ingreso × (1 − PMC).
   - Toca el nombre de un compañero para **pasarle el resto** (su consumo).
5. Si la cuenta está bien (tolerancia de ±$0.50), ese ahorro se le suma a su alcancía.
6. Si se equivoca o se le acaba el tiempo, **pierde ese ahorro** (se marca en rojo en la tabla) y el dinero salta a alguien al azar. La cadena **siempre** pasa el monto correcto para que la economía cuadre.
7. El dinero sigue rebotando hasta que queda **menos de $1** o el presentador presiona **Terminar**.
8. **Pantalla final:** cuánto se movió en total vs. lo que dice la teoría (k × inversión), la tabla completa de la cadena y el podio. **Gana quien juntó más ahorro.**

### Por qué el ganador es "el que más ahorró"
Premia hacer bien la cuenta y rápido, y además hace visible que el ahorro de todos sumado tiende a la inversión inicial.

### Reglas finas
- No te puedes pasar el dinero a ti mismo.
- Si solo hay 2 jugadores, el dinero va y viene entre ellos; está bien.
- Desempate: gana quien cometió menos errores; si siguen empatados, quien respondió más rápido en promedio.
- Opcional (configurable): evitar pasarle al mismo que te lo pasó a ti ("no regreses la papa").

---

## 3. Experiencia por pantalla

### 3.1 Pantalla del presentador (proyector)
- **Lobby:** título del juego, código de sala grande, QR, lista de jugadores que van entrando (chips con su nombre), controles de inversión y PMC, botón "Agregar bots" (para pruebas), botón "¡Arrancar!".
- **En juego:**
  - Centro: **quién tiene el dinero** (nombre enorme, animación de "pulso"), el monto, y un anillo de cuenta regresiva de 10 s.
  - Línea de evento: "Ana se quedó $250 y le pasó $750 a Luis" o, en rojo, "A Luis se le acabó el tiempo…".
  - Lateral: contador grande **"Dinero que se ha movido"**, número de pases, ranking de ahorro y la tabla de la cadena (últimos 8 pases).
  - Botón "Terminar ahora".
  - Animación opcional: un billete que "vuela" del nombre anterior al nuevo.
- **Final:** frase grande "$1,000 de inversión movieron $3,9xx en la economía", la fórmula teórica, la tabla completa con totales, podio y botones "Otra ronda" / "Cambiar PMC".

### 3.2 Pantalla del jugador (celular)
- **Entrar:** código de sala (si no vino en el QR) + nombre.
- **Esperando:** "¡Estás dentro!" y su ahorro actual.
- **Cuando otro tiene el dinero:** nombre de quien lo tiene y el monto, "Atento: te lo pueden pasar a ti".
- **Cuando lo tiene él:** vibración (`navigator.vibrate`), fondo naranja, monto grande, anillo de 10 s, campo numérico "¿Cuánto te ahorras?", lista de compañeros como botones grandes, botón **¡Pásala!**
- **Después de pasar:** "¡Pasada! Mira el proyector".
- **Final:** su lugar (#3), cuánto ahorró y el resumen del multiplicador.

### 3.3 Diseño visual
- Paleta oscura con guinda del IPN (fondo `#170C12`, superficies `#26131D`), dorado `#EDC24F` para dinero y números, naranja "papa caliente" `#FF6A3D` para el turno activo, verde `#5CC57A` acierto, rojo `#EF5B5B` error.
- Tipografías (Google Fonts): **Bricolage Grotesque** (títulos), **Atkinson Hyperlegible** (texto), **JetBrains Mono** (cantidades).
- Montos siempre con formato mexicano: `$1,234.56` (`toLocaleString('es-MX', {minimumFractionDigits: 2})`).
- Todo grande y legible a 5 metros en el proyector; en el celular, botones de al menos 48 px de alto.

> Ya existe un **prototipo funcional en un solo HTML** (`pasala.html`, hecho en Claude). Úsalo como referencia visual y de lógica: la versión de Render reemplaza su capa de tiempo real por Socket.IO.

---

## 4. Arquitectura técnica

### 4.1 Stack
- **Node.js 20+**
- **Express**: sirve los archivos estáticos y un endpoint `/health`.
- **Socket.IO 4**: tiempo real (WebSocket con fallback a long-polling, reconexión automática).
- **Frontend sin framework**: HTML + CSS + JS vanilla (dos páginas: `host.html` y `play.html`). Sin paso de build, menos cosas que fallen.
- **qrcode** (npm) en el servidor para generar el QR del enlace de la sala como data URL.
- **Sin base de datos**: todo el estado vive en memoria del servidor. Una partida dura minutos; no hace falta persistir.

### 4.2 Principio clave: el servidor manda
El **servidor es la única fuente de verdad**. Él:
- elige al primer jugador,
- lleva el reloj de cada turno (`setTimeout` de 10 s),
- valida la cuenta del jugador,
- decide a quién pasa el dinero si el destino no es válido,
- suma ahorros, errores y el total movido,
- manda el estado actualizado a todos.

Los clientes **solo muestran** el estado y **envían acciones**. Así nadie puede hacer trampa desde la consola del navegador y todos ven lo mismo.

### 4.3 Estructura de carpetas
```
pasala/
├── package.json
├── server.js            # Express + Socket.IO + arranque
├── src/
│   ├── rooms.js         # crear/buscar/borrar salas, códigos de 4 letras
│   ├── game.js          # lógica pura del juego (sin sockets) → fácil de testear
│   ├── bots.js          # jugadores bot para pruebas
│   └── validate.js      # sanitizar nombres, números, códigos
├── public/
│   ├── index.html       # portada: "Soy presentador" / "Soy jugador"
│   ├── host.html
│   ├── play.html
│   ├── css/styles.css
│   └── js/
│       ├── host.js
│       ├── play.js
│       └── format.js    # money(), etc. compartido
├── test/
│   ├── game.test.js     # pruebas de la lógica (node:test)
│   └── load-test.js     # simula 30 jugadores
├── render.yaml
├── CLAUDE.md
└── README.md
```

### 4.4 Modelo de datos (en memoria)
```js
// Map<codigoSala, Room>
Room = {
  code: "KFTR",
  hostToken: "uuid",            // sólo el presentador lo conoce
  hostSocketId: "abc",
  createdAt: 1730000000000,
  lastActivity: 1730000000000,
  settings: { investment: 1000, pmc: 0.75, turnMs: 10000, tolerance: 0.5 },
  phase: "lobby" | "playing" | "final",
  players: Map<playerId, {
    id: "uuid",                 // token que el celular guarda en localStorage
    name: "Ana",
    socketId: "xyz" | null,     // null = desconectado
    connected: true,
    isBot: false,
    saved: 0,
    errors: 0,
    totalResponseMs: 0,
    turns: 0
  }>,
  game: {
    holderId: "uuid",
    amount: 750,
    turn: 7,                    // número de turno; toda acción trae el turno para evitar dobles
    deadline: 1730000010000,
    timer: Timeout,             // no se serializa
    moved: 3466.04,
    lostSavings: 433.6,
    ledger: [ { n, playerId, name, income, consumption, saving, ok, reason } ],
    lastEvent: { ok: true, text: "Ana se quedó $250 y le pasó $750 a Luis" }
  }
}
```

### 4.5 Protocolo de eventos (Socket.IO)

**Cliente → servidor**

| Evento | Quién | Datos | Qué hace |
|---|---|---|---|
| `host:create` | presentador | `{}` | crea sala, responde `{code, hostToken, joinUrl, qr}` |
| `host:resume` | presentador | `{code, hostToken}` | reconecta al presentador si recargó la página |
| `host:settings` | presentador | `{investment, pmc}` | cambia configuración (sólo en lobby) |
| `host:addBots` | presentador | `{count}` | agrega bots |
| `host:kick` | presentador | `{playerId}` | saca a alguien (nombres ofensivos) |
| `host:start` | presentador | `{}` | arranca (mínimo 2 jugadores) |
| `host:end` | presentador | `{}` | termina la partida |
| `host:lobby` | presentador | `{}` | vuelve al lobby (para cambiar PMC) |
| `player:join` | jugador | `{code, name, playerId?}` | entra o reconecta; responde `{playerId}` |
| `player:pass` | jugador | `{turn, saving, toId}` | su jugada |

**Servidor → clientes**

| Evento | A quién | Datos |
|---|---|---|
| `room:state` | toda la sala (`io.to(code)`) | estado público (ver abajo) |
| `you:turn` | sólo al que tiene el dinero | `{turn, amount, deadline, pmc}` (también va en el estado) |
| `error:msg` | al que causó el error | `{code, message}` en español |

**Estado público** (lo que recibe todo mundo; nunca incluye `hostToken`):
```js
{
  code, phase, settings: { investment, pmc },
  players: [ { id, name, saved, errors, connected, isBot } ],
  game: { holderId, amount, turn, msLeft, moved, passes, lastEvent, ledgerTail /* últimos 8 */ },
  final: { ledger /* completo */, theoretical, ranking } // sólo en phase "final"
}
```
- Mandar `msLeft` (no `deadline`) porque los relojes de los celulares no están sincronizados; cada cliente calcula su propio fin con `Date.now() + msLeft`.
- El tamaño con 30 jugadores es de ~2–3 KB por mensaje.

### 4.6 Lógica del turno (pseudocódigo para `game.js`)
```js
function startGame(room) {
  reset saved/errors de todos
  room.game = { moved: 0, lostSavings: 0, ledger: [], turn: 0 }
  holder = jugador conectado al azar
  amount = settings.investment
  nextTurn(room)
}

function nextTurn(room) {
  g.turn++
  g.deadline = now + settings.turnMs
  clearTimeout(g.timer)
  g.timer = setTimeout(() => resolveTurn(room, { turn: g.turn, timeout: true }), settings.turnMs + 300) // 300 ms de gracia por latencia
  si holder es bot → programar su jugada en 1.5–4.5 s
  si holder está desconectado → resolver como timeout en 3 s (no esperar 10)
  broadcast
}

function resolveTurn(room, { turn, saving, toId, timeout }) {
  if (phase !== "playing" || turn !== g.turn) return      // jugada vieja o duplicada → ignorar
  const income = round2(g.amount)
  const correctSaving = round2(income * (1 - pmc))
  const consumption = round2(income - correctSaving)       // SIEMPRE el valor correcto
  const ok = !timeout && isFinite(saving) && Math.abs(saving - correctSaving) <= tolerance
  if (ok) holder.saved += correctSaving else { holder.errors++; g.lostSavings += correctSaving }
  g.moved += income
  g.ledger.push({ n, name, income, consumption, saving: correctSaving, ok, reason })
  destino = toId válido (existe, conectado, ≠ holder) ? toId : alguien al azar (conectado, ≠ holder)
  g.holderId = destino; g.amount = consumption
  if (consumption < 1) return finish(room)
  nextTurn(room)
}
```
- Redondear siempre a centavos (`Math.round(x * 100) / 100`).
- Teoría para la pantalla final: `investment / (1 - pmc)`. Lo movido real siempre queda un poco abajo porque la cadena se corta antes de $1.

### 4.7 Casos raros que hay que cubrir
- **Jugador recarga la página / se le va el internet:** el celular guarda `playerId` en `localStorage`; al volver manda `player:join` con ese id y recupera su lugar y su ahorro. Mientras está desconectado se le muestra gris en el lobby y no se le puede pasar el dinero.
- **Al que tiene el dinero se le cae la conexión:** a los 3 s se resuelve como tiempo agotado y el dinero salta a otro.
- **Presentador recarga:** guarda `code` + `hostToken` en `localStorage` y manda `host:resume`. El juego sigue corriendo en el servidor aunque el proyector se desconecte.
- **Nombres repetidos:** agregar sufijo ("Ana", "Ana 2"). Recortar a 16 caracteres, quitar HTML, nombres vacíos no.
- **Pocos jugadores conectados:** si quedan menos de 2 conectados durante la partida, pausar y avisar en el proyector.
- **Doble clic en "¡Pásala!":** el campo `turn` lo evita (la segunda jugada trae un turno viejo y se ignora).
- **Salas abandonadas:** borrar salas con más de 2 horas sin actividad (un `setInterval` cada 10 min).
- **Seguridad básica:** validar todo lo que llega (tipos, rangos: inversión 10–10,000,000; PMC entre 0.1 y 0.95), sólo el socket con `hostToken` puede usar eventos `host:*`, escapar nombres al pintarlos (`textContent`, nunca `innerHTML` con datos de usuarios), límite de 1 acción por segundo por socket.

### 4.8 Bots (para probar sin 30 personas)
- Nombres temáticos: "Bot Panadero", "Bot Carnicero", "Bot Tendera", "Bot Frutero", "Bot Carpintera".
- Responden en 1.5–4.5 s, aciertan el 85 % de las veces, eligen destino al azar.
- Se agregan desde el lobby del presentador y se marcan con 🤖.

---

## 5. ¿Aguanta 30 personas en Render? — Sí, de sobra

Cálculo rápido de la carga:
- 30 conexiones WebSocket abiertas: para Node con Socket.IO es muy poco (un solo proceso aguanta miles).
- Mensajes: un turno cada ~3–10 s; en cada turno el servidor manda ~3 KB a 30 personas ≈ **90 KB por turno**. Aunque mandes el estado cada segundo para el reloj, son menos de 100 KB/s. Insignificante.
- Memoria: el estado de una sala ocupa unos pocos KB.

Lo que **sí** hay que cuidar:

1. **Una sola instancia.** Como el estado vive en memoria, el servicio debe correr con **1 instancia** (no activar autoscaling). Con 30 personas no se necesita más. Si algún día se escalara, habría que mover el estado a Redis y usar el adaptador de Redis de Socket.IO.
2. **El plan gratis se duerme.** En Render, un servicio web gratis se apaga tras **15 minutos sin tráfico** y tarda **alrededor de un minuto** en despertar. Mientras haya mensajes de WebSocket se mantiene despierto, así que durante el juego no hay problema. **Solución práctica:** abrir la página del presentador 5 minutos antes de la clase. Si no quieres arriesgarte, usa un plan de pago (no se duerme).
3. **Reinicios.** Render puede reiniciar un servicio gratis en cualquier momento y un redeploy borra lo que esté en memoria. No despliegues cambios a la mitad de la clase.
4. **Horas gratis.** El plan gratis da 750 horas al mes por workspace; un servicio dormido no consume. Para un proyecto escolar alcanza.
5. **Internet de la escuela.** El cuello de botella más probable es el Wi-Fi del salón, no Render. Socket.IO reconecta solo; pide que usen datos si el Wi-Fi falla.

---

## 6. Despliegue en Render

### 6.1 Requisitos en el código
```js
// server.js
const PORT = process.env.PORT || 3000;          // Render asigna el puerto
server.listen(PORT, "0.0.0.0", () => console.log("Pásala en puerto", PORT));
app.get("/health", (_, res) => res.send("ok")); // health check
```
- La URL pública para el QR se arma con `process.env.RENDER_EXTERNAL_URL` (Render la define) o con el `host` de la petición.
- `package.json` con `"engines": { "node": ">=20" }` y `"start": "node server.js"`.

### 6.2 `render.yaml` (Blueprint)
```yaml
services:
  - type: web
    name: pasala
    runtime: node
    plan: free            # cambiar a starter si no quieres que se duerma
    buildCommand: npm ci
    startCommand: npm start
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_VERSION
        value: "20"
```

### 6.3 Pasos
1. Sube el proyecto a un repositorio de GitHub.
2. En Render: **New → Blueprint** (o **New → Web Service**) y conecta el repo.
3. Si no usas Blueprint: Runtime **Node**, Build `npm ci`, Start `npm start`, Health check `/health`, 1 instancia.
4. Espera el deploy y abre `https://pasala-xxxx.onrender.com`.
5. Prueba con la prueba de carga (sección 7) apuntando a esa URL.

---

## 7. Pruebas

### 7.1 Lógica (sin red)
`test/game.test.js` con `node:test`:
- Con PMC 0.75 e inversión 1000, el primer ahorro correcto es 250 y pasan 750.
- Con PMC 2/3, el ahorro de 1000 es 333.33 (tolerancia ±0.50 acepta 333 y 333.5).
- Una respuesta fuera de tolerancia suma error y no suma ahorro, pero el dinero pasa igual.
- Una jugada con turno viejo se ignora.
- Pasarse a sí mismo → destino al azar.
- La partida termina cuando el monto baja de $1.
- Con todos acertando, la suma de ahorros ≈ inversión − lo que quedó al cortar.

### 7.2 Carga: simular 30 celulares
`test/load-test.js` con `socket.io-client`:
- Crea una sala como presentador, conecta 30 clientes con nombres "Prueba 1…30".
- Cada cliente, cuando es su turno, espera 1–8 s, responde bien el 80 % de las veces y le pasa a alguien al azar.
- Corre 3 partidas seguidas y reporta: latencia promedio entre `player:pass` y el `room:state` siguiente, desconexiones y errores.
- Meta: latencia < 300 ms y cero desconexiones.
- Comando: `node test/load-test.js https://pasala-xxxx.onrender.com`

### 7.3 Prueba real
Antes de la clase, jugar con 3–5 amigos en sus celulares usando datos móviles y Wi-Fi.

---

## 8. Plan de trabajo con Claude Code (prompts listos)

Copia cada prompt en Claude Code en orden. Después de cada fase, prueba y haz commit.

**Fase 1 — Esqueleto**
> Lee IDEA.md. Crea el proyecto Node con Express y Socket.IO según la estructura de la sección 4.3. Sirve `public/` como estáticos, agrega `/health` y escucha en `process.env.PORT`. Crea `index.html` con dos botones: "Soy presentador" y "Soy jugador". Haz commit.

**Fase 2 — Salas y lobby**
> Implementa `rooms.js` y los eventos `host:create`, `host:resume`, `player:join` (con reconexión por `playerId` en localStorage) y `room:state`. El presentador ve el código de sala, un QR (paquete `qrcode`) y la lista de jugadores en vivo. Los jugadores entran con código y nombre. Valida nombres según la sección 4.7.

**Fase 3 — Lógica del juego**
> Implementa `game.js` como funciones puras siguiendo el pseudocódigo de la sección 4.6 y escribe `test/game.test.js` con los casos de la sección 7.1. Corre las pruebas hasta que pasen.

**Fase 4 — Conectar juego y sockets**
> Conecta `game.js` con los eventos `host:start`, `player:pass`, `host:end`, `host:lobby`. El servidor maneja el temporizador de 10 s. Agrega los bots de la sección 4.8 y el evento `host:addBots`.

**Fase 5 — Pantalla del presentador**
> Diseña `host.html` según las secciones 3.1 y 3.3: lobby, juego (quién tiene el dinero, anillo de 10 s, contador de dinero movido, ranking, tabla de la cadena) y final (movido vs. teoría k × ΔI, tabla completa, podio). Debe verse bien proyectado.

**Fase 6 — Pantalla del jugador**
> Diseña `play.html` según la sección 3.2, pensado para celular: modo papa caliente con vibración, campo numérico con teclado decimal (`inputmode="decimal"`), botones grandes con los nombres, y pantallas de espera y final.

**Fase 7 — Casos raros y seguridad**
> Revisa y cubre todos los puntos de la sección 4.7. Agrega límite de acciones por socket y limpieza de salas abandonadas.

**Fase 8 — Carga y despliegue**
> Escribe `test/load-test.js` según la sección 7.2 y córrelo en local con 30 clientes. Luego crea `render.yaml` (sección 6.2) y un README con los pasos de despliegue.

**Fase 9 — Pulido (opcional)**
> Agrega: animación del billete volando entre nombres, sonido opcional en el proyector (con botón para activarlo), modo "no regreses la papa", y una gráfica de barras en la pantalla final con el ingreso de cada pase.

---

## 9. `CLAUDE.md` sugerido para el repo

```md
# Pásala
Juego en tiempo real (Node + Express + Socket.IO) para enseñar el multiplicador de la inversión.
- La especificación completa está en IDEA.md. Síguela.
- El servidor es la única fuente de verdad; los clientes sólo muestran estado y envían acciones.
- Todo el texto de la interfaz va en español de México. Montos con formato es-MX y 2 decimales.
- Nunca uses innerHTML con datos de jugadores; usa textContent.
- Corre `npm test` antes de cada commit.
- Una sola instancia en Render: el estado vive en memoria.
```

---

## 10. Checklist el día de la clase

- [ ] Abrir la página del presentador **5 minutos antes** (despierta el servidor si está en plan gratis).
- [ ] Proyectar y verificar que el QR se lee desde el fondo del salón.
- [ ] Elegir PMC e inversión que coincidan con la diapositiva que se acaba de explicar (2/3 y $1,000 para la leñera).
- [ ] Hacer una ronda de práctica de 1 minuto.
- [ ] Jugar 2 rondas: PMC 0.50 y PMC 0.75, y comparar cuánto se movió en cada una (k = 2 vs. k = 4).
- [ ] Cerrar con la pantalla final: "lo que se movió ≈ k × inversión".

---

## 11. Ideas para después

- **Cartas de evento:** "Pagas impuestos" (una parte del dinero sale de la cadena), "Importaste algo" (otra fuga), "Crisis" (baja la PMC a mitad de la partida). Enseñan por qué el multiplicador real es menor.
- **Modo equipos:** el salón dividido en 2 economías con PMC distinta; gana la economía que más mueve.
- **Exportar resultados:** descargar la tabla de la cadena en CSV para pegarla en el reporte.
- **Historial de partidas** con una base de datos sencilla (si un día se necesita).
