# EdifiSaaS - Gestión Financiera para Condominios

Sistema SaaS completo que reemplaza el Google Apps Script original.

## Despliegue
- Backend → Vercel (carpeta `backend`)
- Frontend → Vercel (carpeta `frontend`)
- Base de datos → Supabase

## Variables de entorno
Copiar `.env.example` → `.env` y completar.

## Scripts
```bash
cd backend && npm install && npm run build
cd frontend && npm install && npm run dev
```

## Estructura del Proyecto

```
edifisaas/
├── frontend/           ← React + Vite
│   ├── src/
│   │   ├── pages/      ← index.tsx, dashboard.tsx, register.tsx, login.tsx, demo.tsx
│   │   ├── services/   ← api.ts
│   │   └── App.tsx
│   ├── vite.config.ts
│   ├── package.json
│   └── index.html
├── backend/            ← Vercel Serverless
│   ├── api/
│   │   ├── sync/
│   │   ├── dashboard/
│   │   ├── recibos/
│   │   ├── egresos/
│   │   ├── gastos/
│   │   ├── control-diario/
│   │   ├── alertas/
│   │   └── tasa-cambio/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── utils.ts
│   │   ├── scraping.ts
│   │   └── services/syncService.ts
│   ├── package.json
│   └── vercel.json
├── supabase/
│   └── schema.sql
├── .env.example
└── README.md
```
