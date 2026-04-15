# Noesis AI — Setup del Backend

## 1. Instalá las dependencias

```bash
npm install @supabase/supabase-js
```

## 2. Conseguí tus API keys

### Anthropic
1. Entrá a https://console.anthropic.com
2. Creá una cuenta
3. Andá a **API Keys** → **Create Key**
4. Copiá la key (empieza con `sk-ant-...`)

### Supabase
1. Entrá a https://supabase.com → **New project**
2. Elegí nombre, contraseña y región (cualquiera)
3. Esperá que se cree (1-2 min)
4. Andá a **Settings → API** y copiá:
   - `Project URL`
   - `anon public` key
   - `service_role` key (hacé clic en "Reveal")

## 3. Configurá el .env.local

Editá el archivo `.env.local` en la raíz del proyecto:

```env
ANTHROPIC_API_KEY=sk-ant-tu-key-acá
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...tu-service-role-key
```

## 4. Creá las tablas en Supabase

1. En tu proyecto de Supabase, andá a **SQL Editor**
2. Copiá todo el contenido de `supabase-schema.sql`
3. Pegalo y hacé clic en **Run**
4. Deberías ver "Success" — eso crea las tablas `decks` y `flashcards`

## 5. Copiá los archivos al proyecto

```
app/
  api/
    ai/
      route.ts          ← API route para Anthropic
    decks/
      route.ts          ← GET y POST de mazos
      [id]/
        route.ts        ← DELETE y PATCH de mazo individual
  workspace/
    page.tsx            ← workspace actualizado

components/
  FlashcardGenerator.tsx
  FlashcardStudy.tsx    ← este no cambió
  TutorMode.tsx
  ResearchMode.tsx
  MyDecks.tsx

lib/
  supabase.ts           ← cliente server-side
  supabase-browser.ts   ← cliente browser (por si lo necesitás)
  useDecks.ts           ← hook que reemplaza localStorage
```

También agregá al final de `workspace.css` el contenido de `workspace-extra.css`.

## 6. Correlo

```bash
npm run dev
```

Abrí http://localhost:3000/workspace y probá generar flashcards.

---

## Cómo funciona el sistema de usuarios

Por ahora usamos un **ID de usuario anónimo** generado automáticamente y guardado en `localStorage` del browser. Esto significa:
- Cada browser tiene su propio "usuario"
- Los mazos persisten en la base de datos aunque recargues la página
- Si abrís desde otro browser o dispositivo, no vas a ver los mismos mazos

Para una autenticación real con login (Google, email, etc.), el próximo paso sería agregar **Supabase Auth**.
