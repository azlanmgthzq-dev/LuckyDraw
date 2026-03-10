import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import prizeService from '../services/prizeService';
import drawService from '../services/drawService';

const NAME_POOL = [
    'Ahmad', 'Siti', 'Razif', 'Nurul', 'Hafiz', 'Aishah', 'Zulkifli', 'Fatimah',
    'Ismail', 'Rohani', 'Azman', 'Norzahra', 'Kamal', 'Suraya', 'Firdaus'
];

const BG_STYLE = {
    backgroundImage: `url('/LandscapeBg2.png')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
};

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

    const getRandomName = () => NAME_POOL[Math.floor(Math.random() * NAME_POOL.length)];

    // ── Loading ───────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center" style={BG_STYLE}>
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 text-2xl text-yellow-500 animate-pulse">Loading Draw Session...</div>
            </div>
        );
    }

    // ── All Completed ─────────────────────────────────────────────
    if (allCompleted) {
        return (
            <div className="min-h-screen text-white flex flex-col items-center justify-center relative overflow-hidden" style={BG_STYLE}>
                <div className="absolute inset-0 bg-black/40 z-0" />
                <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-transparent to-transparent opacity-50" />
                <div className="z-20 text-center space-y-8 p-8 max-w-2xl bg-black/50 backdrop-blur-md rounded-3xl border border-yellow-500/30">
                    <h1 className="text-4xl md:text-5xl font-black text-yellow-400 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                        🎉 Tahniah! Semua Hadiah Telah Diagihkan!
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300">
                        Congratulations! All Prizes Have Been Distributed!
                    </p>
                    <div className="pt-8 flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                            onClick={handleEndSession}
                            className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white text-lg font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(202,138,4,0.3)]"
                        >
                            Lihat Keputusan / View Results
                        </button>
                        <button
                            onClick={() => navigate('/admin')}
                            className="px-8 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-lg font-bold rounded-xl transition-colors"
                        >
                            Kembali ke Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Main Draw Screen ──────────────────────────────────────────
    return (
        <div className="min-h-screen relative flex flex-col items-center font-sans overflow-hidden" style={BG_STYLE}>
            <div className="absolute inset-0 bg-black/30 z-0" />

            {/* Top Bar */}
            <header className="w-full relative z-20 px-6 py-4 flex justify-between items-center bg-black/30 backdrop-blur-sm border-b border-white/10">
                <div className="text-xl md:text-2xl font-bold text-yellow-400 drop-shadow-md">
                    {eventData?.name || 'Loading Event...'}
                </div>
                <button
                    onClick={handleEndSession}
                    className="bg-red-900/60 hover:bg-red-600 border border-red-500/50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                >
                    Tamat Sesi / End Session
                </button>
            </header>

            {/* Main Content */}
            <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto flex flex-col items-center justify-center p-4 py-6 gap-6">

                {/* Prize Info */}
                <div className="text-center flex flex-col items-center gap-3">
                    {currentPrize?.image_url ? (
                        <div className="relative">
                            <img
                                src={currentPrize.image_url}
                                alt={currentPrize.title}
                                className="w-40 h-40 md:w-52 md:h-52 object-contain rounded-2xl border-2 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.25)] bg-black/30 backdrop-blur-sm p-2"
                            />
                            <div className="absolute inset-0 rounded-2xl bg-yellow-500/10 blur-xl -z-10 scale-110" />
                        </div>
                    ) : (
                        <div className="w-40 h-40 md:w-52 md:h-52 rounded-2xl border-2 border-yellow-500/30 bg-black/30 backdrop-blur-sm flex items-center justify-center text-6xl">
                            🏆
                        </div>
                    )}

                    <div className="inline-block bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-4 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase">
                        Hadiah Ke-{currentPrize?.prize_order} / Prize #{currentPrize?.prize_order}
                    </div>

                    <h2 className="text-3xl md:text-5xl font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {currentPrize?.title || 'Loading Prize...'}
                    </h2>

                    <p className="text-lg text-gray-200 drop-shadow-md">
                        {winners.length} / {currentPrize?.winner_count} Pemenang
                    </p>
                </div>

                {/* ── Dynamic Slots ── */}
                <div className={`flex flex-col md:flex-row gap-4 md:gap-6 w-full max-w-4xl justify-center ${slotCount === 1 ? 'md:max-w-sm' : slotCount === 2 ? 'md:max-w-xl' : 'md:max-w-4xl'
                    }`}>
                    {slots.map((slotValue, i) => {
                        const isWinnerSlot = i === centerIndex;

                        let slotStyle = "flex-1 h-[110px] rounded-2xl flex items-center justify-center transition-all duration-300 ";
                        let textStyle = "font-bold text-center w-full px-4 overflow-hidden text-ellipsis whitespace-nowrap ";

                        // Single slot — bigger
                        if (slotCount === 1) {
                            slotStyle += "min-w-[260px] max-w-[400px] h-[130px] ";
                            textStyle += "text-2xl ";
                        } else {
                            slotStyle += "min-w-[160px] max-w-[280px] ";
                            textStyle += "text-xl ";
                        }

                        if (isDrawing) {
                            slotStyle += "bg-black/70 border-2 border-red-500/50 shadow-[inset_0_0_20px_rgba(220,38,38,0.2)]";
                            textStyle += "text-yellow-300 blur-[1px]";
                        } else if (isRevealed && isWinnerSlot) {
                            slotStyle += "bg-black/80 border-2 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.4)] transform scale-105 z-10";
                            textStyle += "text-yellow-400 font-black drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]";
                            if (slotCount === 1) textStyle += " text-3xl";
                            else textStyle += " text-2xl";
                        } else {
                            slotStyle += "bg-black/50 border-2 border-white/20 backdrop-blur-sm";
                            textStyle += "text-gray-300";
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
                    <div className="bg-red-500/20 border border-red-500 text-white px-6 py-3 rounded-xl font-medium animate-pulse">
                        ⚠️ {errorMsg}
                    </div>
                )}

                {/* Winner Reveal */}
                {isRevealed && !isDrawing && winners.length > 0 && (
                    <div className="text-center bg-black/40 backdrop-blur-md border border-yellow-500/30 rounded-2xl px-8 py-5">
                        <div className="text-sm text-yellow-400 font-bold uppercase tracking-widest mb-1">🎉 Pemenang</div>
                        <div className="text-3xl md:text-4xl font-black text-white mb-1 drop-shadow-md">
                            {winners[winners.length - 1].name || 'Anonymous Winner'}
                        </div>
                        <div className="text-base text-gray-300 font-mono bg-black/30 px-5 py-1.5 rounded-full inline-block border border-gray-600">
                            {winners[winners.length - 1].email || `ID: #${winners[winners.length - 1].id}`}
                        </div>
                    </div>
                )}

                {/* Controls */}
                <div className="flex flex-col items-center gap-4">
                    {!isRevealed && !isCurrentPrizeComplete ? (
                        <button
                            onClick={handleDraw}
                            disabled={isDrawing}
                            className={`px-12 py-5 bg-gradient-to-r from-red-700 to-red-500 text-white text-2xl md:text-3xl font-black rounded-2xl shadow-[0_10px_25px_rgba(220,38,38,0.5)] transition-all ${isDrawing
                                ? 'opacity-50 cursor-not-allowed scale-95'
                                : 'hover:scale-105 hover:from-red-600 hover:to-red-400 active:scale-95'
                                }`}
                        >
                            {isDrawing ? 'SEDANG MENGUNDI...' : '🎲 CARI PEMENANG'}
                        </button>
                    ) : (
                        <div className="flex gap-4">
                            {!isCurrentPrizeComplete ? (
                                <button
                                    onClick={handleNextWinner}
                                    className="bg-yellow-600 hover:bg-yellow-500 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-[0_0_15px_rgba(202,138,4,0.4)] transition-transform hover:scale-105"
                                >
                                    Pemenang Seterusnya / Next Winner
                                </button>
                            ) : (
                                <button
                                    onClick={handleNextPrize}
                                    className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-xl text-xl font-bold shadow-[0_0_15px_rgba(22,163,74,0.4)] transition-transform hover:scale-105"
                                >
                                    Hadiah Seterusnya / Next Prize ➡️
                                </button>
                            )}
                        </div>
                    )}
                </div>

            </main>

            {/* Bottom Bar */}
            <div className="w-full relative z-20 text-center py-3 bg-black/30 border-t border-white/10 text-gray-400 text-sm">
                Sistem Cabutan Bertuah Digital • v1.0
            </div>
        </div>
    );
};

export default DrawScreen;