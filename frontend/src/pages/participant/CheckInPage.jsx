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
        <div className="w-10 h-10 border-4 border-west-gold/30 border-t-west-gold rounded-full animate-spin" />
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
        <form onSubmit={handleSubmit} className="western-card p-6 space-y-4 animate-fade-in">
            <div className="relative z-10">
                <label className="block font-oswald text-xs font-semibold uppercase tracking-[0.2em] text-west-muted mb-1.5" htmlFor="email">Email</label>
                <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full bg-west-bg border border-west-border/60 focus:border-west-gold text-west-cream placeholder:text-west-muted/60 rounded-lg px-4 py-3 text-base outline-none transition-colors"
                    placeholder="nama@email.com"
                />
            </div>
            <div className="relative z-10">
                <label className="block font-oswald text-xs font-semibold uppercase tracking-[0.2em] text-west-muted mb-1.5" htmlFor="code">Kod Check-In</label>
                <input
                    id="code"
                    type="text"
                    required
                    maxLength={6}
                    autoComplete="off"
                    autoCapitalize="characters"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    className="w-full bg-west-bg border border-west-border/60 focus:border-west-gold text-west-cream placeholder:text-west-muted/60 rounded-lg px-4 py-3 text-xl font-mono tracking-[0.4em] text-center uppercase outline-none transition-colors"
                    placeholder="ABC123"
                />
                <p className="text-[11px] text-west-muted mt-1.5">Kod 6 aksara yang diberikan oleh penganjur.</p>
            </div>

            {error && (
                <div className="relative z-10 bg-west-danger/15 border border-west-danger/50 text-[#F1A198] rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            <button
                type="submit"
                disabled={submitting}
                className="western-btn relative z-10 w-full py-4 text-lg rounded-xl shadow-[0_8px_20px_rgba(212,160,23,0.3)] active:scale-95"
            >
                {submitting ? 'Menyemak...' : '🤠 Check In'}
            </button>
        </form>
    );
}

function WaitingView({ name, message, onLogout }) {
    return (
        <div className="western-card p-8 text-center animate-fade-in-up">
            {message && <p className="font-oswald uppercase tracking-wide text-[#7FD1C2] mb-5 leading-snug">{message}</p>}
            {/* Lasso: two dashed gold rope rings spinning opposite ways */}
            <div className="relative w-24 h-24 mx-auto mb-5">
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-west-gold animate-spin" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-3 rounded-full border-2 border-dashed border-west-border animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
                <div className="absolute inset-0 flex items-center justify-center text-3xl">🤠</div>
            </div>
            <h2 className="font-rye text-2xl text-west-gold">STAY PUT, PARTNER...</h2>
            <p className="text-west-cream/80 text-sm mt-3 leading-relaxed">
                Hai <span className="text-west-gold font-semibold">{name}</span>, biarkan halaman ini terbuka.
                Kami akan maklumkan di sini jika anda menang. Semoga berjaya! 🍀
            </p>
            <button onClick={onLogout} className="relative z-10 mt-6 text-[11px] text-west-muted hover:text-west-gold underline">
                Bukan anda? Log keluar
            </button>
        </div>
    );
}

function WinnerView({ name, win }) {
    return (
        <div className="bg-gradient-to-br from-west-winner/25 via-west-card to-west-gold/10 border-2 border-west-winner rounded-2xl p-8 text-center animate-pop-in shadow-[0_0_60px_rgba(255,215,0,0.3)]">
            <div className="text-6xl mb-3">🏆</div>
            <h2 className="font-rye text-3xl text-west-winner leading-tight mb-2 drop-shadow-[0_0_16px_rgba(255,215,0,0.5)]">🤠 YEEHAW! ANDA MENANG!</h2>
            <p className="font-oswald font-bold uppercase tracking-wide text-west-cream text-xl">{name}</p>
            {win.prize_image && (
                <img src={win.prize_image} alt={win.prize_title} className="w-32 h-32 object-contain mx-auto my-4 rounded-xl bg-west-bg/60 p-2 border border-west-border" />
            )}
            <p className="text-west-cream text-base leading-relaxed mt-3">
                Anda memenangi <span className="font-rye text-west-gold">{win.prize_title}</span>!
            </p>
            <p className="font-oswald uppercase tracking-wider text-west-muted text-xs mt-4">Sila jumpa urusetia untuk menuntut hadiah anda.</p>
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
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.6 }, colors: ['#FFD700', '#D4A017', '#F5E6C8', '#C0392B', '#2D7D6F'] });
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
        <div className="western-screen min-h-screen flex flex-col items-center justify-center px-4 py-10 overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-west-gold/10 rounded-full blur-[110px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

            {/* Header */}
            <div className="relative z-10 mb-8 text-center">
                <span className="western-stamp mb-4">★ VIP Check-In ★</span>
                <h1 className="font-rye text-3xl text-west-gold leading-tight drop-shadow-[0_0_16px_rgba(212,160,23,0.35)]">{event?.name ?? '🤠 Lucky Draw'}</h1>
                {event?.event_date && (
                    <p className="font-oswald uppercase tracking-widest text-west-muted text-sm mt-2">
                        {new Date(event.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                )}
                <div className="rope-divider w-40 mx-auto mt-4" />
            </div>

            <div className="relative z-10 w-full max-w-sm">
                {view === 'loading' && <Spinner />}
                {view === 'error' && (
                    <div className="text-center text-[#F1A198] text-sm">⚠️ Link tidak sah atau event tidak ditemui.</div>
                )}
                {view === 'form' && <CheckInForm eventId={eventId} onCheckedIn={handleCheckedIn} />}
                {view === 'waiting' && <WaitingView name={me?.name} message={message} onLogout={handleLogout} />}
                {view === 'won' && win && <WinnerView name={me?.name} win={win} />}
            </div>

            <p className="relative z-10 text-center font-oswald uppercase tracking-[0.3em] text-west-muted/60 text-[10px] mt-10">★ Sistem Cabutan Bertuah Digital ★</p>
        </div>
    );
};

export default CheckInPage;
