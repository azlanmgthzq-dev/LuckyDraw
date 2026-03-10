import React, { useState, useEffect } from 'react';
import participantPortalService from '../../services/participantPortalService';

// ─── Helpers ────────────────────────────────────────────────────────────────

function TimeLeft({ closesAt }) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const tick = () => {
            const dist = new Date(closesAt) - Date.now();
            if (dist <= 0) { setTimeLeft('TAMAT'); return; }
            const m = Math.floor(dist / 60000);
            const s = Math.floor((dist % 60000) / 1000);
            setTimeLeft(`${m}m ${s}s`);
        };
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [closesAt]);

    return (
        <span className="font-mono font-bold text-yellow-400">{timeLeft}</span>
    );
}

// ─── Draw Started — Waiting Screen (for participants) ────────────────────────
function DrawStartedView() {
    const [dots, setDots] = useState('');

    useEffect(() => {
        const iv = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.');
        }, 600);
        return () => clearInterval(iv);
    }, []);

    return (
        <div className="flex flex-col items-center gap-6 w-full max-w-sm text-center animate-fade-in">
            {/* Animated trophy */}
            <div className="relative">
                <div className="text-8xl animate-bounce" style={{ animationDuration: '2s' }}>🏆</div>
                <div className="absolute -inset-4 rounded-full bg-yellow-500/10 blur-2xl animate-pulse" />
            </div>

            <div>
                <h1 className="text-3xl font-black text-yellow-400 mb-2">
                    Cabutan Sedang Berlangsung!
                </h1>
                <p className="text-gray-300 text-sm leading-relaxed">
                    Draw Is In Progress
                </p>
            </div>

            {/* Pulse ring animation */}
            <div className="relative flex items-center justify-center w-24 h-24">
                <div className="absolute w-24 h-24 rounded-full border-2 border-yellow-400/30 animate-ping" />
                <div className="absolute w-16 h-16 rounded-full border-2 border-yellow-400/50 animate-ping" style={{ animationDelay: '0.3s' }} />
                <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-400/60 flex items-center justify-center">
                    <span className="text-yellow-400 text-lg">✨</span>
                </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm text-gray-400 leading-relaxed">
                Pendaftaran telah ditutup.<br />
                Sila saksikan skrin utama untuk melihat pemenang{dots}
                <br /><br />
                <span className="text-gray-500 text-xs">
                    Registration is closed. Watch the main screen for winners.
                </span>
            </div>
        </div>
    );
}

// ─── Views ───────────────────────────────────────────────────────────────────

function LandingView({ activeEvent, drawStarted, onShowRegister, onShowLogin }) {
    return (
        <div className="flex flex-col items-center gap-8 w-full max-w-sm text-center animate-fade-in">
            <div>
                <div className="text-6xl mb-4">🎉</div>
                <h1 className="text-4xl font-black text-white tracking-tight drop-shadow-lg mb-2">
                    Lucky Draw
                </h1>
                <p className="text-gray-300 text-sm">Portal Peserta / Participant Portal</p>
            </div>

            {/* Draw already started */}
            {drawStarted && (
                <div className="w-full bg-orange-500/15 border border-orange-400/40 rounded-2xl p-4 text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse inline-block" />
                        <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">
                            Cabutan Sedang Berlangsung
                        </span>
                    </div>
                    <div className="text-white font-bold text-sm mb-1">Pendaftaran Ditutup</div>
                    <div className="text-gray-400 text-xs">
                        Draw has started. Registration is now closed.
                    </div>
                </div>
            )}

            {/* Registration open */}
            {activeEvent && !drawStarted && (
                <div className="w-full bg-green-500/15 border border-green-400/40 rounded-2xl p-4 text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                        <span className="text-green-400 text-xs font-bold uppercase tracking-wider">
                            Pendaftaran Dibuka
                        </span>
                    </div>
                    <div className="text-white font-bold text-base mb-1">{activeEvent.name}</div>
                    <div className="text-gray-400 text-xs">
                        Tutup dalam: <TimeLeft closesAt={activeEvent.registration_closes_at} />
                    </div>
                </div>
            )}

            {/* No active event */}
            {!activeEvent && !drawStarted && (
                <div className="w-full bg-gray-800/60 border border-gray-600/40 rounded-2xl p-4 text-center">
                    <div className="text-gray-400 text-sm">
                        Tiada pendaftaran dibuka sekarang.<br />
                        <span className="text-gray-500 text-xs">No registration currently open.</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col gap-3 w-full">
                {activeEvent && !drawStarted && (
                    <button
                        onClick={onShowRegister}
                        className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-lg rounded-2xl shadow-[0_8px_20px_rgba(220,38,38,0.4)] transition-all hover:scale-[1.02] active:scale-95"
                    >
                        Daftar Sekarang / Register
                    </button>
                )}
                <button
                    onClick={onShowLogin}
                    className="w-full py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-base rounded-2xl backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-95"
                >
                    Log Masuk / Login
                </button>
            </div>
        </div>
    );
}

function RegisterView({ activeEvent, onSuccess, onBack }) {
    const [form, setForm] = useState({ name: '', phone: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const participant = await participantPortalService.register({
                ...form,
                event_id: activeEvent.id
            });
            participantPortalService.saveSession(participant);
            onSuccess(participant);
        } catch (err) {
            setError(err.response?.data?.message || 'Pendaftaran gagal. Cuba semula.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm animate-fade-in">
            <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
                ← Kembali
            </button>

            <h2 className="text-2xl font-black text-white mb-1">Daftar Masuk</h2>
            <p className="text-gray-400 text-sm mb-6">
                untuk <span className="text-yellow-400 font-semibold">{activeEvent?.name}</span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nama
                    </label>
                    <input
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        type="text"
                        placeholder="Nama anda"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all backdrop-blur-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nombor Telefon
                    </label>
                    <input
                        required
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        type="tel"
                        placeholder="+60123456789"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all backdrop-blur-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Email <span className="text-gray-600 normal-case">(optional)</span>
                    </label>
                    <input
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })}
                        type="email"
                        placeholder="email@contoh.com"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all backdrop-blur-sm"
                    />
                </div>

                {error && (
                    <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-sm rounded-xl px-4 py-3">
                        ⚠️ {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-[0_8px_20px_rgba(220,38,38,0.4)] transition-all hover:scale-[1.02] active:scale-95 mt-2"
                >
                    {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
                </button>
            </form>
        </div>
    );
}

function LoginView({ onSuccess, onBack }) {
    const [form, setForm] = useState({ name: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const participant = await participantPortalService.login(form.name, form.phone);
            participantPortalService.saveSession(participant);
            onSuccess(participant);
        } catch (err) {
            setError(err.response?.data?.message || 'Nama atau nombor telefon tidak sah.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm animate-fade-in">
            <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors">
                ← Kembali
            </button>

            <h2 className="text-2xl font-black text-white mb-1">Log Masuk</h2>
            <p className="text-gray-400 text-sm mb-6">Guna nama & nombor telefon yang didaftarkan</p>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nama Penuh
                    </label>
                    <input
                        required
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })}
                        type="text"
                        placeholder="Nama anda"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all backdrop-blur-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nombor Telefon
                    </label>
                    <input
                        required
                        value={form.phone}
                        onChange={e => setForm({ ...form, phone: e.target.value })}
                        type="tel"
                        placeholder="+60123456789"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all backdrop-blur-sm"
                    />
                </div>

                {error && (
                    <div className="bg-red-500/15 border border-red-500/40 text-red-300 text-sm rounded-xl px-4 py-3">
                        ⚠️ {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-white/15 hover:bg-white/25 border border-white/30 disabled:opacity-50 text-white font-black text-lg rounded-2xl backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-95 mt-2"
                >
                    {loading ? 'Memproses...' : 'Log Masuk'}
                </button>
            </form>
        </div>
    );
}

function ResultsView({ participant, onLogout }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedEvent, setExpandedEvent] = useState(null);

    useEffect(() => {
        participantPortalService.getCompletedEvents()
            .then(data => setEvents(data || []))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="w-full max-w-sm animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider">Selamat datang</p>
                    <h2 className="text-xl font-black text-white">{participant.name}</h2>
                </div>
                <button
                    onClick={onLogout}
                    className="text-xs text-gray-500 hover:text-red-400 border border-gray-700 hover:border-red-500/50 px-3 py-1.5 rounded-lg transition-colors"
                >
                    Keluar
                </button>
            </div>

            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                🏆 Keputusan Cabutan / Draw Results
            </h3>

            {loading && (
                <div className="text-center py-10 text-gray-500 text-sm animate-pulse">
                    Memuatkan keputusan...
                </div>
            )}

            {!loading && events.length === 0 && (
                <div className="text-center py-10 bg-white/5 border border-white/10 rounded-2xl">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-gray-400 text-sm">Tiada keputusan lagi.</p>
                    <p className="text-gray-600 text-xs mt-1">No completed events yet.</p>
                </div>
            )}

            <div className="space-y-3">
                {events.map(event => (
                    <div
                        key={event.id}
                        className="bg-white/8 border border-white/15 rounded-2xl overflow-hidden backdrop-blur-sm"
                    >
                        <button
                            onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                            className="w-full text-left p-4 flex justify-between items-center hover:bg-white/5 transition-colors"
                        >
                            <div>
                                <div className="text-white font-bold text-sm">{event.name}</div>
                                <div className="text-gray-500 text-xs mt-0.5">
                                    {new Date(event.event_date).toLocaleDateString('ms-MY', {
                                        day: 'numeric', month: 'long', year: 'numeric'
                                    })}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">
                                    Selesai
                                </span>
                                <span className="text-gray-500 text-xs">
                                    {expandedEvent === event.id ? '▲' : '▼'}
                                </span>
                            </div>
                        </button>

                        {expandedEvent === event.id && (
                            <div className="border-t border-white/10 p-4 space-y-4">
                                {(!event.prizes || event.prizes.length === 0) && (
                                    <p className="text-gray-500 text-xs text-center">Tiada keputusan direkod.</p>
                                )}
                                {event.prizes?.map((prize, pi) => (
                                    <div key={pi}>
                                        <div className="flex items-center gap-3 mb-2">
                                            {prize.prize_image ? (
                                                <img
                                                    src={prize.prize_image}
                                                    alt={prize.prize_title}
                                                    className="w-10 h-10 rounded-lg object-cover border border-white/20"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-lg">
                                                    🏆
                                                </div>
                                            )}
                                            <div>
                                                <div className="text-xs text-gray-500">Hadiah #{prize.prize_order}</div>
                                                <div className="text-white font-bold text-sm">{prize.prize_title}</div>
                                            </div>
                                        </div>

                                        <div className="ml-13 space-y-1 pl-13">
                                            {prize.winners?.map((winner, wi) => (
                                                <div
                                                    key={wi}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${winner.name.toLowerCase() === participant.name.toLowerCase()
                                                        ? 'bg-yellow-500/20 border border-yellow-500/40 text-yellow-300'
                                                        : 'bg-white/5 text-gray-300'
                                                        }`}
                                                >
                                                    <span className="text-gray-500 text-xs w-4">#{wi + 1}</span>
                                                    <span className="font-medium flex-1">{winner.name}</span>
                                                    {winner.name.toLowerCase() === participant.name.toLowerCase() && (
                                                        <span className="text-xs">🎉 Anda!</span>
                                                    )}
                                                </div>
                                            ))}
                                            {(!prize.winners || prize.winners.length === 0) && (
                                                <div className="text-gray-600 text-xs px-3">Belum ada pemenang</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-center text-gray-700 text-xs mt-8">
                Sistem Cabutan Bertuah Digital • v1.0
            </p>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

const ParticipantPortal = () => {
    const [view, setView] = useState('landing'); // landing | register | login | results | draw_started
    const [activeEvent, setActiveEvent] = useState(null);
    const [drawStarted, setDrawStarted] = useState(false);
    const [participant, setParticipant] = useState(null);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        // Check existing session
        const session = participantPortalService.getSession();
        if (session) {
            setParticipant(session);
            setView('results');
            setCheckingSession(false);
            return;
        }

        // Check active event + draw status
        participantPortalService.getActiveEvent()
            .then(event => {
                if (event) {
                    setActiveEvent(event);
                } else {
                    // null could mean no event, or draw has started
                    // We detect draw started by checking if there's an event with draw active
                    // Backend returns null when draw session is active (see participantAuthController)
                    // So we check a dedicated endpoint or re-use the info
                    setDrawStarted(false); // will be handled by backend returning null
                }
            })
            .catch(console.error)
            .finally(() => setCheckingSession(false));
    }, []);

    // If getActiveEvent returns null and there's no event, it might be draw started
    // We need to poll / check if draw is active for participant screen
    useEffect(() => {
        if (!checkingSession && !activeEvent && !participant) {
            // Poll to check if draw has started or registration simply not open
            participantPortalService.checkDrawStatus?.()
                .then(status => {
                    if (status?.drawActive) {
                        setDrawStarted(true);
                        setView('draw_started');
                    }
                })
                .catch(() => { }); // ignore if endpoint doesn't exist
        }
    }, [checkingSession, activeEvent, participant]);

    const handleLoginSuccess = (p) => {
        setParticipant(p);
        setView('results');
    };

    const handleRegisterSuccess = (p) => {
        setParticipant(p);
        setView('results');
    };

    const handleLogout = () => {
        participantPortalService.clearSession();
        setParticipant(null);
        setView('landing');
    };

    if (checkingSession) {
        return (
            <div
                className="min-h-screen flex items-center justify-center"
                style={{ backgroundImage: "url('/PotraitBg.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            >
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative text-yellow-500 animate-pulse text-lg font-bold">Memuatkan...</div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen relative flex flex-col items-center justify-center px-6 py-10"
            style={{
                backgroundImage: "url('/PotraitBg.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />

            {/* Content */}
            <div className="relative z-10 w-full flex flex-col items-center">
                {view === 'landing' && (
                    <LandingView
                        activeEvent={activeEvent}
                        drawStarted={drawStarted}
                        onShowRegister={() => setView('register')}
                        onShowLogin={() => setView('login')}
                    />
                )}
                {view === 'register' && (
                    <RegisterView
                        activeEvent={activeEvent}
                        onSuccess={handleRegisterSuccess}
                        onBack={() => setView('landing')}
                    />
                )}
                {view === 'login' && (
                    <LoginView
                        onSuccess={handleLoginSuccess}
                        onBack={() => setView('landing')}
                    />
                )}
                {view === 'results' && participant && (
                    <ResultsView
                        participant={participant}
                        onLogout={handleLogout}
                    />
                )}
                {view === 'draw_started' && (
                    <DrawStartedView />
                )}
            </div>
        </div>
    );
};

export default ParticipantPortal;