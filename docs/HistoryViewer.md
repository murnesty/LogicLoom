History Viewer

Goal
1. The UI page is a map. On top or bottom has a timeline from b.c. to present. Then there is a slider to select a year or range of years. 
1. When a year or range of years is selected, the map shows historical events that occurred during that time period.
1. The historical events are represented as markers on the map. Clicking on a marker shows more information about the event, including images, descriptions, and links to further reading.
1. Im not sure to show as a marker or a shaded area the spread of empires, plagues, religions, etc. over time.
1. So something like https://worldhistoryatlas.com/ but with a timeline slider to select years.
1. But I want to know the whole world. like how arab/islamic empires spread, how the black death spread, how christianity spread, how the roman empire spread, etc. At the same times what happened in china, etc. The 7 civilizations. 
1. So the map is interactive and you can zoom in and out, pan around, and click on markers to learn more about specific events.
1. The timeline slider allows users to select specific years or ranges of years to see how historical events unfolded over time.
1. The goal is to create an engaging and educational experience that allows users to explore history in a visual and interactive way.
1. So the user able to see overall patterns and trends in history, as well as specific events and details.
1. There are multiple feature like
	1. Search function to find specific events or locations on the map.
	1. Filters to show or hide certain types of events (e.g., wars, cultural events, scientific discoveries).
	1. Ability to save favorite events or locations for future reference.
	1. Integration with social media to share interesting events or discoveries with friends.
	1. Educational resources and links to further reading for users who want to learn more about specific events or time periods.

---

# Technical Planning: ASP.NET Backend + React Frontend

## Recommended Folder Structure

```
LogicLoom/
├── src/
│   ├── Api/                        # ASP.NET Core Web API (C#)
│   │   ├── Controllers/
│   │   ├── Models/
│   │   ├── Data/                   # DbContext, Migrations
│   │   ├── Services/               # Business logic
│   │   ├── Dtos/                   # Data Transfer Objects
│   │   ├── Program.cs
│   │   └── Api.csproj
│   └── Shared.Contracts/           # Shared DTOs (optional)
├── frontend/                       # React + TypeScript
│   ├── public/
│   ├── src/
│   │   ├── components/             # Map, Timeline, EventDetails, etc.
│   │   ├── hooks/
│   │   ├── services/               # API calls
│   │   ├── types/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── tsconfig.json
├── docker/                         # Docker configs (optional)
├── docs/                           # Documentation
├── .gitignore
├── README.md
└── docker-compose.yml              # For local dev orchestration
```

## Backend (ASP.NET Core)
- **Framework:** ASP.NET Core Web API (.NET 8+)
- **Libraries:**
  - Entity Framework Core (database)
  - Swashbuckle/Swagger (API docs)
  - AutoMapper (DTO mapping)
  - MediatR (CQRS, optional)
  - Authentication (JWT, Identity, etc.)
- **Structure:**
  - `Controllers/` for API endpoints
  - `Models/` for EF Core entities
  - `Dtos/` for data transfer objects
  - `Services/` for business logic
  - `Data/` for DbContext and migrations

## Frontend (React + TypeScript)
- **Framework:** React (with Vite or Create React App)
- **Libraries:**
  - react, react-dom, react-router-dom
  - typescript
  - axios (API calls)
  - leaflet or mapbox-gl (interactive maps)
  - recharts or d3 (timeline/visualizations)
  - zustand, recoil, or redux (state management, optional)
  - mui (Material UI) or antd (UI components)
- **Components:**
  - `MapView` (interactive map)
  - `TimelineSlider` (year/range selection)
  - `EventMarker` / `EmpireArea` (map overlays)
  - `EventDetails` (modal/popup for event info)
  - `SearchBar`, `Filters`, `Favorites`
  - `App`, `Layout`, `Header`, `Footer`

## Docker & Local Development
- Docker is **optional** for local dev. You can run backend (`dotnet run`) and frontend (`npm run dev`) separately.
- Use SQLite for local DB (no setup needed), or install PostgreSQL/MySQL directly if needed.

## Licensing & Cost
- All recommended libraries are free and open source (MIT/Apache/BSD).
- Use Leaflet + OpenStreetMap for fully free maps (no API key or usage cost).
- Railway, Vercel, Netlify, and GitHub Pages all have free tiers for hobby projects.
- No license issues for personal/hobby use if you stick to mainstream open source libraries.

---