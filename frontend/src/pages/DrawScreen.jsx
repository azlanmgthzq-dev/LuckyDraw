import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import prizeService from '../services/prizeService';
import drawService from '../services/drawService';
import participantService from '../services/participantService';

// Removed static background in favor of tailwind ambient gradients
const BG_STYLE = {};

// How many decoration slots to show based on winner_count
// winner_count = 1 → 1 slot (just the winner, centered, big)
// winner_count = 2 → 2 slots
// winner_count >= 3 → 3 slots (left noise | winner | right noise)
const getSlotCount = (winnerCount) => {
    if (winnerCount === 1) return 1;
    if (winnerCount === 2) return 2;
    return 3;
};

const DrawScreen = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [eventData, setEventData] = useState(null);
    const [prizes, setPrizes] = useState([]);
    const [currentPrizeIndex, setCurrentPrizeIndex] = useState(0);
    const [winners, setWinners] = useState([]);
    const [allCompleted, setAllCompleted] = useState(false);

    const [isDrawing, setIsDrawing] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [slots, setSlots] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(true);

    const animationRef = useRef(null);
    // Real participant names used for the spinning slot animation
    const namePoolRef = useRef([]);

    // ── Init ──────────────────────────────────────────────────────
    useEffect(() => {
        const initializeSession = async () => {
            try {
                setLoading(true);
                const evData = await eventService.getById(eventId);
                setEventData(evData);

                try {
                    await drawService.startSession(eventId);
                } catch {
                    console.log('Session may already exist, continuing...');
                }

                try {
                    const parts = await participantService.getAll(eventId);
                    namePoolRef.current = parts.map(p => p.name).filter(Boolean);
                } catch {
                    namePoolRef.current = [];
                }

                const przs = await prizeService.getAll(eventId);
                if (przs.length === 0) {
                    setErrorMsg('Tiada hadiah didaftarkan untuk acara ini.');
                    setAllCompleted(true);
                } else {
                    setPrizes(przs);
                    setCurrentPrizeIndex(0);
                    // Init slots based on first prize winner_count
                    setSlots(Array(getSlotCount(przs[0].winner_count)).fill(''));
                }
            } catch (err) {
                console.error(err);
                setErrorMsg('Gagal memulakan sesi cabutan.');
            } finally {
                setLoading(false);
            }
        };

        if (eventId) initializeSession();
        return () => { if (animationRef.current) clearInterval(animationRef.current); };
    }, [eventId]);

    const currentPrize = prizes[currentPrizeIndex];
    const slotCount = currentPrize ? getSlotCount(currentPrize.winner_count) : 1;

    // Center slot index — where winner name appears
    const centerIndex = slotCount === 1 ? 0 : slotCount === 2 ? 1 : 1;

    const isCurrentPrizeComplete = currentPrize && (winners.length >= currentPrize.winner_count);

    // Mystery prize: hide title + image until the first winner is revealed
    const isMysteryHidden = !!currentPrize?.is_mystery && winners.length === 0;

    // ── Handlers ──────────────────────────────────────────────────
    const handleDraw = async () => {
        if (isDrawing || !currentPrize) return;
        setErrorMsg('');
        setIsDrawing(true);
        setIsRevealed(false);
        setSlots(Array(slotCount).fill(''));

        try {
            startSlotAnimation(slotCount);
            const winnerData = await drawService.draw(currentPrize.id);
            setTimeout(() => {
                stopSlotAnimation(winnerData.winner, slotCount);
            }, 3000);
        } catch (err) {
            console.error(err);
            stopSlotAnimation(null, slotCount, true);
            setErrorMsg(err.response?.data?.message || 'Gagal mencari pemenang.');
        }
    };

    const handleNextWinner = () => {
        setIsRevealed(false);
        setSlots(Array(slotCount).fill(''));
    };

    const handleNextPrize = () => {
        if (currentPrizeIndex < prizes.length - 1) {
            const nextPrize = prizes[currentPrizeIndex + 1];
            setCurrentPrizeIndex(prev => prev + 1);
            setWinners([]);
            setIsRevealed(false);
            setSlots(Array(getSlotCount(nextPrize.winner_count)).fill(''));
        } else {
            setAllCompleted(true);
        }
    };

    const handleEndSession = async () => {
        try {
            await drawService.endSession(eventId);
        } catch (err) {
            console.error(err);
        } finally {
            navigate('/admin');
        }
    };

    // ── Animation ─────────────────────────────────────────────────
    const startSlotAnimation = (count) => {
        if (animationRef.current) clearInterval(animationRef.current);
        animationRef.current = setInterval(() => {
            setSlots(Array(count).fill(null).map(() => getRandomName()));
        }, 80);
    };

    const stopSlotAnimation = (winnerData, count, isError = false) => {
        if (animationRef.current) clearInterval(animationRef.current);
        setIsDrawing(false);

        if (isError || !winnerData) {
            setSlots(Array(count).fill('ERROR'));
            return;
        }

        const winnerName = winnerData.name || winnerData.email || `ID: ${winnerData.id}`;
        const center = count === 1 ? 0 : 1;

        const newSlots = Array(count).fill(null).map((_, i) =>
            i === center ? winnerName : getRandomName()
        );

        setSlots(newSlots);
        setWinners(prev => [...prev, winnerData]);
        setIsRevealed(true);
    };

    const getRandomName = () => {
        const pool = namePoolRef.current;
        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : '???';
    };

    // ── Loading ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center relative overflow-hidden" style={BG_STYLE}>
                {/* Minimalist ambient red glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-red-600/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="relative z-10 text-xl md:text-2xl text-red-500 font-bold tracking-widest animate-pulse">Loading Draw Session...</div>
            </div>
        );
    }

    // ── All Completed ─────────────────────────────────────────────
    if (allCompleted) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
                {/* Deep crimson ambient background */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-rose-900/20 rounded-full blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

                <div className="z-20 text-center space-y-8 p-10 max-w-2xl bg-white/5 backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-[2.5rem] pointer-events-none" />
                    
                    <h1 className="text-4xl md:text-5xl font-black text-white relative">
                        🎉 Semua Hadiah Selesai!
                    </h1>
                    <p className="text-xl md:text-2xl text-red-200/80 font-medium">
                        Tahniah kepada semua pemenang
                    </p>
                    <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                        <button
                            onClick={handleEndSession}
                            className="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-lg font-bold rounded-2xl transition-all shadow-[0_8px_30px_rgba(225,29,72,0.3)] hover:scale-[1.02] active:scale-95"
                        >
                            Lihat Keputusan
                        </button>
                        <button
                            onClick={() => navigate('/admin')}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-lg font-bold rounded-2xl transition-all hover:scale-[1.02] active:scale-95"
                        >
                            Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main Draw Screen ──────────────────────────────────────────
    return (
        <div className="min-h-screen relative flex flex-col items-center font-sans overflow-hidden bg-slate-950">
            {/* Ambient Red & Rose Glows */}
            <div className="absolute top-[-5%] left-[-10%] w-[350px] h-[350px] sm:w-[600px] sm:h-[600px] bg-red-600/10 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '5s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] sm:w-[600px] sm:h-[600px] bg-rose-900/20 rounded-full blur-[120px] sm:blur-[160px] pointer-events-none animate-pulse" style={{ animationDuration: '7s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] bg-red-900/5 rounded-full blur-[100px] sm:blur-[160px] pointer-events-none" />

            {/* Top Bar */}
            <header className="w-full relative z-20 px-6 py-4 flex justify-between items-center bg-white/[0.02] backdrop-blur-md border-b border-white/5">
                <div className="text-xl md:text-2xl font-bold text-white/90 tracking-wide drop-shadow-md">
                    {eventData?.name || 'Loading Event...'}
                </div>
                <button
                    onClick={handleEndSession}
                    className="bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                >
                    Tamat Sesi
                </button>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-4 py-6 gap-8">

                {/* Prize Info */}
                <div className="text-center flex flex-col items-center gap-4 animate-fade-in-up">
                    {isMysteryHidden ? (
                        <div className="relative group perspective-1000">
                            <div className="w-40 h-40 md:w-52 md:h-52 rounded-[2rem] border border-purple-400/30 bg-gradient-to-br from-purple-600/20 to-rose-600/10 backdrop-blur-md flex items-center justify-center text-[5rem] md:text-[6.5rem] shadow-[0_10px_40px_rgba(147,51,234,0.3)]">
                                <span className="animate-float inline-block drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)]">🎁</span>
                            </div>
                            <div className="absolute inset-0 rounded-[2rem] bg-purple-500/20 blur-2xl -z-10" />
                        </div>
                    ) : currentPrize?.image_url ? (
                        <div className="relative group perspective-1000">
                            <img
                                key={`img-${currentPrize.id}`}
                                src={currentPrize.image_url}
                                alt={currentPrize.title}
                                className={`w-40 h-40 md:w-52 md:h-52 object-contain rounded-[2rem] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] bg-white/5 backdrop-blur-sm p-4 transform transition-all duration-700 hover:scale-[1.02] hover:rotate-y-6 ${currentPrize.is_mystery ? 'animate-fade-in' : ''}`}
                            />
                            <div className="absolute inset-0 rounded-[2rem] bg-red-500/10 blur-2xl -z-10 group-hover:bg-red-500/20 transition-all duration-700" />
                        </div>
                    ) : (
                        <div className="relative group perspective-1000">
                            <div className="w-40 h-40 md:w-52 md:h-52 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/[0.08] to-white/[0.02] backdrop-blur-md flex items-center justify-center text-[5rem] md:text-[6.5rem] transform transition-all duration-700 hover:scale-[1.03] hover:-rotate-y-12 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                                <span className="animate-float inline-block drop-shadow-[0_20px_20px_rgba(0,0,0,0.8)] filter contrast-125 saturate-150" style={{ textShadow: '0 10px 20px rgba(0,0,0,0.5)' }}>🎁</span>
                            </div>
                            <div className="absolute inset-0 rounded-[2rem] bg-rose-500/10 blur-2xl -z-10 group-hover:bg-rose-500/25 transition-all duration-700" />
                        </div>
                    )}

                    <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase backdrop-blur-sm mt-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                        Hadiah Ke-{currentPrize?.prize_order}
                    </div>

                    {isMysteryHidden ? (
                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-purple-300 tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                            🎁 Hadiah Misteri
                        </h2>
                    ) : (
                        // key changes on reveal so the fade-in animation replays
                        <h2
                            key={`title-${currentPrize?.id}-${currentPrize?.is_mystery ? 'revealed' : 'plain'}`}
                            className={`text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)] ${currentPrize?.is_mystery ? 'animate-fade-in-up' : ''}`}
                        >
                            {currentPrize?.title || 'Loading Prize...'}
                        </h2>
                    )}

                    <p className="text-base text-gray-400 font-medium tracking-wide">
                        {winners.length} / {currentPrize?.winner_count} Pemenang Separuh Masa
                    </p>
                </div>

                {/* ── Dynamic Slots ── */}
                <div className={`flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-4xl justify-center ${slotCount === 1 ? 'md:max-w-sm' : slotCount === 2 ? 'md:max-w-xl' : 'md:max-w-4xl'
                    } perspective-1000`}>
                    {slots.map((slotValue, i) => {
                        const isWinnerSlot = i === centerIndex;

                        let slotStyle = "flex-1 h-[110px] rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ease-out transform ";
                        let textStyle = "font-bold text-center w-full px-6 overflow-hidden text-ellipsis whitespace-nowrap transition-all duration-300 ";

                        // Single slot — bigger
                        if (slotCount === 1) {
                            slotStyle += "min-w-[280px] max-w-[420px] h-[140px] ";
                            textStyle += "text-2xl md:text-3xl ";
                        } else {
                            slotStyle += "min-w-[180px] max-w-[300px] h-[120px] ";
                            textStyle += "text-xl md:text-2xl ";
                        }

                        if (isDrawing) {
                            slotStyle += "bg-white/5 border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] backdrop-blur-md ";
                            textStyle += "text-white/40 blur-[2px] scale-95";
                        } else if (isRevealed && isWinnerSlot) {
                            slotStyle += "bg-gradient-to-br from-red-600/90 to-rose-700/90 border border-red-400/50 shadow-[0_0_50px_rgba(225,29,72,0.4)] scale-105 z-10 backdrop-blur-xl ";
                            textStyle += "text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] tracking-wide";
                            if (slotCount === 1) textStyle += " text-3xl md:text-4xl";
                        } else {
                            slotStyle += "bg-white/[0.03] border border-white/5 backdrop-blur-md ";
                            textStyle += "text-gray-500 font-medium";
                        }

                        return (
                            <div key={i} className={slotStyle}>
                                <div className={textStyle}>
                                    {slotValue || '---'}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-3 rounded-2xl font-medium text-sm backdrop-blur-sm animate-fade-in">
                        ⚠️ {errorMsg}
                    </div>
                )}

                {/* Winner Reveal Info Plate */}
                {isRevealed && !isDrawing && winners.length > 0 && (
                    <div className="text-center bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2rem] px-10 py-6 animate-fade-in-up mt-4 shadow-2xl">
                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-[0.3em] mb-2 opacity-80">🎉 Pemenang Disahkan</div>
                        <div className="text-3xl md:text-4xl font-black text-white mb-3 tracking-tight">
                            {winners[winners.length - 1].name || 'Anonymous'}
                        </div>
                        <div className="text-sm text-gray-400 font-mono bg-black/40 px-5 py-2 rounded-xl inline-block border border-white/5">
                            {winners[winners.length - 1].email || `ID: #${winners[winners.length - 1].id}`}
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-col items-center gap-4 mt-6">
                    {!isRevealed && !isCurrentPrizeComplete ? (
                        <button
                            onClick={handleDraw}
                            disabled={isDrawing}
                            className={`relative group px-12 py-5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xl md:text-2xl font-black rounded-2xl transition-all outline-none ${isDrawing
                                    ? 'opacity-50 cursor-not-allowed scale-[0.98]'
                                    : 'hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_40px_rgba(225,29,72,0.4)] hover:shadow-[0_10px_50px_rgba(225,29,72,0.6)]'
                                }`}
                        >
                            <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            {isDrawing ? (
                                <span className="tracking-[0.2em] font-medium text-lg">MENGUNDI...</span>
                            ) : (
                                <span className="flex items-center gap-3">
                                    <span className="text-2xl">🎲</span> CARI PEMENANG
                                </span>
                            )}
                        </button>
                    ) : (
                        <div className="flex gap-4 animate-fade-in">
                            {!isCurrentPrizeComplete ? (
                                <button
                                    onClick={handleNextWinner}
                                    className="bg-white/10 hover:bg-white/15 border border-white/10 text-white px-8 py-4 rounded-2xl text-lg font-bold backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Pemenang Seterusnya
                                </button>
                            ) : (
                                <button
                                    onClick={handleNextPrize}
                                    className="bg-red-600/90 hover:bg-red-500 text-white px-10 py-4 rounded-2xl text-lg font-bold backdrop-blur-md shadow-[0_10px_30px_rgba(220,38,38,0.3)] border border-red-500/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Hadiah Seterusnya ➡️
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </main>

            {/* Bottom Bar */}
            <div className="w-full relative z-20 text-center py-4 bg-transparent text-gray-600 text-[10px] tracking-widest uppercase font-bold">
                Sistem Cabutan Bertuah Digital • Minimalist Red
            </div>
        </div>
    );
};

export default DrawScreen;