# Design Guidelines: Energy Community Management Platform

## Design Approach
**Selected System**: Material Design-influenced financial dashboard approach, inspired by Power Ledger and MetaMask's clean, data-focused interfaces. This utility-first platform prioritizes clarity, trust, and efficient data management over visual storytelling.

**Core Principles**:
- **Data Transparency**: Clear hierarchy for financial information and token transactions
- **Trust Through Clarity**: Unambiguous display of balances, transactions, and community data
- **Role-Based Focus**: Distinct visual patterns for each user type while maintaining consistency

## Typography
**Font Stack**: Inter for all text (via Google Fonts CDN)

**Hierarchy**:
- **Dashboard Headers**: 32px/2xl, semibold (600)
- **Card Titles**: 20px/xl, semibold (600)
- **Section Headers**: 16px/base, medium (500), uppercase tracking
- **Body Text**: 14px/sm, regular (400)
- **Data Labels**: 12px/xs, medium (500), text-gray-600
- **Large Numbers (Balances)**: 36px/3xl, bold (700) for token amounts

## Layout System
**Spacing Primitives**: Use Tailwind units 2, 4, 8, 12, 16, 20 (p-2, m-4, gap-8, py-12, px-16, py-20)

**Structure**:
- **Sidebar Navigation**: Fixed 256px width (w-64), full height, with role-specific menu items
- **Main Content Area**: max-w-7xl container with px-8 py-12 padding
- **Card Grid**: grid-cols-1 md:grid-cols-2 xl:grid-cols-3 with gap-6
- **Data Tables**: Full width within containers, sticky headers on scroll

**Responsive Breakpoints**:
- Mobile: Single column, collapsible sidebar
- Tablet (md): 2-column grids where appropriate
- Desktop (xl): Full 3-column layouts for statistics cards

## Component Library

### Navigation & Layout
**Sidebar**: 
- Fixed left sidebar with user role badge at top
- Menu items with icons (Heroicons) + labels
- Active state: bg-green-50 with left border accent
- Wallet balance widget pinned at bottom

**Top Bar**:
- White background, shadow-sm
- Community selector dropdown (for coordinators)
- User profile menu (right-aligned)
- Notification bell icon with badge

### Core Components

**Balance Display Cards**:
- Large card with gradient background (green-50 to green-100)
- Token amount in 36px bold with ETH icon
- Secondary info: USD equivalent (if applicable), last updated timestamp
- Mini trend indicator (up/down arrow with percentage)

**Data Tables**:
- Striped rows (alternating white/gray-50)
- Sticky header with sorting indicators
- Row hover state: bg-gray-50
- Pagination controls at bottom
- Action buttons (icons only) in final column

**Product Cards** (Service Provider):
- White card, rounded-lg, shadow-sm
- Product image placeholder area (16:9 ratio)
- Title, price in tokens (with gold accent color)
- "Edit" button (ghost style) bottom-right

**Transaction Log**:
- Timeline-style list with connector lines
- Icon indicating transaction type (send/receive/burn)
- Amount with + or - prefix
- Timestamp and involved parties
- Expandable detail view

**CSV Upload Component**:
- Dashed border drop zone
- File icon and "Drop CSV or click to upload" text
- Preview table after upload (first 5 rows)
- Validation status badges
- Submit button only activates after validation

**Forms**:
- Floating labels for all inputs
- Input fields: border-gray-300, focus:border-blue-500, focus:ring-2 ring-blue-200
- Button hierarchy: Primary (bg-green-600), Secondary (outline), Danger (bg-red-600)
- Error messages: text-red-600, text-sm below field

### Dashboard Widgets

**Community Overview** (Coordinator):
- Stats grid: Total Users, Active Providers, Token Circulation, Pending Burns
- Each stat: Large number, label, small trend indicator
- Quick action buttons: "Add User", "Upload Funds", "Create Community"

**Marketplace Grid** (User):
- Product cards in responsive grid
- Filter sidebar (categories, price range)
- "Buy with Tokens" button on each card
- Shopping cart icon with item count

**Provider Analytics**:
- Revenue chart (line graph, 7-day view)
- Top products list
- Recent transactions table

## Images
**No Large Hero Images** - This is a dashboard application focused on data and functionality.

**Product Images**: Service providers upload product photos (16:9 aspect ratio, max 800x450px)
**User Avatars**: 40px circular avatars throughout (default: initials on colored background)
**Community Logos**: 64px square logos for community selection
**Icon Library**: Heroicons (outline style) for all UI icons

## Animations
**Minimal, Purposeful Animations**:
- Sidebar expand/collapse: 200ms ease
- Modal/drawer enter: 300ms slide-up with fade
- Table row hover: instant background change (no transition)
- Success toasts: slide-in from top-right
- Loading states: Subtle pulse on skeleton screens (avoid spinners where possible)

**NO animations on**: Data updates, balance changes, table sorting