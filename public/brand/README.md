# GomerIA.app — kit de marca

Logotipo, isotipo y recursos de aplicación y redes. La marca se compone de un
isotipo en forma de **G** con bisel, pliegue inferior y llama, más un destello
separado, y del logotipo **GomerIA.app**.

## Paleta

| Uso | Color | Hex |
| --- | --- | --- |
| Amarillo de marca | Amarillo | `#FFD400` |
| Negro de marca | Negro | `#111111` |
| Blanco (sobre negro) | Blanco | `#FFFFFF` |
| Fondo claro de la app | Crema | `#F4F2EE` |

Tipografía del logotipo: **Montserrat ExtraBold**, convertida a trazados (no hace
falta instalar la fuente para usarlo).

## Archivos

### Web

| Archivo | Uso |
| --- | --- |
| `gomeria-logo-dark.svg` | Logotipo horizontal para fondos oscuros (isotipo a color, texto blanco y `IA` amarilla). |
| `gomeria-logo-light.svg` | Logotipo horizontal para fondos claros (isotipo negro con bisel, texto negro y `.app` amarilla). |
| `gomeria-logo-on-yellow.svg` | Logotipo horizontal para fondos amarillos (silueta negra). |
| `gomeria-logo-vertical-*.svg` | Versión vertical (isotipo arriba, logotipo y `.app` debajo). |
| `logo-gomeria-dark.png` / `logo-gomeria-light.png` | PNG con transparencia (1141 × 209) para correo, documentos o CMS. |
| `gomeria-wordmark-dark.svg` / `gomeria-wordmark-light.svg` | Solo logotipo, sin isotipo. |

### Isotipo

| Archivo | Uso |
| --- | --- |
| `gomeria-isotipo.svg`, `gomeria-isotipo-dark.svg` | Isotipo a color para fondos oscuros. |
| `gomeria-isotipo-light.svg` | Isotipo negro con bisel claro para fondos claros. |
| `gomeria-isotipo-white.svg` | Isotipo blanco con bisel oscuro para fondos oscuros. |
| `gomeria-isotipo-mono.svg` | Silueta de un solo color (`currentColor`), para sellos, grabados y fondos de color. |

### App / PWA / favicons

| Archivo | Uso |
| --- | --- |
| `app-icon-192.png`, `app-icon-512.png` | Iconos PWA (`any`). |
| `app-icon-maskable-512.png`, `app-icon-maskable-1024.png` | Iconos PWA `maskable` (con zona segura). |
| `apple-touch-icon.png` | iOS (180 × 180, opaco). |
| `favicon.ico`, `favicon-16.png`, `favicon-32.png`, `favicon-48.png` | Navegador. |
| `gomeria-app-icon.svg`, `gomeria-app-icon-maskable.svg` | Iconos vectoriales. |
| `app-icon-full-512.png` | Icono con logotipo completo (tiendas, prensa). |

### Redes sociales

| Archivo | Uso |
| --- | --- |
| `og-image.png` | Open Graph / Twitter Card (1200 × 630). |
| `avatar-1024.png`, `avatar-512.png`, `avatar-400.png` | Foto de perfil (amarillo / negro). |
| `banner-linkedin-1584x396.png` | Portada de LinkedIn. |
| `brand-kit.png` | Contacto con todas las versiones. |

## Reglas rápidas

- No deformar, rotar ni recolorear el isotipo fuera de las versiones incluidas.
- Mantener un margen libre alrededor equivalente a la altura del destello.
- Sobre fondos claros, usar `gomeria-logo-light.svg` o `gomeria-isotipo-light.svg`.
- Sobre fondos oscuros, usar `gomeria-logo-dark.svg` o `gomeria-isotipo.svg`.
- Sobre fondos amarillos, usar la silueta (`gomeria-logo-on-yellow.svg`,
  `gomeria-isotipo-mono.svg`) para que el contraste sea máximo.
- El isotipo a color ya incorpora sus degradados, bisel y sombra suave; no hay
  que añadirle sombras, degradados ni contornos externos.
- Tamaño mínimo del isotipo a color: 32 px. Por debajo, usar la silueta o los
  favicons.
- No separar el destello del resto del isotipo ni cambiar su posición.

## Uso en la app

El componente `src/components/logo.tsx` dibuja el logo en SVG con identificadores
únicos por instancia (`useId`). El isotipo alterna solo con el tema del sistema:
color sobre fondo oscuro y monocromo sobre fondo claro. Los colores del logotipo
se controlan con las variables `--logo-*` de `globals.css`.

```tsx
import { Logo } from "@/components/logo";

<Logo className="h-10 w-auto" />          // logotipo completo
<Logo compact className="h-8 w-auto" />   // solo isotipo
<Logo badge={false} />                    // sin la pastilla .app
<Logo variant="color" />                  // fuerza el isotipo a color
<Logo variant="mono" />                   // fuerza el isotipo monocromo
```

El SVG lleva `role="img"` y `aria-label="GomerIA.app"`; si el logo va dentro de
un enlace con su propio texto accesible, no hace falta repetir la etiqueta.
