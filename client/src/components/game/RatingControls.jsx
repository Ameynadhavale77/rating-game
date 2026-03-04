import { useState } from 'react';

export default function RatingControls({ onRate, hasRated }) {
    const [selectedRating, setSelectedRating] = useState(null);
    const [hoveredRating, setHoveredRating] = useState(null);

    const handleRate = (value) => {
        if (hasRated) return;
        setSelectedRating(value);
        onRate(value);
    };

    const getColor = (num) => {
        if (num <= 3) return { bg: 'from-red-600 to-red-700', border: 'border-red-500/40', glow: 'shadow-red-600/30' };
        if (num <= 5) return { bg: 'from-orange-600 to-amber-600', border: 'border-orange-500/40', glow: 'shadow-orange-600/30' };
        if (num <= 7) return { bg: 'from-yellow-600 to-yellow-500', border: 'border-yellow-500/40', glow: 'shadow-yellow-600/30' };
        if (num <= 9) return { bg: 'from-emerald-600 to-green-600', border: 'border-emerald-500/40', glow: 'shadow-emerald-600/30' };
        return { bg: 'from-cyan-500 to-blue-600', border: 'border-cyan-500/40', glow: 'shadow-cyan-600/30' };
    };

    if (hasRated) {
        return (
            <div className="flex flex-col items-center gap-2 animate-scale-in">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center text-3xl font-black shadow-lg shadow-emerald-600/30">
                    {selectedRating}
                </div>
                <div className="text-emerald-400 font-bold text-lg">✓ Rated!</div>
                <div className="text-gray-500 text-sm animate-pulse">Waiting for others...</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-2xl px-4 animate-slide-up">
            <h3 className="text-center text-gray-400 mb-4 text-sm tracking-[0.2em] uppercase font-medium">
                {hoveredRating ? `Rate: ${hoveredRating}` : 'Select your rating'}
            </h3>
            <div className="flex gap-2 justify-center flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const colors = getColor(num);
                    return (
                        <button
                            key={num}
                            onClick={() => handleRate(num)}
                            onMouseEnter={() => setHoveredRating(num)}
                            onMouseLeave={() => setHoveredRating(null)}
                            className={`
                                w-14 h-14 rounded-xl text-xl font-bold
                                bg-gradient-to-br ${colors.bg}
                                border ${colors.border}
                                text-white shadow-lg ${colors.glow}
                                transition-all duration-200
                                hover:scale-110 hover:-translate-y-1 hover:shadow-xl
                                active:scale-95
                            `}
                        >
                            {num}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
