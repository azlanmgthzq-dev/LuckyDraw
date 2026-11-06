import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import participantPortalService from '../../services/participantPortalService';

// The big screen reveals the winner a few seconds after the result is saved.
// Wait that long so the phone doesn't spoil the reveal.
const WIN_REVEAL_DELAY_MS = 6000;
const POLL_FALLBACK_MS = 15000;

// Remember the check-in on this phone so a refresh keeps the waiting screen
const storageKey = (eventId) => `lucky-checkin-${eventId}`;
const loadCreds = (eventId) => {
    try { return JSON.parse(localStorage.getItem(storageKey(eventId))); } catch { return null; }
};
const saveCreds = (eventId, creds) => {
    try { localStorage.setItem(storageKey(eventId), JSON.stringify(creds)); } catch { /* private mode */ }
};
const clearCreds = (eventId) => {
    try { localStorage.removeItem(storageKey(eventId)); } catch { /* ignore */ }
};

const Spinner = () => (
    <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
    </div>
);

// ── Views ───────────────────────────────────────────────────────
function CheckInForm({ eventId, onCheckedIn }) {
    const [form, setForm] = useState({ email: '', code: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await participantPortalService.checkIn(eventId, form.email, form.code);
            onCheckedIn(res, form);
        } catch {
            setError('❌ Email atau kod tidak sah.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 backdrop-blur-md rounded-3xl p-6 space-y-4 animate-fade-in">
            <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5" htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-base outline-none transition-colors"
                    placeholder="nama@email.com"
                />
            </div>
            <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5" htmlFor="code">Kod Check-In</label>
                <input
                    id="code"
                    type="text"
                    required
                    maxLength={6}
                    autoComplete="off"
                    autoCapitalize="characters"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full bg-black/40 border border-white/10 focus:border-yellow-500 text-white rounded-xl px-4 py-3 text-xl font-mono tracking-[0.4em] text-center uppercase outline-none transition-colors"
                    placeholder="ABC123"
                />
                <p className="text-[11px] text-gray-500 mt-1.5">Kod 6 aksara yang diberikan oleh penganjur.</p>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">{error}</div>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-[0_8px_20px_rgba(220,38,38,0.4)] transition-all active:scale-95"
            >
                {submitting ? 'Menyemak...' : 'Check In'}
            </button>
        </form>
    );
}

function WaitingView({ name, message, onLogout }) {
    return (
        <div className="bg-white/5 border border-green-500/30 rounded-3xl p-8 text-center animate-fade-in-up">
            {message && <p className="text-green-300 font-bold mb-4 leading-snug">{message}</p>}
            <div className="relative w-20 h-20 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-yellow-500/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-400 animate-spin" style={{ animationDuration: '1.5s' }} />
                <div className="absolute inset-0 flex items-center justify-center text-3xl">🎰</div>
            </div>
            <h2 className="text-xl font-black text-white">Menunggu cabutan...</h2>
            <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                Hai <span className="text-yellow-400 font-semibold">{name}</span>, biarkan halaman ini terbuka.
                Kami akan maklumkan di sini jika anda menang. Semoga berjaya! 🍀
            </p>
            <button onClick={onLogout} className="mt-6 text-[11px] text-gray-600 hover:text-gray-400 underline">
                Bukan anda? Log keluar
            </button>
        </div>
    );
}

function WinnerView({ name, win }) {
    return (
        <div className="bg-gradient-to-br from-yellow-500/20 to-amber-600/10 border border-yellow-400/50 rounded-3xl p-8 text-center animate-pop-in shadow-[0_0_60px_rgba(250,204,21,0.25)]">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="text-3xl font-black text-yellow-400 mb-1">🎉 Tahniah!</h2>
            <p className="text-white font-bold text-lg">{name}</p>
            {win.prize_image && (
                <img src={win.prize_image} alt={win.prize_title} className="w-32 h-32 object-contain mx-auto my-4 rounded-2xl bg-white/5 p-2 border border-white/10" />
            )}
            <p className="text-white text-base leading-relaxed mt-3">
                Anda memenangi <span className="text-yellow-300 font-black">{win.prize_title}</span>!
            </p>
            <p className="text-gray-300 text-sm mt-3">Sila jumpa urusetia untuk menuntut hadiah anda.</p>
        </div>
    );
}

// ── Page ────────────────────────────────────────────────────────
const CheckInPage = () => {
    const { eventId } = useParams();

    const [event, setEvent] = useState(null);
    const [view, setView] = useState('loading'); // loading | form | waiting | won | error
    const [me, setMe] = useState(null);          // { id, name }
    const [win, setWin] = useState(null);
    const [message, setMessage] = useState('');

    const credsRef = useRef(null);
    const revealTimerRef = useRef(null);

    const showWin = useCallback((w) => {
        setWin(w);
        setView('won');
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 } });
    }, []);

    // Ask the server whether this participant has won
    const checkWin = useCallback(async ({ delay = 0 } = {}) => {
        const creds = credsRef.current;
        if (!creds) return;
        try {
            const res = await participantPortalService.getWin(eventId, creds.email, creds.code);
            if (!res.win) return;
            clearTimeout(revealTimerRef.current);
            revealTimerRef.current = setTimeout(() => showWin(res.win), delay);
        } catch { /* try again on next event / poll */ }
    }, [eventId, showWin]);

    // ── Load event + restore a previous check-in on this phone ──
    useEffect(() => {
        const init = async () => {
            try {
                setEvent(await participantPortalService.getEventById(eventId));
            } catch {
                setView('error');
                return;
            }

            const creds = loadCreds(eventId);
            if (!creds) { setView('form'); return; }

            try {
                const res = await participantPortalService.getWin(eventId, creds.email, creds.code);
                if (!res.checked_in) { clearCreds(eventId); setView('form'); return; }
                credsRef.current = creds;
                setMe({ id: res.id, name: res.name });
                if (res.win) { setWin(res.win); setView('won'); }
                else setView('waiting');
            } catch {
                clearCreds(eventId);
                setView('form');
            }
        };
        init();
        return () => clearTimeout(revealTimerRef.current);
    }, [eventId]);

    // ── While waiting: realtime + slow polling fallback ──
    useEffect(() => {
        if (view !== 'waiting' || !me?.id) return;
        const unsubscribe = participantPortalService.subscribeToWin(me.id, () =>
            checkWin({ delay: WIN_REVEAL_DELAY_MS }));
        const poll = setInterval(() => checkWin({ delay: WIN_REVEAL_DELAY_MS }), POLL_FALLBACK_MS);
        return () => { unsubscribe(); clearInterval(poll); };
    }, [view, me?.id, checkWin]);

    const handleCheckedIn = (res, form) => {
        const creds = { email: form.email.trim(), code: form.code.trim() };
        credsRef.current = creds;
        saveCreds(eventId, creds);
        setMe({ id: res.id, name: res.name });
        setMessage(res.status === 'already'
            ? `✅ Anda sudah check-in sebelum ini, ${res.name}!`
            : `✅ Selamat Datang, ${res.name}! Check-in berjaya.`);
        setView('waiting');
        checkWin(); // in case they already won
    };

    const handleLogout = () => {
        clearCreds(eventId);
        credsRef.current = null;
        setMe(null);
        setMessage('');
        setView('form');
    };

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 bg-slate-950 overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

            {/* Header */}
            <div className="relative z-10 mb-8 text-center">
                <div className="inline-block bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full mb-3">
                    VIP Check-In
                </div>
                <h1 className="text-3xl font-black text-yellow-400 drop-shadow-lg">{event?.name ?? '🎉 Lucky Draw'}</h1>
                {event?.event_date && (
                    <p className="text-gray-400 text-sm mt-1">
                        {new Date(event.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                )}
            </div>

            <div className="relative z-10 w-full max-w-sm">
                {view === 'loading' && <Spinner />}
                {view === 'error' && (
                    <div className="text-center text-red-400 text-sm">⚠️ Link tidak sah atau event tidak ditemui.</div>
                )}
                {view === 'form' && <CheckInForm eventId={eventId} onCheckedIn={handleCheckedIn} />}
                {view === 'waiting' && <WaitingView name={me?.name} message={message} onLogout={handleLogout} />}
                {view === 'won' && win && <WinnerView name={me?.name} win={win} />}
            </div>

            <p className="relative z-10 text-center text-gray-700 text-xs mt-10">Sistem Cabutan Bertuah Digital</p>
        </div>
    );
};

export default CheckInPage;
