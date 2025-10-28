# Common Styles Guide

This document explains the common style components used throughout the application for consistent design.

## 📦 Common Components

All common components are located in `client/src/components/common/`

### 1. PageContainer

Provides consistent page layout with proper spacing and responsive design.

**Usage:**
```jsx
import { PageContainer } from '../components/common';

<PageContainer>
  {/* Your page content */}
</PageContainer>

// Full width variant
<PageContainer fullWidth>
  {/* Your page content */}
</PageContainer>
```

**Props:**
- `children` (ReactNode): Page content
- `fullWidth` (boolean): Removes max-width constraint
- `className` (string): Additional CSS classes

### 2. PageHeader

Consistent page headers with title, subtitle, icon, and optional actions.

**Usage:**
```jsx
import { PageHeader } from '../components/common';
import { Car } from 'lucide-react';

<PageHeader
  title="My Page Title"
  subtitle="Optional subtitle"
  icon={<Car className="h-8 w-8" />}
  actions={
    <button className="btn-primary">Action</button>
  }
/>
```

**Props:**
- `title` (string): Main page title
- `subtitle` (string): Optional subtitle
- `icon` (ReactNode): Optional icon
- `actions` (ReactNode): Optional action buttons
- `dark` (boolean): Use dark theme

### 3. Card

Reusable card component for content sections.

**Usage:**
```jsx
import { Card } from '../components/common';

<Card title="Card Title">
  {/* Card content */}
</Card>

// With header actions
<Card
  title="Card Title"
  headerActions={
    <button className="btn-primary">Edit</button>
  }
>
  {/* Card content */}
</Card>

// Without padding
<Card noPadding>
  {/* Card content */}
</Card>
```

**Props:**
- `children` (ReactNode): Card content
- `title` (string): Optional card title
- `headerActions` (ReactNode): Optional header actions
- `className` (string): Additional CSS classes
- `noPadding` (boolean): Removes padding from content

### 4. EmptyState

Consistent empty state messages.

**Usage:**
```jsx
import { EmptyState } from '../components/common';
import { Car } from 'lucide-react';

<EmptyState
  icon={<Car className="h-16 w-16" />}
  title="No results found"
  message="Try adjusting your search criteria"
  actionText="Browse All"
  actionLink="/browse"
/>

// Or with custom action handler
<EmptyState
  title="No items"
  message="Get started by adding your first item"
  actionText="Add Item"
  onAction={() => console.log('Add item')}
/>
```

**Props:**
- `icon` (ReactNode): Optional icon
- `title` (string): Main message
- `message` (string): Detailed message
- `actionText` (string): Optional action button text
- `actionLink` (string): Optional action button link
- `onAction` (Function): Optional action button click handler

### 5. LoadingSpinner

Consistent loading indicators.

**Usage:**
```jsx
import { LoadingSpinner } from '../components/common';

// Full screen loading
<LoadingSpinner fullScreen text="Loading..." />

// Inline loading
<LoadingSpinner size="md" />

// Small loading
<LoadingSpinner size="sm" />

// Large loading
<LoadingSpinner size="lg" text="Please wait..." />
```

**Props:**
- `fullScreen` (boolean): Centers spinner in full screen
- `size` (string): Size of spinner ('sm', 'md', 'lg')
- `text` (string): Optional loading text

## 🎨 Global Styles

### Color Palette

The application uses a consistent color palette defined in `tailwind.config.js`:

- **Primary (Blue):** `blue-600`, `blue-700`
- **Secondary (Gray):** `gray-50` to `gray-900`
- **Accent (Yellow):** `yellow-400`, `yellow-500`
- **Success (Green):** `green-100` to `green-800`
- **Error (Red):** `red-100` to `red-800`
- **Warning (Yellow):** `yellow-100` to `yellow-800`

### Typography

- **Font Family:** `'Inter', sans-serif` (via Google Fonts)
- **Headings:**
  - H1: `text-3xl font-bold text-gray-900`
  - H2: `text-2xl font-semibold text-gray-900`
  - H3: `text-lg font-semibold text-gray-900`
- **Body:** `text-base text-gray-700`
- **Subtitles:** `text-gray-600`

### Common CSS Classes

Defined in `client/src/index.css`:

**Buttons:**
```css
.btn-primary    /* Blue background, white text */
.btn-secondary  /* Yellow background, dark text */
.btn-outline    /* White background, blue border */
```

**Form Elements:**
```css
.input-field    /* Standard input styling */
```

**Animations:**
```css
.animate-fadeIn     /* Fade in from bottom */
.animate-slideIn    /* Slide in from right */
.animate-spin       /* Rotating animation */
```

## 📱 Responsive Design

All components follow mobile-first responsive design:

- **Mobile:** Default styles
- **Tablet:** `md:` prefix (≥768px)
- **Desktop:** `lg:` prefix (≥1024px)
- **Large Desktop:** `xl:` prefix (≥1280px)

## 🚀 Best Practices

### 1. Always Use Common Components

**❌ Don't:**
```jsx
<div className="min-h-screen bg-gray-50">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h1 className="text-3xl font-bold text-gray-900 mb-2">Title</h1>
    <p className="text-gray-600">Subtitle</p>
    {/* content */}
  </div>
</div>
```

**✅ Do:**
```jsx
<PageContainer>
  <PageHeader title="Title" subtitle="Subtitle" />
  {/* content */}
</PageContainer>
```

### 2. Use Card for Content Sections

**❌ Don't:**
```jsx
<div className="bg-white rounded-lg shadow-md">
  <div className="px-6 py-4 border-b">
    <h3>Card Title</h3>
  </div>
  <div className="p-6">
    {/* content */}
  </div>
</div>
```

**✅ Do:**
```jsx
<Card title="Card Title">
  {/* content */}
</Card>
```

### 3. Use EmptyState for No Results

**❌ Don't:**
```jsx
<div className="text-center py-12">
  <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results</h3>
  <p className="text-gray-600">Try again</p>
</div>
```

**✅ Do:**
```jsx
<EmptyState
  icon={<Car className="h-16 w-16" />}
  title="No Results"
  message="Try again"
/>
```

### 4. Use LoadingSpinner for Loading States

**❌ Don't:**
```jsx
<div className="min-h-screen flex items-center justify-center">
  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
</div>
```

**✅ Do:**
```jsx
<LoadingSpinner fullScreen text="Loading..." />
```

## 🎯 Example Page Template

Here's a complete example of a well-styled page using all common components:

```jsx
import React from 'react';
import { useQuery } from 'react-query';
import { Car } from 'lucide-react';
import { PageContainer, PageHeader, Card, EmptyState, LoadingSpinner } from '../components/common';
import { apiService } from '../services/api';
import { useTranslation } from 'react-i18next';

const MyPage = () => {
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery('myData', () => apiService.getData());

  if (isLoading) {
    return <LoadingSpinner fullScreen text={t('common.loading')} />;
  }

  if (error) {
    return (
      <PageContainer>
        <EmptyState
          title={t('errors.loadingFailed')}
          message={t('errors.tryAgain')}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title={t('myPage.title')}
        subtitle={t('myPage.subtitle')}
        icon={<Car className="h-8 w-8" />}
        actions={
          <button className="btn-primary">
            {t('myPage.action')}
          </button>
        }
      />

      {!data || data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Car className="h-16 w-16" />}
            title={t('myPage.noData')}
            message={t('myPage.noDataMessage')}
            actionText={t('myPage.addData')}
            actionLink="/add"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.map((item) => (
            <Card key={item.id} title={item.name}>
              {/* Item content */}
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
};

export default MyPage;
```

## 📚 Updated Pages

The following pages have been refactored to use common components:

- ✅ **MyBookings** - Uses PageContainer, PageHeader, Card, EmptyState, LoadingSpinner
- ✅ **Settings** - Uses PageContainer, PageHeader, Card
- ✅ **AdminDashboard** - Uses PageContainer, PageHeader, Card, EmptyState, LoadingSpinner

## 🔄 Migration Checklist

When refactoring a page to use common components:

- [ ] Replace `<div className="min-h-screen bg-gray-50">` with `<PageContainer>`
- [ ] Replace page header markup with `<PageHeader>`
- [ ] Replace card markup with `<Card>`
- [ ] Replace empty state markup with `<EmptyState>`
- [ ] Replace loading spinners with `<LoadingSpinner>`
- [ ] Import common components: `import { ... } from '../components/common'`
- [ ] Remove duplicate styling classes
- [ ] Test responsive design
- [ ] Verify translations work correctly

---

**Created:** 2025-01-28
**Last Updated:** 2025-01-28

