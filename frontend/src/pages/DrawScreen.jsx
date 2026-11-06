import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import eventService from '../services/eventService';
import prizeService from '../services/prizeService';
import drawService from '../services/drawService';
import participantService from '../services/participantService';
import { isPresent } from '../utils/participants';

// ── Animation timing ────────────────────────────────────────────
const IDLE_STEP_MS = 280;          // slow random highlight before drawing
const FAST_STEP_MS = 70;           // rapid flashing while drawing
const FAST_PHASE_MS = 2200;        // minimum time of rapid flashing
const SLOWDOWN_STEPS_MS = [90, 110, 140, 180, 230, 290, 360, 440, 540]; // then lands on winner
const FINAL_STEP_MS = 650;
const OVERLAY_DELAY_MS = 1200;     // let the gold winner card shine before the overlay

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const pickRandom = (ids, exclude) => {
    if (ids.length === 0) return null;
    if (ids.length === 1) return ids[0];
    let id;
    do { id = ids[Math.floor(Math.random() * ids.length)]; } while (id === exclude);
    return id;
};

// Full-screen confetti for ~3 seconds
const fireConfetti = () => {
    const end = Date.now() + 3000;
    const colors = ['#facc15', '#f59e0b', '#ef4444', '#ffffff', '#fb7185'];
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.6 }, colors, zIndex: 9999 });
    (function frame() {
        confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 }, colors, zIndex: 9999 });
        confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 }, colors, zIndex: 9999 });
        if (Date.now() < end) requestAnimationFrame(frame);
    })();
};

// ── Name card ───────────────────────────────────────────────────
const NameCard = memo(function NameCard({ name, state }) {
    // state: normal | highlight | winner | dim
    const base = 'relative rounded-xl border px-2 py-3 flex items-center justify-center text-center min-h-[64px] select-none';
    const styles = {
        normal: 'bg-white/[0.04] border-white/10 text-gray-300 transition-all duration-300',
        highlight: 'bg-yellow-400/90 border-yellow-200 text-black scale-105 shadow-[0_0_25px_rgba(250,204,21,0.7)] z-10',
        winner: 'bg-gradient-to-br from-yellow-300 to-amber-500 border-yellow-100 text-black scale-125 z-20 animate-winner-glow transition-all duration-500',
        dim: 'bg-white/[0.02] border-white/5 text-gray-600 opacity-20 transition-all duration-700',
    };
    return (
        <div className={`${base} ${styles[state]}`}>
            {state === 'winner' && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</span>
            )}
            <span className={`font-bold leading-tight line-clamp-2 ${state === 'winner' ? 'text-base md:text-lg font-black' : 'text-xs md:text-sm'}`}>
                {name}
            </span>
        </div>
    );
});

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
                setErrorMsg('Gagal memulakan sesi cabutan.');
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
            setErrorMsg(err.message || 'Gagal mencari pemenang.');
            setFrozenPool(null);
            setHighlightId(null);
            setPhase('idle');
            return;
        }
        clearInterval(fast);
        if (!mountedRef.current) return;

        const won = data.winner;
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
        fireConfetti();

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
        if (!allDone && !window.confirm('Tamatkan sesi cabutan dan lihat ringkasan?')) return;
        goToSummary();
    };

    const cardState = (id) => {
        if (phase === 'revealed') return id === winner?.id ? 'winner' : 'dim';
        return id === highlightId ? 'highlight' : 'normal';
    };

    // ── Loading ──
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="text-xl md:text-2xl text-red-500 font-bold tracking-widest animate-pulse">Loading Draw Session...</div>
            </div>
        );
    }

    // ── No prizes / all done ──
    if (prizes.length === 0 || allDone) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden p-6">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="z-10 text-center space-y-6 p-10 max-w-xl bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10">
                    <h1 className="text-3xl md:text-4xl font-black">
                        {prizes.length === 0 ? 'Tiada hadiah didaftarkan' : '🎉 Semua Hadiah Selesai!'}
                    </h1>
                    {errorMsg && <p className="text-red-300 text-sm">{errorMsg}</p>}
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        {prizes.length > 0 && (
                            <button onClick={goToSummary} className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-lg font-bold rounded-2xl transition-all hover:scale-[1.02]">
                                Lihat Ringkasan 📋
                            </button>
                        )}
                        <button onClick={() => navigate('/admin')} className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-lg font-bold rounded-2xl">
                            Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main ──
    return (
        <div className="h-screen relative flex flex-col font-sans overflow-hidden bg-slate-950 text-white">
            <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-rose-900/20 rounded-full blur-[160px] pointer-events-none" />

            {/* Top bar */}
            <header className="relative z-20 px-4 md:px-6 py-3 flex justify-between items-center bg-white/[0.02] backdrop-blur-md border-b border-white/5 shrink-0">
                <div className="text-lg md:text-xl font-bold text-white/90 truncate">{eventData?.name}</div>
                <button
                    onClick={handleEndSession}
                    disabled={phase === 'drawing'}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                >
                    Tamat Sesi
                </button>
            </header>

            {/* Prize strip */}
            <section className="relative z-10 shrink-0 flex items-center justify-center gap-4 md:gap-6 px-4 py-4">
                {isMysteryHidden || !currentPrize?.image_url ? (
                    <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl border flex items-center justify-center text-4xl md:text-5xl shrink-0 ${isMysteryHidden ? 'border-purple-400/30 bg-purple-600/20' : 'border-white/10 bg-white/5'}`}>
                        <span className="animate-float inline-block">🎁</span>
                    </div>
                ) : (
                    <img
                        key={`img-${currentPrize.id}`}
                        src={currentPrize.image_url}
                        alt={currentPrize.title}
                        className="w-20 h-20 md:w-24 md:h-24 object-contain rounded-2xl border border-white/10 bg-white/5 p-2 shrink-0 animate-fade-in"
                    />
                )}
                <div className="min-w-0">
                    <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase">
                        Hadiah Ke-{currentPrize?.prize_order}
                    </div>
                    {isMysteryHidden ? (
                        <h2 className="text-2xl md:text-4xl font-black text-purple-300 mt-1">🎁 Hadiah Misteri</h2>
                    ) : (
                        <h2 key={`title-${currentPrize?.id}`} className="text-2xl md:text-4xl font-black mt-1 truncate animate-fade-in">
                            {currentPrize?.title}
                        </h2>
                    )}
                    <p className="text-xs md:text-sm text-gray-400 mt-1">
                        Pemenang {drawnForPrize} / {currentPrize?.winner_count} • {eligible.length} peserta layak
                    </p>
                </div>
            </section>

            {/* Name grid */}
            <main className="relative z-10 flex-1 overflow-y-auto px-4 md:px-6 pb-4">
                {pool.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                        <div className="text-6xl opacity-30">👥</div>
                        <p>Tiada peserta yang hadir dan layak.</p>
                    </div>
                ) : (
                    <div
                        className="grid gap-2 md:gap-3 py-3"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}
                    >
                        {pool.map(p => (
                            <NameCard key={p.id} name={p.name} state={cardState(p.id)} />
                        ))}
                    </div>
                )}
            </main>

            {/* Controls */}
            <footer className="relative z-20 shrink-0 px-4 py-4 border-t border-white/5 bg-black/30 backdrop-blur-md flex flex-col items-center gap-2">
                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-sm">⚠️ {errorMsg}</div>
                )}
                <div className="flex items-center gap-3">
                    {phase === 'idle' && (
                        <>
                            <button
                                onClick={() => setPaused(p => !p)}
                                disabled={pool.length === 0}
                                className="px-5 py-4 bg-white/10 hover:bg-white/15 border border-white/10 rounded-2xl text-base font-bold transition-all disabled:opacity-40"
                            >
                                {paused ? '▶ Teruskan' : '⏸ Jeda'}
                            </button>
                            <button
                                onClick={handleDraw}
                                disabled={prizeComplete}
                                className="px-10 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xl md:text-2xl font-black rounded-2xl shadow-[0_10px_40px_rgba(225,29,72,0.4)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40"
                            >
                                🎲 CARI PEMENANG
                            </button>
                        </>
                    )}
                    {phase === 'drawing' && (
                        <div className="px-10 py-4 bg-white/5 border border-white/10 rounded-2xl text-lg font-bold tracking-[0.3em] text-yellow-300 animate-pulse">
                            MENGUNDI...
                        </div>
                    )}
                    {phase === 'revealed' && !showOverlay && (
                        <div className="px-10 py-4 text-lg font-bold text-yellow-300">🎉 {winner?.name}</div>
                    )}
                </div>
            </footer>

            {/* Winner overlay */}
            {showOverlay && winner && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="text-center max-w-3xl w-full flex flex-col items-center gap-5">
                        <div className="text-4xl md:text-6xl font-black text-yellow-400 tracking-wide animate-pop-in drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]">
                            🎉 TAHNIAH!
                        </div>
                        <div className="text-5xl md:text-7xl lg:text-8xl font-black text-white leading-tight break-words animate-fade-in-up">
                            {winner.name}
                        </div>

                        <div className="flex flex-col items-center gap-3 mt-2 animate-fade-in-up">
                            {currentPrize?.image_url ? (
                                <img
                                    src={currentPrize.image_url}
                                    alt={currentPrize.title}
                                    className="w-40 h-40 md:w-52 md:h-52 object-contain rounded-3xl border border-yellow-400/30 bg-white/5 p-3 shadow-[0_0_50px_rgba(250,204,21,0.25)]"
                                />
                            ) : (
                                <div className="text-7xl">🎁</div>
                            )}
                            <div className="text-sm text-gray-400 uppercase tracking-[0.3em]">memenangi</div>
                            <div className="text-2xl md:text-4xl font-black text-yellow-300">{currentPrize?.title}</div>
                        </div>

                        <div className="mt-6">
                            {!prizeComplete ? (
                                <button onClick={handleNextWinner} className="px-10 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-lg font-bold transition-all hover:scale-[1.02]">
                                    Pemenang Seterusnya ➡️
                                </button>
                            ) : !isLastPrize ? (
                                <button onClick={handleNextPrize} className="px-10 py-4 bg-red-600 hover:bg-red-500 rounded-2xl text-lg font-bold shadow-[0_10px_30px_rgba(220,38,38,0.4)] transition-all hover:scale-[1.02]">
                                    Hadiah Seterusnya ➡️
                                </button>
                            ) : (
                                <button onClick={goToSummary} className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black rounded-2xl text-lg font-black transition-all hover:scale-[1.02]">
                                    Lihat Ringkasan 📋
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DrawScreen;
