# 🎨 Advanced Visual Effects Guide

## ✨ New Effects Added

This document covers all the advanced visual effects now available in TenderHunter.ai.

---

## 🌟 **Effect Categories**

### 1. **3D Transform Effects**

#### `.transform-3d`
Enables 3D transform space for child elements.
```jsx
<div className="transform-3d">
  <div className="hover-lift-3d">Lifts in 3D on hover</div>
</div>
```

#### `.hover-lift-3d`
Dramatic 3D lift effect with rotation.
- **Effect**: Lifts 8px, rotates slightly on X and Y axes
- **Shadow**: Deep shadow for depth
- **Use**: Premium cards, featured content

#### `.hover-tilt`
Subtle 3D tilt effect.
- **Effect**: Slight perspective rotation and scale
- **Use**: Interactive cards, buttons

---

### 2. **Neon & Glow Effects**

#### `.text-gradient-neon`
Animated neon gradient text.
- **Colors**: Cyan to magenta
- **Animation**: Pulsing brightness
- **Use**: Headings, CTAs, special announcements

#### `.hover-neon`
Neon glow on hover.
- **Effect**: Cyan and magenta glow shadows
- **Lift**: 4px upward movement
- **Use**: Buttons, links, interactive elements

#### `.neon-border`
Rotating neon border.
- **Effect**: Hue-rotating gradient border
- **Animation**: 4s rotation cycle
- **Use**: Feature boxes, premium content

#### `.glow-text`
Pulsing glow text shadow.
- **Effect**: Purple glow that pulses
- **Animation**: 2s pulse cycle
- **Use**: Important text, badges, notifications

---

### 3. **Interactive Effects**

#### `.ripple`
Material Design ripple effect.
- **Trigger**: On click/active
- **Effect**: Expanding circle from click point
- **Use**: Buttons, clickable cards

```jsx
<button className="ripple bg-blue-500">
  Click me!
</button>
```

#### `.magnetic`
Magnetic hover effect.
- **Effect**: Scales up 5% on hover
- **Transition**: Smooth cubic-bezier
- **Use**: Icons, small interactive elements

#### `.spotlight`
Radial spotlight on hover.
- **Effect**: Radial gradient follows cursor area
- **Opacity**: Fades in on hover
- **Use**: Large cards, hero sections

---

### 4. **Animation Effects**

#### `.shimmer`
Sweeping shimmer effect.
- **Animation**: Light sweep from left to right
- **Duration**: 2s infinite
- **Use**: Loading states, "checking" badges

```jsx
<div className="shimmer bg-gray-200">
  Loading...
</div>
```

#### `.bg-gradient-animated`
Animated gradient background.
- **Colors**: Purple, pink, blue cycle
- **Animation**: 15s infinite shift
- **Use**: Hero sections, backgrounds

#### `.animate-bounce-slow`
Slow bouncing animation.
- **Effect**: Bounces 15px up and down
- **Duration**: 2s infinite
- **Use**: Arrows, indicators, CTAs

#### `.animate-spin-slow`
Slow rotation.
- **Effect**: 360° rotation
- **Duration**: 3s infinite
- **Use**: Loading spinners, decorative elements

#### `.animate-wiggle`
Wiggle/shake effect.
- **Effect**: Rotates ±3°
- **Duration**: 1s infinite
- **Use**: Attention grabbers, notifications

---

### 5. **Particle Effects**

#### `.particles`
Floating particle background.
- **Effect**: Two floating dots
- **Animation**: Float up and sideways
- **Opacity**: Fades in/out
- **Use**: Backgrounds, decorative elements

```jsx
<div className="particles relative p-8">
  Content with floating particles
</div>
```

---

## 🎯 **Usage Examples**

### Premium Card with Multiple Effects
```jsx
<div className="glass-card hover-lift-3d spotlight shimmer">
  <h3 className="glow-text">Premium Feature</h3>
  <button className="ripple magnetic hover-neon">
    Click Me
  </button>
</div>
```

### Neon CTA Button
```jsx
<button className="neon-border hover-neon ripple px-6 py-3">
  <span className="text-gradient-neon font-bold">
    Get Started
  </span>
</button>
```

### Interactive Tender Card
```jsx
<div className="hover-tilt spotlight magnetic">
  <h4>Tender Title</h4>
  <a className="ripple hover-glow">View Details</a>
</div>
```

### Loading State
```jsx
<div className="shimmer skeleton h-20 rounded-lg">
  {/* Loading content */}
</div>
```

---

## 🎨 **Effect Combinations**

### **Premium Card**
```
hover-lift-3d + spotlight + shimmer + glass-card
```
**Result**: 3D lifting card with spotlight and shimmer

### **Neon Button**
```
neon-border + hover-neon + ripple + magnetic
```
**Result**: Neon button with click ripple and magnetic hover

### **Animated Background**
```
bg-gradient-animated + particles
```
**Result**: Shifting gradient with floating particles

### **Interactive Link**
```
magnetic + hover-glow + ripple
```
**Result**: Magnetic link with glow and click ripple

---

## ⚡ **Performance Tips**

### Best Practices
1. **Use sparingly**: Don't overload with effects
2. **Combine wisely**: 2-3 effects max per element
3. **Test on mobile**: Some effects may be heavy on mobile
4. **Respect motion preferences**: Effects disabled for `prefers-reduced-motion`

### Heavy Effects (Use Carefully)
- `.hover-lift-3d` - GPU intensive
- `.bg-gradient-animated` - Continuous animation
- `.particles` - Multiple pseudo-elements
- `.shimmer` - Continuous animation

### Light Effects (Safe to Use Freely)
- `.magnetic` - Simple scale
- `.ripple` - On-demand only
- `.hover-glow` - Box-shadow only
- `.hover-tilt` - Simple transform

---

## 🎭 **Animation Keyframes**

### New Animations
- `bounce-slow` - Slow vertical bounce
- `spin-slow` - Slow 360° rotation
- `wiggle` - Shake/wiggle effect
- `gradient-shift` - Background position shift
- `neon-pulse` - Brightness pulse
- `neon-rotate` - Hue rotation
- `shimmer-slide` - Horizontal sweep
- `particle-float` - Floating movement
- `glow-pulse` - Text shadow pulse

---

## 📱 **Responsive Behavior**

### Mobile Optimizations
- Reduced blur on mobile for performance
- Simplified 3D effects on small screens
- Disabled heavy animations on `prefers-reduced-motion`

### Breakpoint Adjustments
```css
@media (max-width: 640px) {
  /* Lighter effects on mobile */
  .glass-card {
    backdrop-filter: blur(12px); /* Reduced from 20px */
  }
}
```

---

## 🎨 **Color Tokens**

### New Gradients
```css
--neon-gradient: linear-gradient(135deg, #00f5ff 0%, #ff00ff 100%);
```

### New Shadows
```css
--shadow-neon: 0 0 30px rgba(0, 245, 255, 0.5), 
               0 0 60px rgba(255, 0, 255, 0.3);
```

---

## 🚀 **Quick Reference**

| Effect | Type | Performance | Best For |
|--------|------|-------------|----------|
| `hover-lift-3d` | 3D | Medium | Premium cards |
| `hover-neon` | Glow | Light | CTAs, buttons |
| `ripple` | Interactive | Light | Buttons |
| `shimmer` | Animation | Medium | Loading |
| `spotlight` | Interactive | Light | Large cards |
| `magnetic` | Interactive | Light | Icons, links |
| `particles` | Decoration | Medium | Backgrounds |
| `neon-border` | Animation | Medium | Feature boxes |
| `glow-text` | Animation | Light | Headings |
| `bg-gradient-animated` | Animation | Heavy | Backgrounds |

---

## 💡 **Pro Tips**

1. **Layer Effects**: Combine subtle effects for depth
   ```jsx
   className="hover-tilt spotlight hover-glow"
   ```

2. **Timing Matters**: Use animation delays for sequencing
   ```jsx
   className="animate-fade-in animation-delay-200"
   ```

3. **Context is Key**: Match effects to importance
   - Primary CTA: Neon + Ripple + Magnetic
   - Secondary button: Hover-glow only
   - Card: Spotlight + Tilt

4. **Test Accessibility**: Ensure effects don't hinder usability
   - Sufficient contrast
   - Clear focus states
   - Respect motion preferences

---

## 🎯 **Where We Used Them**

### TenderCard Component
- ✅ `hover-tilt` - Subtle 3D tilt on hover
- ✅ `spotlight` - Radial spotlight effect
- ✅ `magnetic` - External link icon
- ✅ `ripple` - Click feedback on link
- ✅ `shimmer` - "Checking..." badge
- ✅ `hover-glow` - Eligible badge

### Coming Soon
- Navbar: Neon effects on logo
- Hero: Animated gradient background
- Buttons: Ripple + Neon combo
- Stats: Particle backgrounds

---

**Last Updated**: January 27, 2026  
**Version**: 3.0.0  
**Status**: ✅ Production Ready
