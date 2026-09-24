"use client";

import { useState, useMemo, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { MediaImage } from "@/shared/components/ui/media-image";
import { cn } from "@/lib/utils";

type GalleryItem = {
  title: string;
  src: string;
  category?: string;
};

export function GalleryGrid({ images }: { images: GalleryItem[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Derive unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    images.forEach((img) => {
      if (img.category) cats.add(img.category);
    });
    return ["All", ...Array.from(cats)];
  }, [images]);

  // Filter images by active category
  const filteredImages = useMemo(() => {
    if (selectedCategory === "All") return images;
    return images.filter((img) => img.category === selectedCategory);
  }, [images, selectedCategory]);

  // Keybindings for lightbox
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedIndex === null) return;
      if (e.key === "Escape") {
        setSelectedIndex(null);
      } else if (e.key === "ArrowLeft") {
        setSelectedIndex((prev) => (prev === null || prev === 0 ? filteredImages.length - 1 : prev - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedIndex((prev) => (prev === null || prev === filteredImages.length - 1 ? 0 : prev + 1));
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIndex, filteredImages.length]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % filteredImages.length);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex === 0 ? filteredImages.length - 1 : selectedIndex - 1));
    }
  };

  const activeImage = selectedIndex !== null ? filteredImages[selectedIndex] : null;

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              setSelectedIndex(null);
            }}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-all",
              selectedCategory === cat
                ? "bg-primary text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Image Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredImages.map((photo, idx) => (
          <figure
            key={photo.src}
            className="group cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            onClick={() => setSelectedIndex(idx)}
          >
            <MediaImage
              src={photo.src}
              alt={photo.title}
              aspect="gallery"
              fit="cover"
              rounded={false}
              className="transition-transform duration-300 group-hover:scale-105"
            />
            <figcaption className="border-t border-slate-100 px-4 py-3">
              {photo.category && (
                <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                  {photo.category}
                </p>
              )}
              <p className="text-sm font-semibold text-primary">{photo.title}</p>
            </figcaption>
          </figure>
        ))}
      </div>

      {/* Lightbox Overlay */}
      {activeImage && (
        <div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-primary p-4 sm:p-8"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close Button */}
          <button
            className="absolute right-4 top-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white border border-white/20 shadow-xl transition-all hover:scale-110 hover:bg-accent hover:text-slate-900 hover:border-transparent sm:right-8 sm:top-8"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(null);
            }}
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Previous Button */}
          <button
            className="absolute left-4 top-1/2 z-[60] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white border border-white/20 shadow-xl transition-all hover:scale-110 hover:bg-accent hover:text-slate-900 hover:border-transparent sm:left-8"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev(e);
            }}
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Next Button */}
          <button
            className="absolute right-4 top-1/2 z-[60] flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white border border-white/20 shadow-xl transition-all hover:scale-110 hover:bg-accent hover:text-slate-900 hover:border-transparent sm:right-8"
            onClick={(e) => {
              e.stopPropagation();
              handleNext(e);
            }}
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          {/* Image Content */}
          <div className="relative w-full max-w-5xl flex-1 overflow-hidden pointer-events-none flex flex-col justify-center items-center gap-4">
            <img
              src={activeImage.src}
              alt={activeImage.title}
              className="max-h-[80vh] w-auto max-w-full object-contain drop-shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()} // only prevent clicks on the actual image
            />
            
            <div 
              className="text-center text-white pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {activeImage.category && (
                <p className="mb-1 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  {activeImage.category}
                </p>
              )}
              <p className="text-xl font-bold">{activeImage.title}</p>
              <p className="mt-2 text-xs font-medium text-slate-500">
                {selectedIndex !== null ? selectedIndex + 1 : 0} of {filteredImages.length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
