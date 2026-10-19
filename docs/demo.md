# Demo y entrega · Pásala (clase del martes 20 de octubre, 7:00)

## Lo que le toca al presentador (Joahan) antes de la clase

1. **Crear el servicio en Render** (un agente nunca crea cuentas ni despliega):
   1. Entra a <https://render.com> con tu cuenta de GitHub.
   2. **New → Blueprint**, elige `JoahanMorales/juego-economia`. Render lee `render.yaml` y crea `pasala` (Node, `npm ci`, `npm start`, health check `/health`, plan free, una instancia).
   3. Cuando diga *Live*, abre `https://pasala-xxxx.onrender.com/health`: debe responder `ok`.
2. **Prueba de carga contra Render** (2 minutos por partida):
   `node test/load-test.js https://pasala-xxxx.onrender.com --players 30 --games 1`
   La meta: `RESULTADO: OK`, latencia promedio < 300 ms y 0 desconexiones.
3. **Prueba real con 3 a 5 amigos** en sus celulares, con datos móviles y con Wi-Fi.
4. **Video de respaldo:** graba el flujo completo (proyector + un celular) y guárdalo fuera del repo.
5. **No hagas push a `main` desde una hora antes de la clase:** `autoDeploy` reinicia el servidor y borra las salas.

## Guion de la clase (10 a 12 minutos)

| Momento | Qué haces | Qué dices (la idea del multiplicador) |
|---|---|---|
| 5 min antes | Abres `/host.html` en el proyector (despierta Render) | |
| 0:00 | Pides que escaneen el QR y pongan su nombre | |
| 1:00 | Caso **Leñeras y carpinteros** ($1,000, PMC 2/3). Ronda de práctica de 1 minuto | "El gasto de uno es el ingreso de otro." |
| 2:00 | Terminas la práctica, **Otra ronda** | "De cada peso que te llega te quedas con una parte: PMS = 1 − PMC." |
| 3:00 | Señalas la cadena de abajo: los círculos se encogen | "La cadena se va apagando: cada vez pasa menos dinero, pero la suma es finita." |
| 5:00 | Pantalla final: movido contra teoría, gráfica | "Lo que se movió ≈ k × ΔI, con k = 1 / (1 − PMC) = 3." |
| 6:00 | **Cambiar PMC**: Ejercicio 1 ($1,000,000, PMC 0.50, k = 2) | |
| 8:00 | **Cambiar PMC**: Ejercicio 2 ($1,000,000, PMC 0.75, k = 4) | "Con más consumo, el mismo peso se mueve el doble: k = 4 contra k = 2." |
| 10:00 | Cierre con la gráfica y el podio | "El ahorro de todos sumado tiende a la inversión inicial." |

Si alguien recarga o se le va el internet, vuelve solo a su lugar y conserva su ahorro.
Si quedan menos de 2 conectados, el juego se pausa y el proyector lo avisa.

## Plan B

1. **Render dormido o caído:** espera 1 minuto en `/health`; si no responde, pasa al punto 2.
2. **Sin Render o sin Wi-Fi:** en la laptop, `npm ci && npm start` y comparte internet con el hotspot del celular. Los alumnos entran a `http://IP-DE-LA-LAPTOP:3000` (el QR se genera con esa dirección).
3. **Nada funciona:** pon el video de respaldo y explica sobre la pantalla final.

## Evidencia (comandos reales)

| Prueba | Comando | Resultado |
|---|---|---|
| Ensayo desde un clon limpio | `git clone … && npm ci && npm test` | 65/65 pruebas, exit 0 (clon de `acd64a6`, 19 oct 04:0x) |
| Pantallas en navegador | `npx playwright test` | 14/14: proyector 7, flujo completo 1, celular 6 (después de PAS-020) |
| Flujo completo | `e2e/flow.spec.js`: proyector, 2 celulares y 5 bots en el servidor real | pasa 3 veces seguidas y contra el servidor vivo de la laptop; al recargar, el celular conserva su ahorro y no se duplica |
| Carga local | `node test/load-test.js --local --players 30 --games 3` | 3/3 partidas, 75 jugadas, latencia promedio 12.8 ms, p95 19 ms, máx 35 ms, 0 desconexiones, sin errores; movido $3,996.86 contra $4,000 en cada partida (19 oct, en esta laptop) |
| Carga en Render | `node test/load-test.js https://pasala-xxxx.onrender.com --players 30 --games 1` | pendiente: la corre el presentador después de crear el servicio |

## Checklist del día (IDEA §10)

- [ ] Abrir la página del presentador 5 minutos antes.
- [ ] Verificar que el QR se lee desde el fondo del salón.
- [ ] Elegir el caso que coincide con la diapositiva.
- [ ] Ronda de práctica de 1 minuto.
- [ ] Rondas con PMC 0.50 y PMC 0.75; comparar k = 2 contra k = 4.
- [ ] Cierre: lo que se movió ≈ k × inversión.
