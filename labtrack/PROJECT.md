# LabTrack - Project Documentation

> **For AI Agents**: This document provides a complete overview of the LabTrack codebase to help you understand the project quickly.

---

## 🎯 What is LabTrack?

**LabTrack** is a French SaaS application that allows users to:
1. Import blood test PDF reports from labs (Biogroup, Synlab, Cerballiance)
2. Extract biomarker data using AI (Azure OCR + GPT-4o-mini)
3. Visualize trends over time with charts

---

## 🎨 Color Palette (MUST FOLLOW)

| Token | Hex | CSS Variable | Usage |
|-------|-----|--------------|-------|
| **Primary Yellow** | `#EAB308` | `--crx-yellow` | Main accent, CTAs |
| Yellow Light | `#FDE047` | `--crx-yellow-light` | Highlights, hover |
| Yellow Dark | `#CA8A04` | `--crx-yellow-dark` | Pressed states |
| Background | `#F5F5F7` | `--crx-bg` | Page background |
| Glass | `rgba(255,255,255,0.55)` | `--crx-glass` | Card backgrounds |
| Text Primary | `#1F2937` | `--crx-text` | Main text |
| Text Secondary | `#6B7280` | `--crx-text-secondary` | Labels |
| Text Muted | `#9CA3AF` | `--crx-text-muted` | Hints |

### Tailwind Extended Colors
```typescript
// tailwind.config.ts
crx: {
    yellow: "#EAB308",
    "yellow-light": "#FDE047",
    "yellow-dark": "#CA8A04",
}
primary: {
    500: "#EAB308", // Main
    // Full scale from 50-900 available
}
```

### Status Colors
| Status | Color |
|--------|-------|
| Normal | `#10B981` (green-500) |
| Low | `#3B82F6` (blue-500) |
| High | `#F59E0B` (amber-500) |
| Critical | `#EF4444` (red-500) |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Frontend | React 18, Tailwind CSS |
| Backend | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |
| AI/OCR | Azure Document Intelligence + Azure OpenAI GPT-4o-mini |
| Charts | Recharts |
| PDF | node-qpdf2 (decryption) |
| Deployment | Docker (Alpine + qpdf) |

---

## 📁 File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (meta, lang=fr)
│   ├── page.tsx                # Landing page
│   ├── globals.css             # Crextio theme
│   ├── (auth)/                 # Login/Signup pages
│   ├── (dashboard)/            # Protected app pages
│   │   ├── dashboard/page.tsx  # Main dashboard
│   │   ├── reports/            # Report list + detail
│   │   ├── trends/page.tsx     # Charts
│   │   ├── upload/page.tsx     # PDF upload
│   │   └── settings/page.tsx   # Profile/subscription
│   └── api/
│       ├── upload/route.ts     # PDF upload handler
│       └── export/route.ts     # CSV export
├── components/
│   └── crx-nav-server.tsx      # Navigation bar
├── lib/
│   ├── biomarkers.ts           # Category labels/colors
│   ├── utils.ts                # cn(), formatDate(), getStatusColor()
│   └── supabase/               # Client + Server helpers
├── types/
│   └── index.ts                # TypeScript interfaces
└── middleware.ts               # Auth protection
```

---

## 🗄️ Database Schema

### `profiles`
- `id` (uuid, FK → auth.users)
- `email`, `full_name`
- `subscription_status`: `free` | `premium` | `cancelled`
- `uploads_count` (int, default 0) — free tier limit is 3

### `lab_reports`
- `id` (uuid)
- `user_id`, `file_name`, `file_path`
- `lab_name`, `report_date`
- `processing_status`: `pending` | `processing` | `completed` | `failed`
- `raw_ocr_text`

### `biomarker_results`
- `id`, `lab_report_id`, `user_id`
- `biomarker_name`, `biomarker_name_normalized`, `loinc_code`
- `category`: lipid, metabolic, hematology, liver, kidney, thyroid, vitamin, etc.
- `value`, `unit`, `reference_min`, `reference_max`
- `status`: `normal` | `low` | `high` | `critical`
- `test_date`

---

## 🔄 Application Flow

1. User uploads PDF → `/api/upload`
2. If password provided → decrypt with qpdf
3. Upload to Supabase Storage
4. Create `lab_reports` record
5. Invoke `process-pdf` Edge Function
6. Azure OCR extracts text (markdown format)
7. GPT-4o-mini parses biomarkers into JSON
8. Normalize names → LOINC codes
9. Determine status (normal/low/high/critical)
10. Insert into `biomarker_results`
11. Update `lab_reports.processing_status = "completed"`

---

## 🎨 CSS Classes (Crextio Theme)

| Class | Usage |
|-------|-------|
| `crx-background` | Page wrapper with yellow blob gradients |
| `crx-bg-shapes` | Additional floating blobs |
| `crx-glass` | Glassmorphism cards (blur + white border) |
| `crx-glass-light` | Lighter glass variant |
| `crx-glass-pill` | Pill-shaped glass elements |
| `crx-glass-dark` | Dark glass (for dark panels) |
| `crx-btn-yellow` | Primary CTA button |
| `crx-pill-dark` | Dark navigation pill |
| `crx-pill-yellow` | Yellow navigation pill |
| `crx-avatar-glow` | Yellow box-shadow on avatars |
| `crx-hover` | Card hover effect |
| `crx-number` | Thin font weight for stats |
| `crx-number-bold` | Bold stats |
| `crx-label` | Secondary text labels |

---

## ⚠️ Important Notes

1. **Language**: All UI text is in **French**
2. **Auth**: Use `await supabase.auth.getUser()` (not getSession) for security
3. **Freemium**: Free users = 3 uploads max
4. **Components**: Most UI is inline in pages (sparse component library)
5. **Stripe**: Configured but not yet implemented
