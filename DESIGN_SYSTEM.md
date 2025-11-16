# 🎨 Simplix CRM - Apple Liquid Glass Design System

## Vue d'ensemble

Design system premium inspiré d'Apple avec effets glassmorphism (liquid glass), animations fluides et une expérience utilisateur exceptionnelle.

## 🌟 Principes de design

### 1. **Clarity (Clarté)**
- Hiérarchie visuelle claire
- Typographie lisible et élégante
- Espaces blancs généreux
- Contenu prioritaire

### 2. **Depth (Profondeur)**
- Système d'élévation à 4 niveaux (sm, md, lg, xl)
- Glassmorphism avec blur et transparence
- Ombres subtiles et naturelles
- Effets de lumière (glow) sur les éléments actifs

### 3. **Fluidity (Fluidité)**
- Animations spring naturelles
- Transitions douces (250-350ms)
- Micro-interactions réactives
- Courbes d'accélération Apple

## 🎨 Palette de couleurs

### Couleurs primaires
```typescript
primary: '#007AFF'      // iOS Blue
primaryLight: '#5AC8FA'
primaryDark: '#0051D5'
```

### Couleurs d'accent
```typescript
purple: '#AF52DE'
pink: '#FF2D55'
orange: '#FF9500'
yellow: '#FFCC00'
green: '#34C759'
teal: '#5AC8FA'
indigo: '#5856D6'
```

### Glassmorphism
```typescript
light: rgba(255, 255, 255, 0.72)    // Verre clair
medium: rgba(255, 255, 255, 0.5)    // Verre moyen
dark: rgba(0, 0, 0, 0.15)           // Verre sombre
frosted: rgba(242, 242, 247, 0.88)  // Verre givré
```

## 📐 Typographie

Inspirée de **SF Pro** (police système Apple)

### Hiérarchie
- **Display Large**: 48px/700/-1.5 - Titres principaux
- **Display Medium**: 36px/700/-1 - Sous-titres importants
- **Display Small**: 28px/600/-0.5 - Titres de section
- **H1**: 24px/700/-0.5 - En-têtes
- **H2**: 20px/600/-0.3 - Sous-en-têtes
- **H3**: 17px/600/-0.2 - Titres de cartes
- **Body**: 15px/400/-0.2 - Texte principal
- **Caption**: 12px/400/0 - Texte secondaire
- **Label**: 11px/500/0.1/UPPERCASE - Labels

## 🔲 Composants

### GlassCard
Carte avec effet glassmorphism, ombres et bordures subtiles.

**Variantes:**
- `light` - Fond blanc transparent (72%)
- `medium` - Fond blanc semi-transparent (50%)
- `frosted` - Fond givré (88%)

**Props:**
```typescript
variant?: 'light' | 'medium' | 'frosted'
elevation?: 'sm' | 'md' | 'lg' | 'xl'
padding?: number
borderRadius?: number
glow?: boolean
glowColor?: string
```

### GlassNavigation
Navigation latérale avec effet verre et animations.

**Caractéristiques:**
- Collapse/expand responsive
- Indicateur actif animé
- Badges de notification
- Profil utilisateur intégré
- Effet blur natif iOS

### GlassDashboardScreen
Tableau de bord avec statistiques animées.

**Éléments:**
- Cartes statistiques avec gradients
- Animations d'entrée fluides
- Indicateurs de tendance
- Sections collapsibles

### GlassPipelineScreen
Vue Kanban moderne avec drag & drop.

**Fonctionnalités:**
- Colonnes scrollables horizontalement
- Cartes d'opportunités détaillées
- Badges de statut
- Valeurs totales par étape

## 🎭 Animations

### Durées
```typescript
fast: 150ms     // Micro-interactions
normal: 250ms   // Transitions standard
slow: 350ms     // Mouvements importants
slower: 500ms   // Animations complexes
```

### Courbes (Easing)
```typescript
spring: cubic-bezier(0.4, 0.0, 0.2, 1)      // Ressort Apple
decelerate: cubic-bezier(0.0, 0.0, 0.2, 1)  // Décélération
accelerate: cubic-bezier(0.4, 0.0, 1, 1)    // Accélération
standard: cubic-bezier(0.4, 0.0, 0.6, 1)    // Standard
```

## 📏 Spacing

Système basé sur une grille de **8px**:
```typescript
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
xxxl: 64px
```

## 🔘 Border Radius

Coins arrondis fluides:
```typescript
xs: 6px
sm: 10px
md: 14px
lg: 20px
xl: 28px
xxl: 40px
full: 9999px
```

## 💫 Effets spéciaux

### Glassmorphism
Combinaison de:
- `backdrop-filter: blur(40px)`
- `background: rgba(255, 255, 255, 0.72)`
- `border: 1px solid rgba(255, 255, 255, 0.18)`
- `box-shadow` subtile

### Inner Glow
Utilisé sur les éléments actifs:
```typescript
shadowColor: '#007AFF'
shadowOpacity: 0.3
shadowRadius: 12
```

### Border Shimmer
Bordure légère et brillante:
```typescript
borderColor: rgba(255, 255, 255, 0.3)
```

## 📱 Responsive

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Adaptations
- Navigation: Full sur desktop, collapsed sur mobile
- Cartes: Grille 2 colonnes sur tablet+, 1 colonne sur mobile
- Pipeline: Scroll horizontal optimisé pour touch

## 🎯 Best Practices

1. **Toujours utiliser le theme**
   ```typescript
   import { glassTheme } from '../theme/glassTheme';
   ```

2. **Privilégier les animations natives**
   ```typescript
   useNativeDriver: true
   ```

3. **Utiliser BlurView sur iOS**
   ```typescript
   Platform.OS === 'ios' ? <BlurView /> : <View />
   ```

4. **Appliquer les ombres via le theme**
   ```typescript
   ...withShadow('md')
   ```

5. **Respecter les espacements**
   ```typescript
   padding: glassTheme.spacing.md
   ```

## 🚀 Implémentation

### Import du theme
```typescript
import { glassTheme, withGlass, withShadow } from '../theme/glassTheme';
```

### Utilisation des composants
```typescript
import GlassCard from '../components/GlassCard';
import GlassNavigation from '../components/GlassNavigation';
```

### Exemple de style
```typescript
const styles = StyleSheet.create({
  container: {
    padding: glassTheme.spacing.lg,
    borderRadius: glassTheme.radius.md,
    ...withShadow('lg'),
  },
  title: {
    ...glassTheme.typography.h1,
    color: glassTheme.colors.text.primary,
  },
});
```

## 🎨 Inspirations

- **Apple Design Language** - Clarté, profondeur, fluidité
- **iOS 17/18** - Glassmorphism, animations spring
- **macOS Sonoma** - Effets de transparence
- **Vision Pro UI** - Profondeur spatiale

## 📚 Ressources

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SF Symbols](https://developer.apple.com/sf-symbols/)
- [Glassmorphism CSS](https://css.glass/)

---

**Version**: 1.0.0
**Dernière mise à jour**: Janvier 2025
**Auteur**: Simplix Team with Claude Code
