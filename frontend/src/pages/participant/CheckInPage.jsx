import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import participantPortalService from '../../services/participantPortalService';

// VIP check-in: email + 6-character code given by the admin
const CheckInPage = () => {
    const { eventId } = useParams();

    const [event, setEvent] = useState(null);
    const [pageStatus, setPageStatus] = useState('loading'); // loading | ready | error
    const [form, setForm] = useState({ email: '', code: '' });
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // { type: 'success' | 'already' | 'error', text }

    useEffect(() => {
        participantPortalService.getEventById(eventId)
            .then(ev => { setEvent(ev); setPageStatus('ready'); })
            .catch(() => setPageStatus('error'));
    }, [eventId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setResult(null);
        try {
            const res = await participantPortalService.checkIn(eventId, form.email, form.code);
            setResult(res.status === 'already'
                ? { type: 'already', text: `✅ Anda sudah check-in sebelum ini, ${res.name}!` }
                : { type: 'success', text: `✅ Selamat Datang, ${res.name}! Check-in berjaya.` });
        } catch {
            setResult({ type: 'error', text: '❌ Email atau kod tidak sah.' });
        } finally {
            setSubmitting(false);
        }
    };

    const done = result && result.type !== 'error';

    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center px-4 py-10 bg-slate-950 overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />

            {/* Header */}
            <div className="relative z-10 mb-8 text-center">
                <div className="inline-block bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-bold tracking-[0.25em] uppercase px-3 py-1 rounded-full mb-3">
                    VIP Check-In
                </div>
                <h1 className="text-3xl font-black text-yellow-400 drop-shadow-lg">
                    {pageStatus === 'ready' ? event.name : '🎉 Lucky Draw'}
                </h1>
                {event?.event_date && (
                    <p className="text-gray-400 text-sm mt-1">
                        {new Date(event.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                )}
            </div>

            <div className="relative z-10 w-full max-w-sm">
                {pageStatus === 'loading' && (
                    <div className="flex justify-center py-16">
                        <div className="w-10 h-10 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
                    </div>
                )}

                {pageStatus === 'error' && (
                    <div className="text-center text-red-400 text-sm">⚠️ Link tidak sah atau event tidak ditemui.</div>
                )}

                {pageStatus === 'ready' && done && (
                    <div className="bg-white/5 border border-green-500/30 rounded-3xl p-8 text-center animate-fade-in-up">
                        <div className="text-6xl mb-4">🎊</div>
                        <p className="text-white text-lg font-bold leading-snug">{result.text}</p>
                        <p className="text-gray-400 text-sm mt-3">Sila tunggu cabutan bermula. Semoga berjaya!</p>
                    </div>
                )}

                {pageStatus === 'ready' && !done && (
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

                        {result?.type === 'error' && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                                {result.text}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 text-white font-black text-lg rounded-2xl shadow-[0_8px_20px_rgba(220,38,38,0.4)] transition-all active:scale-95"
                        >
                            {submitting ? 'Menyemak...' : 'Check In'}
                        </button>
                    </form>
                )}
            </div>

            <p className="relative z-10 text-center text-gray-700 text-xs mt-10">Sistem Cabutan Bertuah Digital</p>
        </div>
    );
};

export default CheckInPage;
