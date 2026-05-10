High-Fidelity UI Design – Drug-Disease Relation System
🧭 Overall Design Style
Theme: Light, clean, professional (health-tech feel)
Primary Color: Soft blue (#3B82F6)
Accent Colors:
Drugs → Green (#22C55E)
Diseases → Red (#EF4444)
Typography: Inter / Roboto
Layout: Card-based, lots of white space, subtle shadows
🟦 1. Main Layout (App Shell)
 --------------------------------------------------------------
| 🧠 Drug-Disease KG System        🔔   👤 Brent ▼             |
 --------------------------------------------------------------
| Sidebar              | Main Content                          |
|----------------------|---------------------------------------|
| 🏠 Dashboard         |                                       |
| 📥 Data Collection   |                                       |
| ✏️ Annotation        |                                       |
| 🔗 Knowledge Graph   |                                       |
| 📊 History           |                                       |
| ⚙️ Settings          |                                       |
|                      |                                       |
 --------------------------------------------------------------
✨ Details
Sidebar: dark (slightly tinted blue-gray)
Active tab: highlighted with soft blue background
Top bar: sticky with subtle shadow
🟩 2. Data Collection Screen
Layout
[ Page Title: Data Collection ]

 --------------------------------------------------------------
| 🔍 Enter Keywords                                          |
| [ Aspirin + Headache              ] [ Fetch Tweets ]        |
 --------------------------------------------------------------

 Status: ✅ 120 Tweets Retrieved

 --------------------------------------------------------------
| Tweets                                                     |
|------------------------------------------------------------|
| 🐦 "Aspirin really helped my headache today..."            |
| 🐦 "Metformin has side effects like nausea..."             |
| 🐦 "This drug caused severe dizziness..."                  |
 --------------------------------------------------------------
✨ UI Features
Input field: rounded, soft shadow
Fetch button: primary blue, hover effect
Tweets: card list with hover highlight
Optional: pagination or infinite scroll
🟨 3. Annotation Interface (CORE UI)
Layout
[ Page Title: Annotation Interface ]

 --------------------------------------------------------------
| 🐦 Tweet                                                   |
|------------------------------------------------------------|
| "Aspirin helped my headache but caused stomach pain"       |
|                                                            |
| Highlighted:                                               |
| 🟢 Aspirin   🔴 headache   🔴 stomach pain                 |
 --------------------------------------------------------------

 --------------------------------------------------------------
| Select Relationship                                        |
|------------------------------------------------------------|
| Selected: [ Aspirin ] → [ headache ]                       |
|                                                            |
| (●) Treats                                                 |
| ( ) Causes (Side Effect)                                   |
| ( ) No Relation                                            |
|                                                            |
| [ Save Annotation ]                                        |
 --------------------------------------------------------------

 --------------------------------------------------------------
| Extracted Triplet                                          |
|------------------------------------------------------------|
| 🟢 Aspirin  — Treats → 🔴 Headache                         |
 --------------------------------------------------------------
✨ UI Features
Entities:
Green pill-shaped tags for drugs
Red pill-shaped tags for diseases
Selection:
Click → highlight with border glow
Buttons:
Rounded, primary CTA (Save)
Feedback:
Toast: “Annotation saved successfully”
🟪 4. Knowledge Graph Visualization
Layout
[ Page Title: Knowledge Graph ]

 --------------------------------------------------------------
| Filters:                                                   |
| [✔ Treats] [✔ Causes] [✔ No Relation]   Frequency [ 1 ▼ ]   |
 --------------------------------------------------------------

 --------------------------------------------------------------
|                                                            |
|             🔵 Interactive Graph Canvas                    |
|                                                            |
|   🟢 Aspirin ───── Treats ─────▶ 🔴 Headache               |
|        │                                                   |
|        └──── Causes ─────▶ 🔴 Stomach Pain                 |
|                                                            |
 --------------------------------------------------------------

 Legend:
 🟢 Drug     🔴 Disease  
 ─── Treats   ─── Causes   ─── No Relation
✨ UI Features
Graph:
Built with D3.js / Cytoscape.js
Interactions:
Hover → show tooltip
Click node → highlight connections
Controls:
Zoom + pan
Reset view button
🟥 5. Annotation History
Layout
[ Page Title: Annotation History ]

 --------------------------------------------------------------
| Search: [ Aspirin________ ]                                |
 --------------------------------------------------------------

 --------------------------------------------------------------
| Drug     | Relation  | Disease        | Date     | Actions  |
|----------|-----------|----------------|----------|----------|
| Aspirin  | Treats    | Headache       | Today    | ✏️ 🗑️   |
| Aspirin  | Causes    | Stomach Pain   | Today    | ✏️ 🗑️   |
 --------------------------------------------------------------

 [ Export JSON ]   [ Export CSV ]
✨ UI Features
Table:
Clean grid with alternating row colors
Actions:
Edit (modal popup)
Delete (confirmation dialog)
⚙️ 6. Micro-Interactions (Make it Feel Real)
Hover effects on cards & buttons
Smooth transitions (200–300ms)
Loading spinner when fetching tweets
Success/error toast notifications
Subtle shadows for depth
📱 Responsiveness
Tablet:
Sidebar collapses into icons
Mobile:
Sidebar becomes hamburger menu
Graph becomes scrollable canvas