# Drug-Disease Relation Extraction & Knowledge Graph Visualization

A system for harvesting social media data, identifying medical entities, annotating drug-disease relations, and visualizing interactive knowledge graphs for pharmacovigilance.

## Features

### Data Acquisition & Preprocessing
- **Bundled Tweet Dataset**: 210+ curated tweets containing drug-disease mentions from social media
- **Real Data Import**: Upload JSON/CSV/TXT files or paste raw tweet data
- **Keyword Search**: Search by drug names, disease names, or combinations (e.g., "Aspirin + Headache")
- **Entity Recognition (NER)**: Dictionary-based NER system with 170+ drugs and 120+ diseases/symptoms from DrugBank, MedDRA, and ICD-10

### Interactive Relation Annotation Interface
- **Single Tweet Display**: Present one tweet at a time with auto-highlighted entities
- **Color-coded Entities**: Drugs highlighted in **green**, Diseases highlighted in **red**
- **Relation Labeling**: Define relationships from a predefined set:
  - ✓ **Treats** — The drug is used to treat the disease
  - ⚠ **Causes (Side Effect)** — The drug leads to the disease/symptom
  - ✗ **No Relation** — Entities appear together but have no direct link
- **Annotation Storage**: Subject-Relation-Object triplets stored in structured JSON (localStorage)

### Knowledge Graph Visualization
- **Interactive Graph**: Built with Cytoscape.js with force-directed layout
- **Node Types**: Teal nodes for Drugs, Rose nodes for Diseases (size scales with frequency)
- **Edge Types**: Blue (Treats), Orange (Causes), Gray dashed (No Relation)
- **Filtering**: Filter by relationship type and minimum entity frequency
- **Interactions**: Drag to reposition, scroll to zoom, click to trace connections, hover for tooltips

### Additional Features
- **Dashboard**: Statistics overview with Recharts visualizations (pie chart for relation distribution, bar chart for top entities)
- **Annotation History**: Search, filter, edit, and delete stored annotations
- **Data Export**: Export annotations as JSON or CSV
- **Settings**: Configurable NER confidence threshold, graph visualization preferences, auto-save behavior

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI + shadcn/ui
- **Graph Visualization**: Cytoscape.js
- **Charts**: Recharts
- **Routing**: React Router 7
- **Notifications**: Sonner

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/Realworrior/drugtweet.git
cd drugtweet

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173/`

### Production Build

```bash
npm run build
```

Output will be in the `dist/` directory.

## Project Structure

```
src/
├── main.tsx                    # Entry point
├── app/
│   ├── App.tsx                 # Root component with router
│   ├── routes.tsx              # Route definitions
│   ├── components/
│   │   ├── Layout.tsx          # App shell with sidebar navigation
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx       # Statistics overview
│   │   │   ├── DataCollection.tsx  # Tweet fetching & import
│   │   │   ├── Annotation.tsx      # Entity annotation interface
│   │   │   ├── KnowledgeGraph.tsx  # Interactive graph visualization
│   │   │   ├── History.tsx         # Annotation management
│   │   │   └── Settings.tsx        # App configuration
│   │   └── ui/                 # Reusable UI components (shadcn/ui)
│   └── utils/
│       └── api.ts              # Data layer (localStorage + optional cloud sync)
├── data/
│   ├── medical_dictionaries.ts # Drug & disease NER dictionaries
│   └── tweets_dataset.json     # Bundled tweet dataset (210+ tweets)
└── styles/
    ├── index.css               # CSS entry point
    ├── tailwind.css            # Tailwind configuration
    └── theme.css               # Design tokens & typography
```

## Usage Workflow

1. **Collect Data** → Go to Data Collection, search for keywords like "Aspirin", "diabetes", etc.
2. **Annotate** → Go to Annotation, select drug & disease entities, choose relationship type, save
3. **Visualize** → Go to Knowledge Graph to see the interactive network of drug-disease relationships
4. **Manage** → Go to History to review, edit, delete, or export your annotations

