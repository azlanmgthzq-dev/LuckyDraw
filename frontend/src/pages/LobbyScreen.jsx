import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import participantService from '../services/participantService';
import drawService from '../services/drawService';
import { supabase } from '../services/supabaseClient';
import { isPresent } from '../utils/participants';
import BrandingBar from '../components/BrandingBar';

// Text on the right of the branding bar
const EVENT_TAGLINE = "GTA Cowboy In The Sky ★ 28 November 2026";

// Realtime is the main update path; polling is a slow fallback
const POLL_INTERVAL = 20000;

const LobbyScreen = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [eventData, setEventData] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState('');
    const [newEntries, setNewEntries] = useState(new Set());
    const [copied, setCopied] = useState(false);
    const [realtimeOn, setRealtimeOn] = useState(false);

    const prevIdsRef = useRef(null); // ids present at last fetch (null = first load)
    const pollRef = useRef(null);

    // Registration URL for participants
    const registrationUrl = `${window.location.origin}/checkin/${eventId}`;

    // QR code via qrserver.com — no install needed
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(registrationUrl)}`;

    // ── Load event + auto-open registration ───────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const ev = await eventService.getById(eventId);
                setEventData(ev);
                if (!ev.registration_open) {
                    await eventService.openRegistration(eventId);
                    const refreshed = await eventService.getById(eventId);
                    setEventData(refreshed);
                }
            } catch {
                setError('Gagal memuatkan acara.');
            }
        };
        init();
    }, [eventId]);

    // ── Poll participants ─────────────────────────────────────────
    const fetchParticipants = useCallback(async () => {
        try {
            const data = await participantService.getAll(eventId);
            const incoming = Array.isArray(data) ? data : (data.data ?? []);

            // Highlight anyone who just arrived (new or newly checked in), not on first load
            const presentIds = new Set(incoming.filter(isPresent).map(p => p.id));
            const fresh = new Set();
            if (prevIdsRef.current) {
                presentIds.forEach(id => {
                    if (!prevIdsRef.current.has(id)) fresh.add(id);
                });
            }
            prevIdsRef.current = presentIds;

            if (fresh.size > 0) {
                setNewEntries(prev => new Set([...prev, ...fresh]));
                setTimeout(() => {
                    setNewEntries(prev => {
                        const next = new Set(prev);
                        fresh.forEach(id => next.delete(id));
                        return next;
                    });
                }, 2000);
            }

            setParticipants(incoming);
        } catch { /* silent */ }
        finally { setLoading(false); }
    }, [eventId]);

    useEffect(() => {
        fetchParticipants();
        pollRef.current = setInterval(fetchParticipants, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [fetchParticipants]);

    // ── Realtime: refetch when any participant of this event changes ──
    useEffect(() => {
        const channel = supabase
            .channel(`lobby-participants-${eventId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'participants', filter: `event_id=eq.${eventId}` },
                () => fetchParticipants()
            )
            // DELETE events can't be filtered by event_id, so listen to all deletes
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'participants' },
                () => fetchParticipants()
            )
            .subscribe((status) => setRealtimeOn(status === 'SUBSCRIBED'));

        return () => { supabase.removeChannel(channel); };
    }, [eventId, fetchParticipants]);

    const presentCount = participants.filter(isPresent).length;

    // ── Toggle registration ───────────────────────────────────────
    const handleToggleRegistration = async () => {
        try {
            if (eventData?.registration_open) {
                await eventService.closeRegistration(eventId);
            } else {
                await eventService.openRegistration(eventId);
            }
            const refreshed = await eventService.getById(eventId);
            setEventData(refreshed);
        } catch {
            setError('Gagal kemaskini status pendaftaran.');
        }
    };

    // ── Copy link ─────────────────────────────────────────────────
    const handleCopyLink = () => {
        navigator.clipboard.writeText(registrationUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ── Start Draw ────────────────────────────────────────────────
    const handleStartDraw = async () => {
        if (presentCount === 0) {
            setError('Belum ada peserta yang check-in.');
            return;
        }
        setStarting(true);
        setError('');
        try {
            await drawService.startSession(eventId);
            navigate(`/draw/${eventId}`);
        } catch (err) {
            setError(err.message || 'Gagal memulakan sesi cabutan.');
            setStarting(false);
        }
    };

    const handleBack = async () => {
        try {
            if (eventData?.registration_open) await eventService.closeRegistration(eventId);
        } catch { /* silent */ }
        navigate('/admin');
    };

    const registrationOpen = !!eventData?.registration_open;

    return (
        <div className="western-screen h-screen flex flex-col overflow-hidden">
            <BrandingBar tagline={EVENT_TAGLINE} />

            {/* Warm glow behind the title */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-west-gold/10 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

            {/* HEADER */}
            <header className="relative z-10 shrink-0 flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-west-border/30 bg-west-bg/60">
                <button
                    onClick={handleBack}
                    className="font-oswald text-sm uppercase tracking-widest text-west-muted hover:text-west-gold transition-colors"
                >
                    ← Dashboard
                </button>
                <h1 className="font-rye text-xl md:text-3xl text-west-gold flex items-center gap-2 md:gap-3 drop-shadow-[0_0_12px_rgba(212,160,23,0.35)]">
                    <span className="text-west-border text-sm md:text-lg">★</span>
                    🤠 THE ROUNDUP
                    <span className="text-west-border text-sm md:text-lg">★</span>
                </h1>
                <div className="font-oswald text-xs uppercase tracking-widest text-west-muted flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${realtimeOn ? 'bg-west-teal animate-pulse' : 'bg-west-gold'}`} />
                    {realtimeOn ? 'Live' : `Polling • ${POLL_INTERVAL / 1000}s`}
                </div>
            </header>

            {/* MAIN */}
            <div className="relative z-10 flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden">

                {/* ── LEFT PANEL: QR + Controls ── */}
                <aside className="lg:w-80 xl:w-96 shrink-0 flex flex-col gap-4 p-5 bg-west-surface/70 border-b lg:border-b-0 lg:border-r border-west-border/30 lg:overflow-y-auto">

                    {/* Event name */}
                    <div>
                        <div className="font-oswald text-[10px] uppercase tracking-[0.3em] text-west-muted mb-1">✦ Acara ✦</div>
                        <h2 className="font-rye text-2xl text-west-cream leading-tight">{eventData?.name ?? '...'}</h2>
                        {eventData?.event_date && (
                            <div className="font-oswald text-sm uppercase tracking-wider text-west-gold/80 mt-1">
                                📅 {new Date(eventData.event_date).toLocaleDateString('ms-MY', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </div>
                        )}
                    </div>

                    <div className="rope-divider" />

                    {/* QR Code */}
                    <div className="rounded-xl p-4 flex flex-col items-center gap-2 bg-west-cream border-2 border-west-border shadow-[0_0_30px_rgba(212,160,23,0.2)]">
                        <img
                            src={qrImageUrl}
                            alt="QR Code Check-In"
                            className="w-44 h-44 rounded-md bg-white"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        {/* Fallback if API fails */}
                        <div className="w-44 h-44 rounded-md bg-white/60 items-center justify-center text-west-muted text-xs text-center p-4 hidden">
                            QR tidak dapat dimuatkan. Guna link di bawah.
                        </div>
                        <div className="text-center">
                            <div className="font-rye text-base text-west-bg">Imbas untuk Check-In</div>
                            <div className="font-oswald text-[10px] uppercase tracking-widest text-west-muted">Scan to Check-In</div>
                        </div>
                    </div>

                    {/* Copy link */}
                    <div className="flex gap-2">
                        <div className="flex-1 min-w-0 bg-west-bg/70 border border-west-border/40 rounded-lg px-3 py-2 text-[10px] text-west-muted font-mono truncate flex items-center">
                            {registrationUrl}
                        </div>
                        <button
                            onClick={handleCopyLink}
                            title="Copy link"
                            className={`shrink-0 px-3 py-2 text-xs ${copied ? 'western-btn' : 'western-btn-secondary'}`}
                        >
                            {copied ? '✓ Copied' : '📋 Copy'}
                        </button>
                    </div>

                    {/* Live Counter */}
                    <div className="western-card p-5 text-center">
                        <div className="font-rye text-7xl text-west-gold leading-none drop-shadow-[0_0_18px_rgba(212,160,23,0.4)]" key={presentCount}>
                            {presentCount}
                        </div>
                        <div className="font-rye text-xl text-west-cream mt-2">
                            {presentCount === 1 ? 'COWBOY READY' : 'COWBOYS READY'}
                        </div>
                        <div className="font-oswald text-xs uppercase tracking-widest text-west-muted mt-1">
                            daripada {participants.length} berdaftar
                        </div>
                        {participants.length > 0 && (
                            <div className="mt-3 h-2 bg-west-bg rounded-full overflow-hidden border border-west-border/40">
                                <div
                                    className="h-full bg-gradient-to-r from-west-teal to-west-gold transition-all duration-700"
                                    style={{ width: `${(presentCount / participants.length) * 100}%` }}
                                />
                            </div>
                        )}
                        <div className="font-oswald text-[10px] uppercase tracking-widest text-west-muted mt-2 flex items-center justify-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-west-teal animate-pulse inline-block" />
                            {realtimeOn ? 'Live' : 'Auto-refresh'}
                        </div>
                    </div>

                    {/* Registration toggle */}
                    <div className={`rounded-lg border px-3 py-2.5 flex items-center justify-between ${registrationOpen
                        ? 'bg-west-teal/15 border-west-teal/60'
                        : 'bg-west-danger/10 border-west-danger/50'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${registrationOpen ? 'bg-west-teal animate-pulse' : 'bg-west-danger'}`} />
                            <span className="font-oswald text-xs uppercase tracking-wider text-west-cream">
                                {registrationOpen ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
                            </span>
                        </div>
                        <button
                            onClick={handleToggleRegistration}
                            className={`text-[11px] px-2.5 py-1 ${registrationOpen ? 'western-btn-danger' : 'western-btn-secondary'}`}
                        >
                            {registrationOpen ? 'Tutup' : 'Buka'}
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-west-danger/15 border border-west-danger/50 text-[#F1A198] rounded-lg px-3 py-2.5 text-xs">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="flex-1" />

                    {/* START BUTTON */}
                    <div className="space-y-2 pt-2">
                        <p className="font-oswald text-[11px] uppercase tracking-wider text-west-muted text-center leading-relaxed">
                            Tekan START untuk mulakan cabutan.<br />
                            Pendaftaran ditutup automatik.
                        </p>
                        <button
                            onClick={handleStartDraw}
                            disabled={starting || presentCount === 0}
                            className="western-btn w-full py-4 text-xl rounded-xl shadow-[0_8px_30px_rgba(212,160,23,0.35)] hover:scale-[1.02] active:scale-95 disabled:hover:scale-100"
                        >
                            {starting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Memulakan...
                                </span>
                            ) : '🤠 YEEHAW! START DRAW'}
                        </button>
                    </div>
                </aside>

                {/* ── RIGHT PANEL: Participant Grid ── */}
                <section className="flex-1 flex flex-col min-h-[50vh] lg:min-h-0 lg:overflow-hidden">
                    <div className="px-6 pt-4 pb-3 shrink-0">
                        <div className="flex items-center justify-between">
                            <h2 className="font-oswald font-semibold text-sm uppercase tracking-[0.3em] text-west-gold">
                                ✦ Senarai Peserta Masuk ✦
                            </h2>
                            {loading && <span className="font-oswald text-xs uppercase tracking-widest text-west-muted animate-pulse">Memuatkan...</span>}
                        </div>
                        <div className="rope-divider mt-3" />
                    </div>

                    <div className="flex-1 lg:overflow-y-auto p-4">
                        {participants.length === 0 && !loading ? (
                            <div className="h-full min-h-[300px] flex flex-col items-center justify-center gap-4">
                                <div className="text-7xl opacity-30">🤠</div>
                                <div className="text-center">
                                    <p className="font-rye text-xl text-west-gold/70">Menunggu peserta...</p>
                                    <p className="font-oswald text-sm uppercase tracking-wider mt-1 text-west-muted">Tunjukkan QR code kepada peserta untuk check-in</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                                {participants.map(p => (
                                    <ParticipantCard
                                        key={p.id}
                                        participant={p}
                                        isNew={newEntries.has(p.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <div className="relative z-10 shrink-0 text-center py-2 font-oswald text-[10px] uppercase tracking-[0.3em] text-west-muted/60 border-t border-west-border/20 bg-west-bg/80">
                ★ Sistem Cabutan Bertuah Digital ★ Admin Lobby View ★
            </div>
        </div>
    );
};

// ── Participant Card (wanted poster) ──────────────────────────────────────────
function getInitials(name = '') {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function ParticipantCard({ participant, isNew }) {
    const present = isPresent(participant);
    return (
        <div className={`
            wanted-card rounded-lg px-3 pt-2 pb-3 flex flex-col items-center gap-1.5 text-center transition-all duration-500
            ${present ? 'wanted-card--present' : 'wanted-card--absent'}
            ${isNew ? 'wanted-card--new scale-110 z-10' : 'hover:scale-[1.03]'}
        `}>
            {isNew ? (
                <span className="absolute -top-2.5 -right-2 rotate-6 bg-west-gold text-west-bg font-oswald font-bold text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm shadow-lg">
                    HADIR!
                </span>
            ) : present && (
                <span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-west-teal border border-west-gold/60 text-west-cream text-[11px] font-bold flex items-center justify-center shadow-lg"
                    title="Sudah check-in"
                >
                    ✓
                </span>
            )}
            <div className="font-rye text-[10px] tracking-[0.2em] text-west-gold/80">★ WANTED ★</div>
            <div className="w-11 h-11 rounded-sm border border-west-border/70 bg-west-bg/50 flex items-center justify-center font-rye text-lg text-west-gold">
                {getInitials(participant.name) || '?'}
            </div>
            <div className="font-oswald font-semibold uppercase tracking-wide text-xs md:text-sm leading-tight line-clamp-2 w-full text-west-cream">
                {participant.name}
            </div>
            <div className="font-rye text-[10px] text-west-muted">
                #{String(participant.id).padStart(4, '0')}
            </div>
        </div>
    );
}

export default LobbyScreen;
