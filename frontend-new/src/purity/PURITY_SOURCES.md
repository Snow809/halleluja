# Purity UI Dashboard source mapping

This folder adapts pieces from the free MIT Purity UI Dashboard by Creative Tim / Simmmple:

https://github.com/creativetimofficial/purity-ui-dashboard

Adapted source files:

- `components/Card/Card.js` → `components/Card.tsx`
- `components/Card/CardBody.js` → `components/CardBody.tsx`
- `components/Card/CardHeader.js` → `components/CardHeader.tsx`
- `components/Icons/IconBox.js` → `components/IconBox.tsx`
- `components/Separator/Separator.js` → `components/Separator.tsx`
- `components/Layout/MainPanel.js` → `layouts/MainPanel.tsx`
- `components/Layout/PanelContainer.js` → `layouts/PanelContainer.tsx`
- `components/Layout/PanelContent.js` → `layouts/PanelContent.tsx`
- `components/Navbars/AdminNavbar.js` → `navbars/AdminNavbar.tsx`
- `components/Navbars/AdminNavbarLinks.js` → `navbars/AdminNavbarLinks.tsx`
- `components/Navbars/AuthNavbar.js` → `navbars/AuthNavbar.tsx`
- `components/Sidebar/SidebarHelp.js` → `components/SidebarHelp.tsx`
- Purity badge/status styling patterns → `components/StatusBadge.tsx`
- `components/Tables/TablesTableRow.js` and `DashboardTableRow.js` → `tables/PurityTable.tsx`
- `components/Tables/TimelineRow.js` → `timeline/TimelineRow.tsx`
- `components/Charts/BarChart.js` and `LineChart.js` → `charts/ApexCharts.tsx`
- `views/Dashboard/Dashboard/components/MiniStatistics.js` → `dashboard/StatCard.tsx`
- `views/Dashboard/Dashboard/components/SalesOverview.js` → `dashboard/SalesOverview.tsx`
- `views/Dashboard/Dashboard/components/Projects.js` → `tables/PurityTable.tsx`
- `views/Auth/SignIn.js` → `features/auth/LoginPage.tsx`
- `views/Dashboard/Profile/components/Header.js` → `profile/ProfileHeader.tsx`
- `views/Dashboard/Profile/components/ProfileInformation.js` → `profile/ProfileInformation.tsx`
- `views/Dashboard/Profile/components/PlatformSettings.js` → `profile/PlatformSettings.tsx`

The app-specific HR data, auth flow, routes and API calls are custom to Intelli‑Talent. The Purity green/teal accent has been replaced with the project blue theme.
