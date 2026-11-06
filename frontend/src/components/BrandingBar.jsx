import React, { useState } from 'react';

// Top branding bar for the big screens (Lobby + Draw).
// Logo lives at frontend/public/gta-logo.png; falls back to "GTA" text until it's uploaded.
const BrandingBar = ({ tagline }) => {
    const [logoFailed, setLogoFailed] = useState(false);

    return (
        <div className="sticky top-0 z-40 h-16 shrink-0 flex items-center gap-4 px-4 md:px-6 bg-west-surface border-b-2 border-west-border">
            <div className="w-[120px] h-12 shrink-0 flex items-center">
                {logoFailed ? (
                    <span className="font-rye text-3xl text-west-gold">GTA</span>
                ) : (
                    <img
                        src="/gta-logo.png"
                        alt="GTA"
                        className="w-[120px] h-12 object-contain object-left"
                        onError={() => setLogoFailed(true)}
                    />
                )}
            </div>

            {/* Center: reserved for an event logo later */}
            <div className="flex-1" />

            <div className="min-w-0 truncate text-right font-oswald font-semibold uppercase tracking-[0.2em] text-xs md:text-sm text-west-gold">
                {tagline}
            </div>
        </div>
    );
};

export default BrandingBar;
