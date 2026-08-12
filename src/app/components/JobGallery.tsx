import { useState, useEffect } from 'react';
import { galleryImages } from '@/app/data/jobs';

function getRandomImages(allImages: string[], count: number): string[] {
  const shuffled = [...allImages].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function JobGallery() {
  const [displayedImages, setDisplayedImages] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshImages = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setDisplayedImages(getRandomImages(galleryImages, 9));
      setIsRefreshing(false);
    }, 300);
  };

  useEffect(() => {
    setDisplayedImages(getRandomImages(galleryImages, 9));
  }, []);

  return (
    <section className="py-12 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3 tracking-tight text-slate-900">Our Work</h2>
          <p className="text-slate-500 max-w-xl mx-auto mb-6">
            Real jobs, real results. Every photo is from a service we actually performed.
          </p>
          <button
            onClick={refreshImages}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 text-slate-700 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshing ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 max-w-6xl mx-auto">
          {displayedImages.map((src, index) => (
            <div
              key={src}
              className="relative aspect-square overflow-hidden bg-slate-200"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <img
                src={src}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
