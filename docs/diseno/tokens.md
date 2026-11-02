# Tokens del sistema de diseño

Transcritos del plan §8. La implementación está en
[`src/ui/tokens.css`](../../src/ui/tokens.css) como variables CSS, para poder añadir modo oscuro
más adelante **sin tocar componentes**.

Esta página es la versión legible de ese archivo: si cambia uno, cambia el otro en el mismo PR.

## Tipografía

Desde Google Fonts, cargadas en `index.html`.

| Familia | Pesos | Para qué | Variable |
|---|---|---|---|
| **Archivo** | 500/600/700 | Títulos y cifras grandes | `--fuente-titulo` |
| **IBM Plex Sans** | 400/500/600 | Texto | `--fuente-texto` |
| **IBM Plex Mono** | 400/500/600 | Horas y datos | `--fuente-mono` |

- Títulos con `letter-spacing: -0.02em`.
- Etiquetas superiores: 11 px, mayúsculas, `letter-spacing: .14em`.

## Neutros

| Token | Variable | Valor |
|---|---|---|
| fondo | `--fondo` | `#f4f5f7` |
| superficie | `--superficie` | `#ffffff` |
| borde | `--borde` | `#d9dce3` |
| borde suave | `--borde-suave` / `--borde-suave-2` | `#e4e6eb` / `#eef0f3` |
| texto | `--texto` | `#171a21` |
| texto 2 | `--texto-2` | `#3d4350` |
| texto 3 | `--texto-3` | `#5d6472` |
| apagado | `--apagado` | `#8a919e` |

## Acentos

| Uso | Variables | Valores |
|---|---|---|
| primario | `--primario`, `--primario-hover`, `--primario-suave` | `#0f6f74`, `#0b5c60`, `#d8ecec` |
| cambio de jefatura | `--cambio-jefatura` | `#b4530b` |
| aviso | `--aviso-fondo`, `--aviso-borde`, `--aviso-texto` | `#fff8f1`, `#f0c9a3`, `#8f4108` |
| éxito | `--exito-fondo`, `--exito-texto` | `#e0efe3`, `#225532` |
| peligro | `--peligro` | `#8f1d1d` |

## Turnos

Categoría según la **hora de entrada**: antes de 12:00 mañana/día; antes de 17:00 tarde; el resto
noche. Ver [../datos/formato-hoja.md](../datos/formato-hoja.md).

| Categoría | Fondo | Texto |
|---|---|---|
| mañana/día | `#d8ecec` | `#0b5c60` |
| tarde | `#fbe8d6` | `#8f4108` |
| noche | `#f0e5f7` | `#6a3389` |
| libre | `#eceef2` | `#5d6472` |
| vacaciones | `#e0efe3` | `#2a6439` |

## Roles

Etiqueta (fondo / texto) y borde del grupo en el horario completo.

| Rol | Etiqueta | Borde de grupo |
|---|---|---|
| N1 | `#d8ecec` / `#0b5c60` | `#0f6f74` |
| N2 | `#e2ebfb` / `#2a55a1` | `#2f5fb3` |
| Supervisor | `#fbe8d6` / `#8f4108` | `#c2560f` |
| Coordinador | `#fbf0c9` / `#6b4e00` | `#a77b00` |
| Tercería | `#f0e5f7` / `#6a3389` | `#7e3fa8` |
| Producto | `#fbe3ee` / `#962057` | `#c0306f` |
| Redes | `#e7e6fb` / `#4338a8` | `#4f46e5` |
| Soporte de Salas | `#e0efe3` / `#2a6439` | `#2f7d4a` |
| QA | `#dff1f5` / `#0e5d73` | `#0e7490` |
| Activo Fijo | `#ece8e2` / `#57493a` | `#8a7d6b` |

## Sede y severidad

**Sede:** etiqueta con contorno neutro `#c4c8d0`. *Sin sede* más tenue: `#e4e6eb` / `#8a919e`.

**Severidad de conflictos:**

| Severidad | Fondo | Texto |
|---|---|---|
| alta | `#fdeaea` | `#8f1d1d` |
| media | `#fbe8d6` | `#8f4108` |
| baja | `#eceef2` | `#3d4350` |
| resuelto | `#e0efe3` | `#2a6439` |

## Forma y accesibilidad

| Qué | Valor |
|---|---|
| radio de tarjetas | 14 px |
| radio de controles | 10 px |
| radio de chips | 999 px |
| radio de etiquetas | 5 px |
| **área táctil mínima** | **44 px** |
| foco | visible en **todo** control |

## Componentes base

En `src/ui/`, pendientes de implementar. Los atributos ARIA no son opcionales:

Tag · Chip (`aria-pressed`) · Segmented (píldora deslizante) · IconButton · Button / ButtonOutline ·
Field · Drawer (lateral) · Modal · Collapsible (`aria-expanded`) · Toast (`role=status`) ·
Alert (`role=alert`) · SoonBadge.
