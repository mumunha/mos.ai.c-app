'use client';

// This component is used to ensure all color classes are included in the build
// Import this component but don't render it - it just forces Tailwind to include the classes

export default function ColorPalette() {
  return (
    <div className="hidden">
      {/* Red colors */}
      <div className="bg-red-200 text-red-900 border-red-300" />
      
      {/* Orange colors */}
      <div className="bg-orange-200 text-orange-900 border-orange-300" />
      
      {/* Amber colors */}
      <div className="bg-amber-200 text-amber-900 border-amber-300" />
      
      {/* Yellow colors */}
      <div className="bg-yellow-200 text-yellow-900 border-yellow-300" />
      
      {/* Lime colors */}
      <div className="bg-lime-200 text-lime-900 border-lime-300" />
      
      {/* Green colors */}
      <div className="bg-green-200 text-green-900 border-green-300" />
      
      {/* Emerald colors */}
      <div className="bg-emerald-200 text-emerald-900 border-emerald-300" />
      
      {/* Teal colors */}
      <div className="bg-teal-200 text-teal-900 border-teal-300" />
      
      {/* Cyan colors */}
      <div className="bg-cyan-200 text-cyan-900 border-cyan-300" />
      
      {/* Sky colors */}
      <div className="bg-sky-200 text-sky-900 border-sky-300" />
      
      {/* Blue colors */}
      <div className="bg-blue-200 text-blue-900 border-blue-300" />
      
      {/* Indigo colors */}
      <div className="bg-indigo-200 text-indigo-900 border-indigo-300" />
      
      {/* Violet colors */}
      <div className="bg-violet-200 text-violet-900 border-violet-300" />
      
      {/* Purple colors */}
      <div className="bg-purple-200 text-purple-900 border-purple-300" />
      
      {/* Fuchsia colors */}
      <div className="bg-fuchsia-200 text-fuchsia-900 border-fuchsia-300" />
      
      {/* Pink colors */}
      <div className="bg-pink-200 text-pink-900 border-pink-300" />
      
      {/* Rose colors */}
      <div className="bg-rose-200 text-rose-900 border-rose-300" />
      
      {/* Stone colors */}
      <div className="bg-stone-200 text-stone-900 border-stone-300" />
      
      {/* Slate colors */}
      <div className="bg-slate-200 text-slate-900 border-slate-300" />
      
      {/* Neutral colors */}
      <div className="bg-neutral-200 text-neutral-900 border-neutral-300" />
    </div>
  );
}