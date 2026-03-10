import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import participantService from '../services/participantService';
import drawService from '../services/drawService';

const POLL_INTERVAL = 3000;

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

    const prevIdsRef = useRef(new Set());
    const pollRef = useRef(null);

    // Registration URL for participants
    const registrationUrl = `${window.location.origin}/daftar/${eventId}`;

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

            const incomingIds = new Set(incoming.map(p => p.id));
            const fresh = new Set();
            incomingIds.forEach(id => {
                if (!prevIdsRef.current.has(id)) fresh.add(id);
            });
            prevIdsRef.current = incomingIds;

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
        if (participants.length === 0) {
            setError('Tiada peserta. Sila tunggu peserta mendaftar dulu.');
            return;
        }
        setStarting(true);
        setError('');
        try {
            await drawService.startSession(eventId);
            navigate(`/draw/${eventId}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memulakan sesi cabutan.');
            setStarting(false);
        }
    };

    const handleBack = async () => {
        try {
            if (eventData?.registration_open) await eventService.closeRegistration(eventId);
        } catch { /* silent */ }
        navigate('/admin');
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col overflow-hidden">

            {/* TOP BAR */}
            <header className="flex items-center justify-between px-6 py-4 bg-black/60 border-b border-yellow-500/20 backdrop-blur-sm">
                <button onClick={handleBack} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
                    ← Dashboard
                </button>
                <div className="text-yellow-400 font-black text-lg tracking-wide">🎯 PRE-DRAW LOBBY</div>
                <div className="text-xs text-gray-500 font-mono">Live • {POLL_INTERVAL / 1000}s</div>
            </header>

            {/* MAIN */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

                {/* ── LEFT PANEL: QR + Controls ── */}
                <div className="lg:w-72 xl:w-80 bg-black/40 border-r border-white/5 flex flex-col p-5 gap-4 shrink-0 overflow-y-auto">

                    {/* Event name */}
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Acara</div>
                        <h1 className="text-xl font-black text-white leading-tight">{eventData?.name ?? '...'}</h1>
                        {eventData?.event_date && (
                            <div className="text-xs text-gray-400 mt-0.5">
                                📅 {new Date(eventData.event_date).toLocaleDateString('ms-MY', {
                                    day: 'numeric', month: 'long', year: 'numeric'
                                })}
                            </div>
                        )}
                    </div>

                    {/* QR Code */}
                    <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 shadow-[0_0_30px_rgba(234,179,8,0.15)]">
                        <img
                            src={qrImageUrl}
                            alt="QR Code Pendaftaran"
                            className="w-44 h-44 rounded-lg"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        {/* Fallback if API fails */}
                        <div className="w-44 h-44 rounded-lg bg-gray-100 items-center justify-center text-gray-400 text-xs text-center p-4 hidden">
                            QR tidak dapat dimuatkan. Guna link di bawah.
                        </div>
                        <div className="text-center">
                            <div className="text-black font-black text-sm">Imbas untuk Daftar</div>
                            <div className="text-gray-500 text-[10px]">Scan to Register</div>
                        </div>
                    </div>

                    {/* Copy link */}
                    <div className="flex gap-2">
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[10px] text-gray-400 font-mono truncate flex items-center">
                            {registrationUrl}
                        </div>
                        <button
                            onClick={handleCopyLink}
                            title="Copy link"
                            className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${copied
                                    ? 'bg-green-600 text-white scale-95'
                                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                                }`}
                        >
                            {copied ? '✓ Copied' : '📋 Copy'}
                        </button>
                    </div>

                    {/* Live Counter */}
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <div className="text-xs text-yellow-300/60 uppercase tracking-widest mb-0.5">Peserta Hadir</div>
                        <div
                            className="text-6xl font-black text-yellow-400 tabular-nums transition-all duration-300"
                            key={participants.length}
                        >
                            {participants.length}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                            Live
                        </div>
                    </div>

                    {/* Registration toggle */}
                    <div className={`rounded-xl border px-3 py-2.5 flex items-center justify-between ${eventData?.registration_open
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${eventData?.registration_open ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                                }`} />
                            <span className={`text-xs font-bold ${eventData?.registration_open ? 'text-green-300' : 'text-red-300'
                                }`}>
                                {eventData?.registration_open ? 'Pendaftaran Dibuka' : 'Pendaftaran Ditutup'}
                            </span>
                        </div>
                        <button
                            onClick={handleToggleRegistration}
                            className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${eventData?.registration_open
                                    ? 'bg-red-600/40 hover:bg-red-600 text-red-200'
                                    : 'bg-green-600/40 hover:bg-green-600 text-green-200'
                                }`}
                        >
                            {eventData?.registration_open ? 'Tutup' : 'Buka'}
                        </button>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-500/15 border border-red-500/40 text-red-300 rounded-xl px-3 py-2.5 text-xs">
                            ⚠️ {error}
                        </div>
                    )}

                    <div className="flex-1" />

                    {/* START BUTTON */}
                    <div className="space-y-2">
                        <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                            Tekan START untuk mulakan cabutan.<br />
                            Pendaftaran ditutup automatik.
                        </p>
                        <button
                            onClick={handleStartDraw}
                            disabled={starting || participants.length === 0}
                            className={`w-full py-4 rounded-2xl text-xl font-black tracking-wide transition-all duration-200 ${starting || participants.length === 0
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400 text-white shadow-[0_8px_30px_rgba(220,38,38,0.4)] hover:scale-[1.03] active:scale-95'
                                }`}
                        >
                            {starting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                    </svg>
                                    Memulakan...
                                </span>
                            ) : '🚀 START DRAW'}
                        </button>
                    </div>
                </div>

                {/* ── RIGHT PANEL: Participant Grid ── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
                        <h2 className="text-sm font-bold text-gray-300 uppercase tracking-widest">
                            Senarai Peserta Masuk
                        </h2>
                        {loading && <span className="text-xs text-gray-500 animate-pulse">Memuatkan...</span>}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {participants.length === 0 && !loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4">
                                <div className="text-7xl opacity-20">👥</div>
                                <div className="text-center">
                                    <p className="text-base font-semibold">Menunggu peserta...</p>
                                    <p className="text-sm mt-1 text-gray-700">Tunjukkan QR code kepada peserta untuk mendaftar</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                                {participants.map((p, idx) => (
                                    <ParticipantCard
                                        key={p.id}
                                        participant={p}
                                        index={idx}
                                        isNew={newEntries.has(p.id)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="text-center py-2 text-xs text-gray-800 border-t border-white/5 bg-black/30">
                Sistem Cabutan Bertuah Digital • Admin Lobby View
            </div>
        </div>
    );
};

// ── Participant Card ──────────────────────────────────────────────────────────
const CARD_COLORS = [
    'from-purple-600/40 to-purple-800/30 border-purple-500/40',
    'from-blue-600/40 to-blue-800/30 border-blue-500/40',
    'from-green-600/40 to-green-800/30 border-green-500/40',
    'from-orange-600/40 to-orange-800/30 border-orange-500/40',
    'from-pink-600/40 to-pink-800/30 border-pink-500/40',
    'from-teal-600/40 to-teal-800/30 border-teal-500/40',
    'from-red-600/40 to-red-800/30 border-red-500/40',
    'from-yellow-600/40 to-yellow-800/30 border-yellow-500/40',
];

function getInitials(name = '') {
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function ParticipantCard({ participant, index, isNew }) {
    return (
        <div className={`
            relative rounded-2xl border bg-gradient-to-br ${CARD_COLORS[index % CARD_COLORS.length]}
            p-3 flex flex-col items-center gap-2 text-center transition-all duration-500
            ${isNew
                ? 'scale-110 shadow-[0_0_25px_rgba(234,179,8,0.6)] border-yellow-400/80 z-10'
                : 'hover:scale-[1.03]'
            }
        `}>
            {isNew && (
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-lg">
                    NEW!
                </span>
            )}
            <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm font-black text-white">
                {getInitials(participant.name) || '?'}
            </div>
            <div className="text-xs font-bold text-white leading-tight line-clamp-2 w-full">
                {participant.name}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
                #{String(participant.id).padStart(4, '0')}
            </div>
        </div>
    );
}

export default LobbyScreen;