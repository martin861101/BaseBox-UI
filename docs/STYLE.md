# Datta Able Bootstrap Style Implementation

## 1. Core Architecture

- **Design System**: Component-based UI toolkit
- **Layout Approach**: Responsive, fluid grid system (12-column)
- **Preprocessor**: SCSS used for styling variables, mixins, and theme generation.

## 2. Color System

The template utilizes a standardized color palette across components, relying heavily on SCSS variables for theme consistency.

### Backgrounds & Surfaces

- **Sidebar**: Toggleable Light / Dark themes.
- **Navigation Bar & Footer**: Fixed (`#96D4BF`), Scrolling variants.
- **Cards & Containers**: White (`#FFFFFF`) with subtle, soft box-shadows and border-radius.

### Text Colors

- **Headings (`<h1>` to `<h6>`)**: `#737373`
- **Body Text (`<body>`, `<p>`)**: `#3A3A3A`
- **Homepage Headings & Subtitles (on dark background)**: `#A7A6A6`
- **Page Headings (on light background)**: `#E6F5F0`

### Accents & Interactions

- **Primary / Theme Color**: Inherits from predefined presets (supports dynamic switching).
- **Buttons & Action Links**: `#00C853` (Default success/action accent).
- **Navigation Links**: `#FF602E` (Fixed Nav), `#96C9D4` (Scrolling Nav).

## 3. Typography

- **Font Stack**: System sans-serif, heavily reliant on modern web fonts (e.g., Open Sans / Roboto).
- **Scale**: Adheres to standard Bootstrap sizing metrics.
- **Weights**:
  - Light (300)
  - Regular (400) - Default body text
  - Semi-bold (600) - Subheadings and important labels
  - Bold (700) - Main headings

## 4. Layout & Structure

### Navigation Menus

- **Orientation**: Vertical (default) and Horizontal layouts.
- **Behaviors**:
  - Fixed or Scrolling header.
  - Mini Collapse Menu (sidebar retracts to icon-only view).
- **Direction**: Full LTR and RTL support.

### Page Grid

- **Container**: Choice between Full-width (fluid) or Fixed-width layouts.
- **Widgets**: Grid, Masonry, and Advanced dynamic positioning layouts.

## 5. UI Components

### Buttons, Badges, & Indicators

- **Styles**: Solid, Outline, and Gradient background configurations.
- **Sizing**: Follows standard `sm`, `md`, `lg` classes.
- **States**: Hover states deepen the background color; active states add an inset shadow.

### Cards & Panels

- **Structure**: Clean headers separated by a thin border or padding, flat body, no heavy exterior borders.
- **Elevation**: Driven by CSS box-shadow rather than borders to create depth.

### Forms & Inputs

- **Base Elements**: Text inputs, Input Groups, Checkboxes, Radios, and customized Switches.
- **Advanced Options**: Dropzone / Uppy file uploads, Mega Options, and WYSIWYG editors (TinyMCE, Quill, CKEditor).
- **Styling**: Inputs feature a standard 1px solid border, subtle focus rings, and transition effects.

### Data & Tables

- **Styles**: Basic, Bordered, Sizing tables, and Custom styled headers.
- **Functionality**: Support for advanced initialization (DataTables API, custom data sources, pagination).

### Navigation & Extras

- **Breadcrumbs & Pagination**: Minimalist design, inheriting accent colors for active states.
- **Tabs & Pills**: Clean underline active states for tabs; rounded pill designs for segmented controls.
- **Icons**: Primary integration with **Feather Icons**, supplemented by FontAwesome.
