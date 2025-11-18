#!/bin/bash

# Script to add GlassLayout wrapper to screens that don't have it

SCREENS_DIR="web-app/src/screens"
SCREENS=(
  "LeadsScreen.tsx"
  "WorkflowsScreen.tsx"
  "EmailsScreen.tsx"
  "DocumentsScreen.tsx"
  "TeamsScreen.tsx"
  "TemplatesScreen.tsx"
  "ProfileScreen.tsx"
)

cd "$SCREENS_DIR" || exit 1

for screen in "${SCREENS[@]}"; do
  if [ ! -f "$screen" ]; then
    echo "⏭️  Skipping $screen (not found)"
    continue
  fi

  # Check if already has withGlassLayout
  if grep -q "withGlassLayout" "$screen"; then
    echo "✅ $screen already has layout"
    continue
  fi

  echo "🔧 Processing $screen..."

  # Add import at the top (after other imports)
  sed -i.bak '/from.*AuthContext/a\
import { withGlassLayout } from '\''../components/withGlassLayout'\'';
' "$screen"

  # Change export default function to just function
  sed -i.bak 's/export default function \([A-Za-z]*\)/function \1/' "$screen"

  # Add export with HOC at the end (before closing of file)
  screen_name=$(echo "$screen" | sed 's/Screen\.tsx//')
  echo "" >> "$screen"
  echo "export default withGlassLayout(${screen_name}Screen);" >> "$screen"

  # Remove backup files
  rm "${screen}.bak"

  echo "✅ Added layout to $screen"
done

echo ""
echo "🎉 Done! All screens now have GlassLayout"
