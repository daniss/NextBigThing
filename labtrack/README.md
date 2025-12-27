# LabTrack

French lab data importer for the Lucis ecosystem. Import your PDF lab reports, visualize biomarker trends, and understand your health history.

## Features

- 📄 **PDF Import** - Upload French lab PDFs from Biogroup, Synlab, Cerballiance
- 🔍 **AI-Powered OCR** - Automatic extraction using Mistral OCR
- 📊 **Trend Visualization** - See your biomarkers over 10+ years
- 🔒 **Secure** - Data hosted in France with HDS-compliant infrastructure
- 📱 **Responsive** - Works on desktop and mobile

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **AI/OCR**: Mistral OCR + Mistral Small
- **Charts**: Recharts
- **Payments**: Stripe (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Mistral AI API key

### Installation

1. Clone the repository:
```bash
cd labtrack
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Configure your `.env.local` with:
   - Supabase URL and keys (from Supabase dashboard)
   - Mistral API key (from mistral.ai)

4. Set up Supabase:
   - Create a new project at supabase.com
   - Run the SQL schema from `supabase/migrations/001_initial_schema.sql`
   - Create a storage bucket named `lab-reports` (private)

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
labtrack/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/          # Login, signup pages
│   │   ├── (dashboard)/     # Protected dashboard pages
│   │   └── page.tsx         # Landing page
│   ├── components/          # React components
│   │   ├── dashboard/       # Dashboard-specific components
│   │   └── charts/          # Chart components
│   ├── lib/                 # Utilities and config
│   │   ├── supabase/        # Supabase clients
│   │   ├── biomarkers.ts    # French biomarker mappings
│   │   └── utils.ts         # Helper functions
│   └── types/               # TypeScript types
├── supabase/
│   └── migrations/          # Database schema
└── public/                  # Static assets
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables
4. Deploy

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `MISTRAL_API_KEY` | Mistral AI API key |

## License

MIT

## Support

For questions or issues, email support@labtrack.fr
