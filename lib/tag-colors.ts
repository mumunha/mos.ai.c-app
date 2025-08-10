// Function to generate a consistent hash from a string
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Predefined set of vibrant pastel colors with inline styles
export const pastelColors = [
  { 
    name: 'Red', 
    classes: 'bg-red-200 text-red-900 border-red-300',
    style: { backgroundColor: '#fecaca', color: '#7f1d1d', borderColor: '#fca5a5' }
  },
  { 
    name: 'Orange', 
    classes: 'bg-orange-200 text-orange-900 border-orange-300',
    style: { backgroundColor: '#fed7aa', color: '#9a3412', borderColor: '#fdba74' }
  },
  { 
    name: 'Amber', 
    classes: 'bg-amber-200 text-amber-900 border-amber-300',
    style: { backgroundColor: '#fde68a', color: '#78350f', borderColor: '#fcd34d' }
  },
  { 
    name: 'Yellow', 
    classes: 'bg-yellow-200 text-yellow-900 border-yellow-300',
    style: { backgroundColor: '#fef08a', color: '#713f12', borderColor: '#fde047' }
  },
  { 
    name: 'Lime', 
    classes: 'bg-lime-200 text-lime-900 border-lime-300',
    style: { backgroundColor: '#d9f99d', color: '#365314', borderColor: '#bef264' }
  },
  { 
    name: 'Green', 
    classes: 'bg-green-200 text-green-900 border-green-300',
    style: { backgroundColor: '#bbf7d0', color: '#14532d', borderColor: '#86efac' }
  },
  { 
    name: 'Emerald', 
    classes: 'bg-emerald-200 text-emerald-900 border-emerald-300',
    style: { backgroundColor: '#a7f3d0', color: '#064e3b', borderColor: '#6ee7b7' }
  },
  { 
    name: 'Teal', 
    classes: 'bg-teal-200 text-teal-900 border-teal-300',
    style: { backgroundColor: '#99f6e4', color: '#134e4a', borderColor: '#5eead4' }
  },
  { 
    name: 'Cyan', 
    classes: 'bg-cyan-200 text-cyan-900 border-cyan-300',
    style: { backgroundColor: '#a5f3fc', color: '#164e63', borderColor: '#67e8f9' }
  },
  { 
    name: 'Sky', 
    classes: 'bg-sky-200 text-sky-900 border-sky-300',
    style: { backgroundColor: '#bae6fd', color: '#0c4a6e', borderColor: '#7dd3fc' }
  },
  { 
    name: 'Blue', 
    classes: 'bg-blue-200 text-blue-900 border-blue-300',
    style: { backgroundColor: '#c3ddfd', color: '#1e3a8a', borderColor: '#93c5fd' }
  },
  { 
    name: 'Indigo', 
    classes: 'bg-indigo-200 text-indigo-900 border-indigo-300',
    style: { backgroundColor: '#c7d2fe', color: '#312e81', borderColor: '#a5b4fc' }
  },
  { 
    name: 'Violet', 
    classes: 'bg-violet-200 text-violet-900 border-violet-300',
    style: { backgroundColor: '#ddd6fe', color: '#4c1d95', borderColor: '#c4b5fd' }
  },
  { 
    name: 'Purple', 
    classes: 'bg-purple-200 text-purple-900 border-purple-300',
    style: { backgroundColor: '#e9d5ff', color: '#581c87', borderColor: '#d8b4fe' }
  },
  { 
    name: 'Fuchsia', 
    classes: 'bg-fuchsia-200 text-fuchsia-900 border-fuchsia-300',
    style: { backgroundColor: '#f5d0fe', color: '#86198f', borderColor: '#f0abfc' }
  },
  { 
    name: 'Pink', 
    classes: 'bg-pink-200 text-pink-900 border-pink-300',
    style: { backgroundColor: '#fce7f3', color: '#831843', borderColor: '#f9a8d4' }
  },
  { 
    name: 'Rose', 
    classes: 'bg-rose-200 text-rose-900 border-rose-300',
    style: { backgroundColor: '#fecdd3', color: '#881337', borderColor: '#fda4af' }
  },
  { 
    name: 'Stone', 
    classes: 'bg-stone-200 text-stone-900 border-stone-300',
    style: { backgroundColor: '#e7e5e4', color: '#1c1917', borderColor: '#d6d3d1' }
  },
  { 
    name: 'Slate', 
    classes: 'bg-slate-200 text-slate-900 border-slate-300',
    style: { backgroundColor: '#e2e8f0', color: '#0f172a', borderColor: '#cbd5e1' }
  },
  { 
    name: 'Neutral', 
    classes: 'bg-neutral-200 text-neutral-900 border-neutral-300',
    style: { backgroundColor: '#e5e5e5', color: '#171717', borderColor: '#d4d4d4' }
  },
];

// Store for custom tag colors (in a real app, this would be in a database)
const customTagColors: Record<string, string> = {};

// Function to get a consistent pastel color for a tag
export function getTagColor(tagName: string | null | undefined): string {
  if (!tagName) {
    return pastelColors[0].classes; // Return default color for null/undefined
  }
  
  // Check if there's a custom color set for this tag
  if (customTagColors[tagName.toLowerCase()]) {
    return customTagColors[tagName.toLowerCase()];
  }
  
  // Use hash-based default color with better distribution
  const hash = hashString(tagName.toLowerCase());
  const colorIndex = Math.abs(hash) % pastelColors.length;
  return pastelColors[colorIndex].classes;
}

// Function to get a random pastel color (for generating new random colors)
export function getRandomPastelColor(): string {
  const randomIndex = Math.floor(Math.random() * pastelColors.length);
  return pastelColors[randomIndex].classes;
}

// Function to get style object for a color by classes
export function getColorStyle(classes: string): React.CSSProperties | undefined {
  const color = pastelColors.find(c => c.classes === classes);
  return color?.style;
}

// Function to get tag style classes including the color
export function getTagClasses(tagName: string | null | undefined, baseClasses: string = ''): string {
  if (!tagName) {
    return `${baseClasses} ${pastelColors[0].classes} border`.trim();
  }
  const colorClasses = getTagColor(tagName);
  return `${baseClasses} ${colorClasses} border`.trim();
}

// Function to set custom color for a tag
export function setCustomTagColor(tagName: string, colorClasses: string): void {
  customTagColors[tagName.toLowerCase()] = colorClasses;
}

// Function to get all custom tag colors
export function getCustomTagColors(): Record<string, string> {
  return { ...customTagColors };
}

