import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import eventService from '../services/eventService';
import prizeService from '../services/prizeService';
import drawService from '../services/drawService';
import participantService from '../services/participantService';
import { isPresent } from '../utils/participants';
import BrandingBar from '../components/BrandingBar';

gsap.registerPlugin(useGSAP);

// Text on the right of the branding bar
const EVENT_TAGLINE = "GTA Cowboy In The Sky ★ 28 November 2026";

// ── Animation timing ────────────────────────────────────────────
const IDLE_STEP_MS = 280;          // slow random highlight before drawing
const FAST_STEP_MS = 70;           // rapid flashing while drawing
const FAST_PHASE_MS = 2200;        // minimum time of rapid flashing
const SLOWDOWN_STEPS_MS = [90, 110, 140, 180, 230, 290, 360, 440, 540]; // then lands on winner
const FINAL_STEP_MS = 650;
const OVERLAY_DELAY_MS = 1200;     // let the gold winner card shine before the overlay
const DUST_COUNT = 20;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const pickRandom = (ids, exclude) => {
    if (ids.length === 0) return null;
    if (ids.length === 1) return ids[0];
    let id;
    do { id = ids[Math.floor(Math.random() * ids.length)]; } while (id === exclude);
    return id;
};

// Full-screen gold confetti for ~3 seconds
const fireConfetti = () => {
    const end = Date.now() + 3000;
    const colors = ['#FFD700', '#D4A017', '#F5E6C8', '#C0392B', '#2D7D6F'];
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors, zIndex: 9999 });
    (function frame() {
        confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 }, colors, zIndex: 9999 });
        confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 }, colors, zIndex: 9999 });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
};

// ── Floating golden dust (GSAP) ─────────────────────────────────
const DustParticles = () => {
    const ref = useRef(null);
    const [dots] = useState(() =>
        Array.from({ length: DUST_COUNT }, () => ({
            left: Math.random() * 100,
            size: 2 + Math.random() * 3,
        })));

    useGSAP(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const height = ref.current.offsetHeight || window.innerHeight;
        gsap.utils.toArray('.dust', ref.current).forEach(dot => {
            const tween = gsap.fromTo(dot,
                { y: 0, x: 0, opacity: gsap.utils.random(0.3, 0.6) },
                {
                    y: -(height + 40),
                    x: gsap.utils.random(-40, 40),
                    duration: gsap.utils.random(8, 12),
                    ease: 'none',
                    repeat: -1,
                });
            tween.progress(Math.random()); // spread them over the screen from the start
        });
    }, { scope: ref });

    return (
        <div ref={ref} className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
            {dots.map((d, i) => (
                <span
                    key={i}
                    className="dust absolute rounded-full bg-west-gold shadow-[0_0_6px_rgba(212,160,23,0.8)]"
                    style={{ left: `${d.left}%`, bottom: -10, width: d.size, height: d.size, opacity: 0 }}
                />
            ))}
        </div>
    );
};

// ── Name card (wanted poster) ───────────────────────────────────
const NameCard = memo(function NameCard({ name, state }) {
    // state: normal | glow (idle) | highlight (drawing) | winner | dim
    const ref = useRef(null);

    useGSAP(() => {
        if (state === 'winner') {
            gsap.to(ref.current, { scale: 1.3, duration: 0.5, ease: 'back.out(1.7)' });
        }
    }, { dependencies: [state], scope: ref, revertOnUpdate: true });

    return (
        <div
            ref={ref}
            className={`wanted-card name-card is-${state} rounded-lg p-3 flex flex-col items-center justify-center text-center min-h-[84px] select-none ${state === 'winner' ? 'animate-winner-glow' : ''}`}
        >
            {state === 'winner' && (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-xl">👑</span>
            )}
            <span className={`font-oswald uppercase leading-tight line-clamp-2 ${state === 'winner' ? 'text-lg md:text-xl font-bold' : 'text-sm md:text-base font-semibold tracking-wide'}`}>
                {name}
            </span>
        </div>
    );
});

// ── Draw button with GSAP entrance ──────────────────────────────
const DrawButton = ({ onClick, disabled }) => {
    const ref = useRef(null);
    useGSAP(() => {
        gsap.from(ref.current, { y: 40, opacity: 0, scale: 0.92, duration: 0.6, ease: 'back.out(1.7)' });
    }, { scope: ref });

    return (
        <button
            ref={ref}
            onClick={onClick}
            disabled={disabled}
            className="flex-1 py-5 rounded-xl font-oswald font-bold uppercase tracking-[0.2em] text-2xl md:text-3xl text-west-cream bg-gradient-to-r from-west-danger via-[#D35400] to-west-gold border border-west-gold/60 shadow-[0_10px_40px_rgba(212,160,23,0.35)] [text-shadow:0_2px_6px_rgba(0,0,0,0.5)] transition-[filter] hover:brightness-110 active:brightness-95 disabled:opacity-40 disabled:cursor-not-allowed"
        >
            🎯 Draw Your Destiny
        </button>
    );
};

// ── Side walls (decorative, lg+ screens only) ───────────────────
const WallDivider = () => <div className="self-stretch border-t border-amber-600/40 mx-4 my-4" />;

const LeftWall = () => {
    const [logoFailed, setLogoFailed] = useState(false);
    return (
        <aside className="hidden lg:flex flex-col items-center text-center w-48 shrink-0 h-full min-h-screen relative z-10 bg-black/75 border-r border-amber-900/50">
            {logoFailed ? (
                <div className="font-rye text-4xl text-west-gold mt-8">GTA</div>
            ) : (
                <img src="/gta-logo.png" alt="GTA" className="w-32 mx-auto mt-8" onError={() => setLogoFailed(true)} />
            )}
            <WallDivider />
            <div className="font-oswald font-semibold uppercase tracking-widest text-sm text-west-gold leading-relaxed">
                <div>DINNER GTA</div>
                <div>FAMILY DAY 2026</div>
            </div>
            <WallDivider />
            <div className="flex-1" />
            <div className="text-3xl text-west-gold mb-8">★</div>
        </aside>
    );
};

const RightWall = () => (
    <aside className="hidden lg:flex flex-col items-center text-center w-48 shrink-0 h-full min-h-screen relative z-10 bg-black/75 border-l border-amber-900/50">
        <div className="font-rye text-base text-west-gold mt-8">GTA COWBOY</div>
        <WallDivider />
        <div className="font-oswald font-semibold uppercase tracking-widest text-sm text-west-cream">IN THE SKY</div>
        <WallDivider />
        <div className="font-oswald uppercase tracking-widest text-sm text-west-gold/60 leading-relaxed">
            <div>28 NOVEMBER</div>
            <div>2026</div>
        </div>
        <div className="flex-1" />
        <div className="text-3xl text-west-gold mb-8">★</div>
    </aside>
);

// ── Winner overlay with GSAP entrance timeline ──────────────────
const WinnerOverlay = ({ winner, prize, children }) => {
    const ref = useRef(null);

    useGSAP(() => {
        gsap.timeline()
            .from(ref.current, { opacity: 0, duration: 0.5, ease: 'power2.out' })
            .from('.wo-title', { scale: 0.4, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.1')
            .from('.wo-name', { y: 300, opacity: 0, duration: 0.8, ease: 'power4.out' }, '-=0.2')
            .call(fireConfetti)
            .from('.wo-prize', { y: 30, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.2')
            .from('.wo-actions', { opacity: 0, duration: 0.4 });
    }, { scope: ref });

    return (
        <div
            ref={ref}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-hidden"
            style={{ background: 'radial-gradient(circle at 50% 35%, rgba(255,215,0,0.28) 0%, rgba(13,10,6,0.92) 55%, rgba(13,10,6,0.97) 100%)' }}
        >
            <div className="text-center max-w-4xl w-full flex flex-col items-center gap-5">
                <div className="wo-title font-rye text-4xl md:text-6xl lg:text-7xl text-west-winner drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]">
                    🤠 WE GOT A WINNER!
                </div>
                <div className="wo-name font-oswald font-bold uppercase tracking-wide text-5xl md:text-7xl lg:text-8xl text-west-cream leading-tight break-words">
                    {winner.name}
                </div>

                <div className="wo-prize flex flex-col items-center gap-3 mt-2">
                    {prize?.image_url ? (
                        <img
                            src={prize.image_url}
                            alt={prize.title}
                            className="w-24 h-24 object-contain mx-auto rounded-xl shadow-lg"
                        />
                    ) : (
                        <div className="text-7xl">🏆</div>
                    )}
                    <div className="font-oswald text-sm text-west-muted uppercase tracking-[0.3em]">✦ wins ✦</div>
                    <div className="font-rye text-2xl md:text-4xl text-west-gold">{prize?.title}</div>
                </div>

                <div className="wo-actions mt-6">{children}</div>
            </div>
        </div>
    );
};

const DrawScreen = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();

    // Data
    const [eventData, setEventData] = useState(null);
    const [prizes, setPrizes] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [results, setResults] = useState([]); // { prize_id, participant_id, winner_name, winner_index }
    const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);

    // UI
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');
    const [phase, setPhase] = useState('idle');   // idle | drawing | revealed
    const [paused, setPaused] = useState(false);
    const [highlightId, setHighlightId] = useState(null);
    const [frozenPool, setFrozenPool] = useState(null); // grid snapshot while drawing / revealed
    const [winner, setWinner] = useState(null);         // { id, name }
    const [showOverlay, setShowOverlay] = useState(false);

    const mountedRef = useRef(true);
    useEffect(() => {
        mountedRef.current = true;
        return () => { mountedRef.current = false; confetti.reset(); };
    }, []);

    const refreshParticipants = useCallback(async () => {
        try {
            const list = await participantService.getAll(eventId);
            if (mountedRef.current) setParticipants(list);
        } catch { /* keep previous list */ }
    }, [eventId]);

    // ── Init: event, session, prizes, participants, existing results ──
    useEffect(() => {
        const init = async () => {
            try {
                const ev = await eventService.getById(eventId);
                setEventData(ev);

                try { await drawService.startSession(eventId); }
                catch (err) { setErrorMsg(err.message); }

                const [przs, parts, res] = await Promise.all([
                    prizeService.getAll(eventId),
                    participantService.getAll(eventId),
                    drawService.getResults(eventId),
                ]);
                setPrizes(przs);
                setParticipants(parts);
                setResults(res);

                // Resume at the first prize that still has empty slots
                const firstOpen = przs.findIndex(p =>
                    res.filter(r => r.prize_id === p.id).length < p.winner_count);
                setCurrentPrizeIndex(firstOpen === -1 ? przs.length : firstOpen);
            } catch (err) {
                console.error(err);
                setErrorMsg('Failed to start the draw session.');
            } finally {
                setLoading(false);
            }
        };
        if (eventId) init();
    }, [eventId]);

    // ── Derived ──
    const currentPrize = prizes[currentPrizeIndex];
    const allDone = !loading && prizes.length > 0 && currentPrizeIndex >= prizes.length;
    const drawnForPrize = currentPrize ? results.filter(r => r.prize_id === currentPrize.id).length : 0;
    const prizeComplete = currentPrize && drawnForPrize >= currentPrize.winner_count;
    const isLastPrize = currentPrizeIndex >= prizes.length - 1;
    const isMysteryHidden = !!currentPrize?.is_mystery && drawnForPrize === 0;

    // Eligible = present and has not won yet
    const eligible = useMemo(() => {
        const winnerIds = new Set(results.map(r => r.participant_id));
        return participants.filter(p => isPresent(p) && !winnerIds.has(p.id));
    }, [participants, results]);

    const pool = frozenPool ?? eligible;
    const poolIds = useMemo(() => pool.map(p => p.id), [pool]);

    // ── Idle animation (pausable) ──
    useEffect(() => {
        if (phase !== 'idle' || paused || poolIds.length === 0) return;
        const t = setInterval(() => setHighlightId(prev => pickRandom(poolIds, prev)), IDLE_STEP_MS);
        return () => clearInterval(t);
    }, [phase, paused, poolIds]);

    // ── Draw ──
    const handleDraw = async () => {
        if (phase !== 'idle' || !currentPrize || prizeComplete) return;
        setErrorMsg('');
        setPaused(false);

        const snapshot = eligible;
        const ids = snapshot.map(p => p.id);
        setFrozenPool(snapshot);
        setPhase('drawing');

        // The database picks + saves the winner; the animation is only visual
        const drawPromise = drawService.draw(currentPrize.id);

        let last = null;
        const fast = setInterval(() => {
            last = pickRandom(ids, last);
            setHighlightId(last);
        }, FAST_STEP_MS);

        let data;
        try {
            [data] = await Promise.all([drawPromise, sleep(FAST_PHASE_MS)]);
        } catch (err) {
            clearInterval(fast);
            if (!mountedRef.current) return;
            setErrorMsg(err.message || 'Failed to draw a winner.');
            setFrozenPool(null);
            setHighlightId(null);
            setPhase('idle');
            return;
        }
        clearInterval(fast);
        if (!mountedRef.current) return;

        // data: { result_id, participant_id, participant_name, participant_phone, prize_title, prize_image, is_mystery, winner_index }
        const won = data?.participant_id != null
            ? { id: data.participant_id, name: data.participant_name }
            : null;
        if (!won) {
            console.error('draw_winner returned no winner:', data);
            setErrorMsg('No winner came back from the database. Please try again — if it keeps happening, check the draw_winner function in Supabase.');
            setFrozenPool(null);
            setHighlightId(null);
            setPhase('idle');
            // The database may still have saved a result — resync so counts stay correct
            try {
                const res = await drawService.getResults(eventId);
                if (mountedRef.current) setResults(res);
            } catch { /* keep current results */ }
            return;
        }
        // Scripted winner might not be in the grid — add them so the animation can land
        if (!ids.includes(won.id)) {
            setFrozenPool(prev => [...(prev ?? []), { id: won.id, name: won.name }]);
            ids.push(won.id);
        }

        // Slow down gradually, then land on the winner
        for (const ms of SLOWDOWN_STEPS_MS) {
            last = pickRandom(ids.filter(id => id !== won.id), last) ?? won.id;
            setHighlightId(last);
            await sleep(ms);
            if (!mountedRef.current) return;
        }
        await sleep(FINAL_STEP_MS);
        if (!mountedRef.current) return;

        setHighlightId(won.id);
        setWinner({ id: won.id, name: won.name });
        setResults(prev => [...prev, {
            prize_id: currentPrize.id,
            participant_id: won.id,
            winner_name: won.name,
            winner_index: data.winner_index,
        }]);
        setPhase('revealed');

        // Confetti fires inside the overlay's entrance timeline
        setTimeout(() => { if (mountedRef.current) setShowOverlay(true); }, OVERLAY_DELAY_MS);
        refreshParticipants(); // pick up new check-ins for the next draw
    };

    // ── After reveal ──
    const resetForNextDraw = () => {
        confetti.reset();
        setShowOverlay(false);
        setWinner(null);
        setFrozenPool(null);
        setHighlightId(null);
        setPhase('idle');
    };

    const handleNextWinner = () => resetForNextDraw();

    const handleNextPrize = () => {
        resetForNextDraw();
        setCurrentPrizeIndex(i => i + 1);
    };

    const goToSummary = async () => {
        try { await drawService.endSession(eventId); } catch { /* already ended */ }
        navigate(`/summary/${eventId}`);
    };

    const handleEndSession = () => {
        if (phase === 'drawing') return;
        if (!allDone && !window.confirm('End the draw session and view the Hall of Fame?')) return;
        goToSummary();
    };

    const cardState = (id) => {
        if (phase === 'revealed') return id === winner?.id ? 'winner' : 'dim';
        if (id !== highlightId) return 'normal';
        return phase === 'drawing' ? 'highlight' : 'glow';
    };

    // ── Loading ──
    if (loading) {
        return (
            <div className="western-screen min-h-screen flex items-center justify-center">
                <div className="font-rye text-2xl md:text-3xl text-west-gold animate-pulse">🤠 Loading Draw Session...</div>
            </div>
        );
    }

    // ── No prizes / all done ──
    if (prizes.length === 0 || allDone) {
        return (
            <div className="western-screen min-h-screen flex flex-col">
                <BrandingBar tagline={EVENT_TAGLINE} />
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="western-card text-center space-y-6 p-10 max-w-xl w-full">
                        <div className="text-6xl">{prizes.length === 0 ? '🌵' : '🤠'}</div>
                        <h1 className="font-rye text-3xl md:text-4xl text-west-gold">
                            {prizes.length === 0 ? 'No Prizes Yet' : 'All Prizes Claimed!'}
                        </h1>
                        <div className="rope-divider max-w-xs mx-auto" />
                        {errorMsg && <p className="text-[#F1A198] text-sm">{errorMsg}</p>}
                        <div className="relative z-10 flex flex-col sm:flex-row gap-3 justify-center">
                            {prizes.length > 0 && (
                                <button onClick={goToSummary} className="western-btn px-8 py-4 text-lg">
                                    🏆 View Hall of Fame
                                </button>
                            )}
                            <button onClick={() => navigate('/admin')} className="western-btn-secondary px-8 py-4 text-lg">
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main ──
    return (
        <div
            className="western-screen h-screen flex flex-row overflow-hidden"
            style={{
                backgroundImage: 'url(/bg1.webp)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            {/* Dark overlay over the background image */}
            <div className="absolute inset-0 bg-black/45 z-0 pointer-events-none" />

            <LeftWall />

            {/* Main content between the walls */}
            {/* z-20 (not z-10) so the fixed winner overlay inside it also covers the right wall */}
            <div className="relative z-20 flex-1 min-w-0 h-full flex flex-col overflow-hidden">
            <DustParticles />
            <BrandingBar tagline={EVENT_TAGLINE} />

            {/* Top bar */}
            <header className="relative z-20 shrink-0 px-4 md:px-6 py-3 flex justify-between items-center gap-4 bg-west-bg/60 border-b border-west-border/30">
                <div className="font-rye text-lg md:text-2xl text-west-cream truncate">{eventData?.name}</div>
                <button
                    onClick={handleEndSession}
                    disabled={phase === 'drawing'}
                    className="western-btn-danger shrink-0 px-4 py-2 text-sm"
                >
                    ⚡ End Session
                </button>
            </header>

            {/* Prize strip */}
            <section className="relative z-10 shrink-0 flex items-center justify-center gap-4 md:gap-6 px-4 py-6">
                {isMysteryHidden || !currentPrize?.image_url ? (
                    <div className={`w-28 h-28 md:w-36 md:h-36 rounded-xl border-2 flex items-center justify-center text-5xl md:text-6xl shrink-0 ${isMysteryHidden ? 'border-west-teal bg-west-teal/15' : 'border-west-border bg-west-card'}`}>
                        <span className="animate-float inline-block">🎁</span>
                    </div>
                ) : (
                    <img
                        key={`img-${currentPrize.id}`}
                        src={currentPrize.image_url}
                        alt={currentPrize.title}
                        className="w-28 h-28 md:w-36 md:h-36 object-contain rounded-xl border-2 border-west-border bg-west-card p-2 shrink-0 shadow-[0_0_25px_rgba(212,160,23,0.25)] animate-fade-in"
                    />
                )}
                <div className="min-w-0">
                    <span className="western-stamp">★ Prize #{currentPrize?.prize_order} ★</span>
                    {isMysteryHidden ? (
                        <h2 className="font-rye text-4xl md:text-6xl text-west-cream mt-2">🎁 Mystery Prize</h2>
                    ) : (
                        <h2 key={`title-${currentPrize?.id}`} className="font-rye text-4xl md:text-6xl text-west-gold mt-2 truncate drop-shadow-[0_0_18px_rgba(212,160,23,0.35)] animate-fade-in">
                            {currentPrize?.title}
                        </h2>
                    )}
                    <p className="font-oswald text-xs md:text-sm uppercase tracking-widest text-west-muted mt-1">
                        Winner {drawnForPrize} / {currentPrize?.winner_count}
                        <span className="text-west-border mx-2">✦</span>
                        {eligible.length} eligible cowboys
                    </p>
                </div>
            </section>

            <div className="relative z-10 shrink-0 px-4 md:px-6">
                <div className="rope-divider" />
            </div>

            {/* Name grid */}
            <main className="relative z-10 flex-1 overflow-y-auto px-4 md:px-6 pb-4">
                {pool.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-2">
                        <div className="text-6xl opacity-30">🌵</div>
                        <p className="font-oswald uppercase tracking-widest text-west-muted">No eligible cowboys in town.</p>
                    </div>
                ) : (
                    <div
                        className="grid gap-2 md:gap-3 py-4"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
                    >
                        {pool.map(p => (
                            <NameCard key={p.id} name={p.name} state={cardState(p.id)} />
                        ))}
                    </div>
                )}
            </main>

            {/* Controls */}
            <footer className="relative z-20 shrink-0 px-4 py-4 border-t border-west-border/40 bg-west-surface/85 flex flex-col items-center gap-2">
                {errorMsg && (
                    <div className="bg-west-danger/15 border border-west-danger/50 text-[#F1A198] px-4 py-2 rounded-lg text-sm">⚠️ {errorMsg}</div>
                )}
                <div className="w-full max-w-5xl flex items-stretch gap-3">
                    {phase === 'idle' && (
                        <>
                            <button
                                onClick={() => setPaused(p => !p)}
                                disabled={pool.length === 0}
                                className="western-btn-secondary shrink-0 px-5 md:px-8 py-4 text-lg"
                            >
                                {paused ? '▶ Giddy Up!' : '⏸ Hold Your Horses'}
                            </button>
                            <DrawButton onClick={handleDraw} disabled={prizeComplete} />
                        </>
                    )}
                    {phase === 'drawing' && (
                        <div className="flex-1 py-5 text-center font-rye text-2xl md:text-3xl text-west-gold tracking-widest animate-pulse border-2 border-dashed border-west-border/60 rounded-xl">
                            🎲 DRAWING FATE...
                        </div>
                    )}
                    {phase === 'revealed' && !showOverlay && (
                        <div className="flex-1 py-5 text-center font-rye text-2xl md:text-3xl text-west-winner">
                            👑 {winner?.name}
                        </div>
                    )}
                </div>
            </footer>

            {/* Winner overlay */}
            {showOverlay && winner && (
                <WinnerOverlay winner={winner} prize={currentPrize}>
                    {!prizeComplete ? (
                        <button onClick={handleNextWinner} className="western-btn-secondary px-10 py-4 text-lg">
                            Next Winner ➡️
                        </button>
                    ) : !isLastPrize ? (
                        <button onClick={handleNextPrize} className="western-btn px-10 py-4 text-lg shadow-[0_10px_30px_rgba(212,160,23,0.35)]">
                            Next Prize
                        </button>
                    ) : (
                        <button onClick={goToSummary} className="western-btn px-10 py-4 text-lg shadow-[0_10px_30px_rgba(212,160,23,0.35)]">
                            🏆 View Hall of Fame
                        </button>
                    )}
                </WinnerOverlay>
            )}
            </div>

            <RightWall />
        </div>
    );
};

export default DrawScreen;
