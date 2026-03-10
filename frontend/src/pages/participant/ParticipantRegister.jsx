import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchEvent(eventId) {
    const res = await fetch(`${API_BASE}/participant/event/${eventId}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
}

async function submitRegister({ name, phone, email, event_id }) {
    const res = await fetch(`${API_BASE}/participant/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, event_id }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    return json.data;
}

// ─── Views ───────────────────────────────────────────────────────────────────

function LoadingView() {
    return (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm animate-pulse">Memuatkan...</p>
        </div>
    );
}

function ClosedView({ event }) {
    return (
        <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
            <div className="text-7xl">🔒</div>
            <div>
                <h1 className="text-2xl font-black text-white mb-1">Pendaftaran Ditutup</h1>
                <p className="text-gray-400 text-sm">Registration is closed</p>
            </div>
            {event && (
                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="text-white font-bold">{event.name}</div>
                    <div className="text-gray-500 text-xs mt-1">
                        {new Date(event.event_date).toLocaleDateString('ms-MY', {
                            day: 'numeric', month: 'long', year: 'numeric'
                        })}
                    </div>
                </div>
            )}
            <p className="text-gray-600 text-xs leading-relaxed">
                Sila hubungi penganjur untuk maklumat lanjut.<br />
                Please contact the organiser for more info.
            </p>
        </div>
    );
}

function DrawStartedView({ event }) {
    return (
        <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full">
            <div className="relative">
                <div className="text-8xl animate-bounce" style={{ animationDuration: '2s' }}>🏆</div>
                <div className="absolute -inset-4 rounded-full bg-yellow-500/10 blur-2xl animate-pulse" />
            </div>
            <div>
                <h1 className="text-2xl font-black text-yellow-400 mb-1">Cabutan Sedang Berlangsung!</h1>
                <p className="text-gray-400 text-sm">Draw Is In Progress</p>
            </div>
            {event && (
                <div className="w-full bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4">
                    <div className="text-white font-bold">{event.name}</div>
                </div>
            )}
            <p className="text-gray-500 text-sm leading-relaxed">
                Pendaftaran telah ditutup. Saksikan skrin utama untuk melihat pemenang!
            </p>
        </div>
    );
}

function SuccessView({ participant, event }) {
    return (
        <div className="flex flex-col items-center gap-6 text-center max-w-sm w-full animate-fade-in">
            {/* Big tick */}
            <div className="w-24 h-24 rounded-full bg-green-500/20 border-2 border-green-400/50 flex items-center justify-center">
                <svg className="w-12 h-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
            </div>

            <div>
                <h1 className="text-2xl font-black text-white mb-1">Pendaftaran Berjaya!</h1>
                <p className="text-green-400 text-sm font-medium">Registration Successful</p>
            </div>

            {/* Participant card */}
            <div className="w-full bg-white/5 border border-white/15 rounded-2xl p-5 text-left space-y-3">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-2">Maklumat Anda</div>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center text-lg font-black text-yellow-400">
                        {participant.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div>
                        <div className="text-white font-bold">{participant.name}</div>
                        <div className="text-gray-500 text-xs">{participant.phone}</div>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    <div className="text-xs text-gray-500">ID Peserta</div>
                    <div className="font-mono text-yellow-400 font-bold text-sm">
                        #{String(participant.id).padStart(4, '0')}
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">Acara</div>
                    <div className="text-white text-xs font-medium text-right max-w-[60%]">{event?.name}</div>
                </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-blue-300 leading-relaxed">
                💡 Simpan nombor ID anda. Saksikan skrin utama untuk keputusan cabutan.
            </div>
        </div>
    );
}

function RegisterForm({ event, onSuccess }) {
    const [form, setForm] = useState({ name: '', phone: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const participant = await submitRegister({ ...form, event_id: event.id });
            onSuccess(participant);
        } catch (err) {
            setError(err.message || 'Pendaftaran gagal. Sila cuba semula.');
        } finally {
            setLoading(false);
        }
    };

    const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    return (
        <div className="w-full max-w-sm animate-fade-in">

            {/* Event badge */}
            <div className="mb-6 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3">
                <div className="text-xs text-yellow-400/70 uppercase tracking-widest mb-0.5">Daftar untuk</div>
                <div className="text-white font-bold">{event.name}</div>
                <div className="text-gray-500 text-xs mt-0.5">
                    {new Date(event.event_date).toLocaleDateString('ms-MY', {
                        day: 'numeric', month: 'long', year: 'numeric'
                    })}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nama Penuh <span className="text-red-400">*</span>
                    </label>
                    <input
                        required
                        value={form.name}
                        onChange={set('name')}
                        type="text"
                        placeholder="Nama anda"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all backdrop-blur-sm"
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Nombor Telefon <span className="text-red-400">*</span>
                    </label>
                    <input
                        required
                        value={form.phone}
                        onChange={set('phone')}
                        type="tel"
                        placeholder="0123456789"
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-gray-500 rounded-xl px-4 py-3 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all backdrop-blur-sm"
                    />
                </div>

                {/* Email (optional) */}
                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                        Email <span className="text-gray-600 normal-case font-normal">(pilihan / optional)</span>
                    </label>
                    <input
                        value={form.email}
                        onChange={set('email')}
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
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            Mendaftar...
                        </span>
                    ) : 'Daftar Sekarang 🎉'}
                </button>
            </form>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ParticipantRegister = () => {
    const { eventId } = useParams();

    const [event, setEvent] = useState(null);
    const [status, setStatus] = useState('loading'); // loading | open | closed | draw_started | success | error
    const [participant, setParticipant] = useState(null);

    useEffect(() => {
        if (!eventId) {
            setStatus('error');
            return;
        }
        fetchEvent(eventId)
            .then(ev => {
                setEvent(ev);
                if (ev.draw_started) setStatus('draw_started');
                else if (!ev.registration_open) setStatus('closed');
                else setStatus('open');
            })
            .catch(() => setStatus('error'));
    }, [eventId]);

    const handleSuccess = (p) => {
        setParticipant(p);
        setStatus('success');
    };

    return (
        <div
            className="min-h-screen relative flex flex-col items-center justify-center px-6 py-10"
            style={{
                backgroundImage: "url('/LandscapeBg2.png')",
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

            {/* Header */}
            <div className="relative z-10 mb-8 text-center">
                <h1 className="text-3xl font-black text-yellow-400 drop-shadow-lg">🎉 Lucky Draw</h1>
                <p className="text-gray-400 text-sm mt-1">Portal Pendaftaran Peserta</p>
            </div>

            {/* Content */}
            <div className="relative z-10 w-full flex flex-col items-center">
                {status === 'loading' && <LoadingView />}
                {status === 'open' && <RegisterForm event={event} onSuccess={handleSuccess} />}
                {status === 'closed' && <ClosedView event={event} />}
                {status === 'draw_started' && <DrawStartedView event={event} />}
                {status === 'success' && <SuccessView participant={participant} event={event} />}
                {status === 'error' && (
                    <div className="text-center text-red-400 text-sm">
                        ⚠️ Link tidak sah atau event tidak ditemui.
                    </div>
                )}
            </div>

            <p className="relative z-10 text-center text-gray-700 text-xs mt-10">
                Sistem Cabutan Bertuah Digital • v1.0
            </p>
        </div>
    );
};

export default ParticipantRegister;