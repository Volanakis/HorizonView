# UX Consistency Rule

UI/UX consistency standards for HorizonView.

## Loading States

Always show loading state during async operations:

```html
<!-- Skeleton loader -->
<div class="loading-skeleton"></div>

<!-- Spinner -->
<div class="spinner"></div>
```

```css
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(1,116,129,.2);
  border-top-color: var(--accent-bright);
  border-radius: 50%;
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

## Empty States

Always show helpful empty states:

```html
<div class="empty-state">
  <div class="empty-icon">&#9992;</div>
  <p>No flights found</p>
</div>
```

## Error States

Show user-friendly error messages:

```html
<p class="error" x-text="errorMessage"></p>
```

## Feedback States

Use toast notifications for feedback:

```javascript
// Success
showToast('Flight created successfully', 'success');

// Error
showToast('Failed to create flight', 'error');

// Info
showToast('Logged out', 'info');
```

## Consistent Patterns

1. **Buttons**: Primary gradient, secondary outline, danger red
2. **Cards**: Dark background, subtle border, hover lift
3. **Forms**: Dark inputs, teal focus ring, error red
4. **Navigation**: Sticky header, smooth scroll
5. **Modals**: Centered, backdrop blur, close button

## Spacing

Use consistent spacing scale:

- `0.5rem` — tight
- `1rem` — default
- `1.5rem` — relaxed
- `2rem` — spacious

## Typography

- Headings: Bold, gradient for hero
- Body: Regular weight, gray-100
- Labels: Uppercase, small, accent-soft

## Color Usage

- Primary actions: `--accent-primary`
- Secondary: `--accent-bright`
- Background: `--primary-dark`
- Cards: `--primary-teal`
- Text: `--gray-100`
- Muted: `--gray-400`
