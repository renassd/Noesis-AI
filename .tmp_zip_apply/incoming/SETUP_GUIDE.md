# Setup guide — cambios aplicados

## Archivos modificados / creados

| Archivo | Qué cambió |
|---|---|
| `app/page.tsx` | Validación real de email, envío a API real, waitlist section rediseñada |
| `app/api/waitlist/route.ts` | Nuevo — API route que envía a neuvraai@gmail.com via Resend |
| `app/FlashcardGenerator.tsx` | Soporte de imágenes ilustrativas por card |
| `app/landing-patch.css` | Nuevo — estilos para waitlist split, error de validación, image strip |

---

## 1. Validación de email — cómo probar

Sin configuración adicional. Probá en la landing:

- `@` solo → error: "That doesn't look like a valid email"
- `user@` → error (sin dominio)
- `user@domain` → error (sin TLD)
- `user@domain.com` → válido, pasa
- `user+tag@sub.domain.co.uk` → válido, pasa
- campo vacío → error: "Please enter your email address"
- La validación corre en el cliente (onBlur + onSubmit) Y en el servidor

---

## 2. Envío real de early access — configuración requerida

### Opción recomendada: Resend (gratis, sin tarjeta)

1. Crear cuenta en https://resend.com (plan gratuito: 100 emails/día)
2. En el dashboard de Resend → API Keys → Create API Key
3. Agregar al `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=onboarding@resend.dev
NOTIFICATION_TO_EMAIL=neuvraai@gmail.com
```

**Nota sobre `RESEND_FROM_EMAIL`:**
- En el plan gratuito de Resend, el from debe ser `onboarding@resend.dev` (dominio compartido de Resend)
- Para usar tu propio dominio (`noreply@neuvraai.com`) necesitás verificar el dominio en Resend → Domains → Add Domain
- El email de notificación LLEGA a `neuvraai@gmail.com` de todas formas

4. Reiniciar el servidor: `npm run dev`

### Sin configurar RESEND_API_KEY

La app funciona igual en la UI — el usuario ve el mensaje de éxito. El email no se envía pero se loguea en consola:
```
[waitlist] RESEND_API_KEY not set. Email not sent. { email: 'us***@example.com' }
```

---

## 3. Waitlist section rediseñada — verificar

- Layout split dos columnas (copy izquierda, form derecha)
- En mobile: colapsa a 1 columna automáticamente
- Orb decorativo en esquina superior derecha (CSS puro)
- Lista de features con puntos azules
- Trust signals con checkmarks verdes
- Dark mode totalmente adaptado

---

## 4. Imágenes en flashcards — cómo funciona

- El prompt a la IA incluye instrucciones para agregar `imagePrompt` en 0–3 cards cuando tenga sentido pedagógico real (diagramas, mapas, estructuras)
- Las imágenes se obtienen de Unsplash Source API (sin API key, gratis para baja frecuencia)
- Se muestran como un strip debajo de la tarjeta, no dentro — no rompe el flip
- Si la imagen no carga o falla: el strip desaparece silenciosamente
- Las tarjetas sin imagen funcionan exactamente igual que antes

### Para testear imágenes
Pegar texto con contenido visual-friendly, por ejemplo:
- "The human heart has four chambers: left ventricle, right ventricle, left atrium, right atrium..."
- "The water cycle consists of evaporation, condensation, precipitation..."
- "The cell membrane is a phospholipid bilayer..."

### Limitación conocida
Unsplash Source API está siendo deprecado lentamente. Para producción robusta,
reemplazar `fetchIllustration()` en `FlashcardGenerator.tsx` con:
- Unsplash API oficial (gratis, 50 req/hr con API key)
- O cualquier otro servicio de imágenes stock

---

## Import en layout.tsx

Agregar en `app/layout.tsx` después de los imports CSS existentes:

```tsx
import "./landing-patch.css";
```
