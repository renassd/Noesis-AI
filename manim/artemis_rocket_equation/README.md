# Artemis II — La ecuación ideal del cohete (Manim CE)

Reconstrucción animada, en Manim Community Edition, del video original sobre
la misión Artemis II y la deducción de la **ecuación ideal del cohete
(Tsiolkovsky)**. No es una copia plano a plano: cada escena del original se
analizó, se identificó la idea física central que comunica, y se rediseñó
con una estética más cinematográfica, colores con significado físico
consistente y animaciones que muestran el álgebra *transformándose* en lugar
de cortar entre tarjetas estáticas.

---

## 1. Análisis del video original (Fase 1)

El video original (38.8 s, vertical 1080×1920) sigue esta estructura:

| # | Contenido original | Concepto físico | Elementos clave |
|---|---|---|---|
| 1 | Tarjeta de título estática "Artemis II" + captura fija del gráfico de trayectoria de retorno libre de la NASA | Contexto de la misión: trayectoria Tierra–Luna de "retorno libre" | Tierra, Luna, trayectoria translunar, escala (~384 400 km) |
| 2 | Dos fotografías estáticas del despegue | Lanzamiento / fase propulsada | Cohete, torre de lanzamiento, llama |
| 3 | Boceto a mano de un cohete sobre un fondo de garabatos de tiza, con vectores dibujados a mano | Diagrama de cuerpo libre de un "cohete ideal" | Masa M, velocidad u, aceleración a, velocidad de escape v, masa eyectada dm, presión/área de tobera (p, p₀, A) |
| 4 | Pizarra con la deducción algebraica completa por conservación de momento, escrita y borrada en bloques | Conservación del momento lineal para un sistema de masa variable | p(t), p(t+dt), expansión, descarte de dm·du, Δp = M du − v dm, F = (p−p₀)A − Mg cosθ, impulso = Δp |
| 5 | Continuación de la pizarra: definición de V_eq y sustitución | Empuje de momento + empuje de presión = velocidad de escape equivalente | V_eq = (p−p₀)A/ṁ + v, dm = −dM, M du = −V_eq dM |
| 6 | Pizarra final: integración y resultado | Ecuación de Tsiolkovsky | Δv = V_eq ln(m_i/m_f) |

**Debilidades identificadas** (oportunidades de mejora):
- Imágenes estáticas (lanzamiento, gráfico de trayectoria) sin movimiento ni
  contexto espacial.
- Boceto del cohete dibujado a mano, con vectores y colores inconsistentes
  entre escenas, sobre un fondo de garabatos que distrae.
- Cortes abruptos entre pasos algebraicos: el espectador debe releer cada
  tarjeta nueva en lugar de seguir visualmente la transformación.
- Sin codificación de color: la misma magnitud (p. ej. la masa M) cambia de
  color o estilo entre pizarras.
- Ninguna conexión visual entre la abstracción algebraica (dm, du, v) y lo
  que físicamente ocurre en el cohete.
- Sin "demostración" final: la ecuación de Tsiolkovsky se presenta sin
  mostrar *por qué* el logaritmo implica rendimientos decrecientes.

---

## 2. Mejoras propuestas (Fase 2)

1. **Paleta de color persistente** (`utils/palette.py`): cada magnitud física
   tiene un color fijo en *todas* las escenas — masa = azul, velocidad =
   verde, velocidad de escape = naranja, fuerza/empuje = amarillo, presión =
   morado, gravedad = gris, resaltado = dorado, términos despreciados = rojo.
   Esto crea una "gramática visual" estilo 3Blue1Brown.

2. **Cohete vectorial reutilizable** (`utils/rocket.py`): un mismo
   `VGroup` con cuerpo, ventana, aletas, cono y llama animada
   (`always_redraw` + `ValueTracker`), usado en las 6 escenas, en vez del
   boceto a mano. Se mantiene "rotation-aware": vectores y llama se anclan
   correctamente a la tobera/nariz incluso tras rotar el cohete.

3. **Transformaciones algebraicas en vivo**: en lugar de cortar entre
   tarjetas, cada paso usa `TransformMatchingTex`, `TransformMatchingShapes`
   o `TransformFromCopy` para que los términos *migren* visualmente de una
   ecuación a la siguiente (p. ej. `p(t+dt)` se reorganiza en `Δp = M du − v dm`
   delante del espectador).

4. **Diagramas "antes/después"**: la deducción de momento (escena 4) se
   apoya en un par de iconos de cohete en los instantes *t* y *t+dt*, con la
   masa eyectada `dm` y su velocidad `(u−v)` dibujadas explícitamente — algo
   que el original solo describe en palabras.

5. **Visualización física de V_eq** (escena 5): los dos componentes del
   empuje (momento `ṁv` y presión `(p−p₀)A`) se dibujan como vectores en la
   tobera y se *combinan* en el vector resultante `V_eq·ṁ`, antes de escribir
   la definición — el original solo da la fórmula.

6. **Tanque de combustible animado** (`ValueTracker` + `always_redraw`):
   hace tangible la sustitución `dm = −dM` mostrando el nivel de combustible
   bajando en tiempo real.

7. **Demostración final interactiva** (escena 6): un único `ValueTracker`
   (la razón de masas `m_i/m_f`) controla simultáneamente: el nivel del
   tanque, la longitud del vector de velocidad del cohete, el valor numérico
   de `Δv` y un punto que recorre la curva `Δv/V_eq = ln(m_i/m_f)` — dejando
   ver visualmente los "rendimientos decrecientes" del logaritmo.

8. **Cinemática de cámara sin penalizar el rendimiento**: la escena de
   lanzamiento simula una cámara que asciende desplazando el "mundo" (cielo,
   torre, cohete) hacia abajo mientras un fondo espacial con estrellas
   aparece en superposición — el mismo efecto narrativo que mover una cámara,
   pero mucho más rápido de renderizar.

9. **Tono consistente en español**, con notas que indican explícitamente qué
   simplificaciones se hacen y por qué (se desprecia la resistencia del aire,
   se desprecia el peso frente al empuje, dm·du ≈ 0).

---

## 3. Estructura del proyecto

```
manim/artemis_rocket_equation/
├── README.md                  <- este archivo
├── utils/
│   ├── palette.py              # paleta de colores compartida
│   ├── rocket.py                # cohete + llama reutilizables
│   └── scenery.py               # estrellas, Tierra, Luna, trayectoria de retorno libre
└── scenes/
    ├── scene_01_intro.py            # IntroScene
    ├── scene_02_launch.py           # LaunchScene
    ├── scene_03_free_body.py        # FreeBodyDiagramScene
    ├── scene_04_momentum.py         # MomentumConservationScene
    ├── scene_05_thrust.py           # ThrustEquationScene
    └── scene_06_tsiolkovsky.py      # TsiolkovskyScene
```

Cada archivo de escena agrega la raíz del proyecto a `sys.path` para poder
importar `utils` aunque Manim ejecute el archivo de forma independiente.

---

## 4. Plan de reconstrucción escena por escena

| Escena | Clase | Reemplaza (original) | Idea central | Duración aprox. (calidad baja) |
|---|---|---|---|---|
| 1 | `IntroScene` | Título estático + captura de trayectoria | Contexto: Artemis II viaja a la Luna por una trayectoria de retorno libre; el cohete necesita una fuente de propulsión | ~21 s |
| 2 | `LaunchScene` | Dos fotos de despegue | El cohete despega; "¿qué hace esto posible?" → gancho hacia la física | ~9 s |
| 3 | `FreeBodyDiagramScene` | Boceto a mano | Diagrama de cuerpo libre del "cohete ideal": M, u, a, v, dm, A, p | ~13 s |
| 4 | `MomentumConservationScene` | Pizarra 1 | Conservación de momento → Δp = M du − v dm → ecuación de movimiento | ~24 s |
| 5 | `ThrustEquationScene` | Pizarra 2 | Empuje de momento + empuje de presión = V_eq; sustitución dm = −dM | ~20 s |
| 6 | `TsiolkovskyScene` | Pizarra 3 | Integración → Δv = V_eq ln(m_i/m_f) + demo en vivo de rendimientos decrecientes | ~22 s |

Duración total combinada (a 480p15, calidad de desarrollo): ≈ 109 s. A
calidad alta (`-qh`, 1080p60) la duración en segundos es la misma; solo
cambian resolución y framerate.

---

## 5. Instrucciones de renderizado

### Requisitos

- Python 3.10+ con `manim` (Community Edition) instalado: `pip install manim`
- LaTeX (para `MathTex`): `texlive-latex-base texlive-latex-extra
  texlive-fonts-extra texlive-science texlive-fonts-recommended dvisvgm`
- `ffmpeg`

### Renderizar una escena individual

Desde `manim/artemis_rocket_equation/`:

```bash
# Vista previa rápida (480p15) -- recomendado durante desarrollo
manim -ql --media_dir media scenes/scene_01_intro.py IntroScene

# Calidad final (1080p60)
manim -qh --media_dir media scenes/scene_01_intro.py IntroScene
```

Sustituye el archivo y la clase según la escena:

| Archivo | Clase |
|---|---|
| `scenes/scene_01_intro.py` | `IntroScene` |
| `scenes/scene_02_launch.py` | `LaunchScene` |
| `scenes/scene_03_free_body.py` | `FreeBodyDiagramScene` |
| `scenes/scene_04_momentum.py` | `MomentumConservationScene` |
| `scenes/scene_05_thrust.py` | `ThrustEquationScene` |
| `scenes/scene_06_tsiolkovsky.py` | `TsiolkovskyScene` |

### Renderizar todas las escenas y concatenarlas

```bash
cd manim/artemis_rocket_equation
for f in scenes/scene_0{1,2,3,4,5,6}_*.py; do
  cls=$(grep -oP 'class \K\w+(?=\(.*Scene\))' "$f")
  manim -qh --media_dir media "$f" "$cls"
done

# Crear lista de archivos para ffmpeg (ajusta las rutas si cambia la resolución)
printf "file '%s'\n" media/videos/*/1080p60/*.mp4 > media/concat_list.txt
ffmpeg -f concat -safe 0 -i media/concat_list.txt -c copy media/artemis_rocket_equation_full.mp4
```

### Notas

- Las escenas se desarrollaron y verificaron en formato 16:9 (config. por
  defecto de Manim) por velocidad de iteración. Si se requiere el formato
  vertical 9:16 del video original, agrega un `manim.cfg` en esta carpeta con:

  ```ini
  [CLI]
  pixel_width = 1080
  pixel_height = 1920
  frame_width = 8.0
  ```

  y revisa el posicionamiento de los elementos que usan `to_edge`/`next_to`
  con desplazamientos horizontales grandes (escenas 3, 5 y 6), ya que un
  marco más estrecho puede requerir reducir esos desplazamientos.
- Todas las escenas usan `self.camera.background_color = pal.SPACE_BG` para
  un fondo consistente "espacio profundo".
