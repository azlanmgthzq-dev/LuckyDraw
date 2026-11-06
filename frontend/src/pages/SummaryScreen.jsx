import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import drawService from '../services/drawService';

const SUMMARY_SUBTITLE = 'GTA Cowboy In The Sky — Dinner 2026';

const SummaryScreen = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [eventData, setEventData] = useState(null);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([eventService.getById(eventId), drawService.getResults(eventId)])
            .then(([ev, res]) => { setEventData(ev); setResults(res); }) // results sorted by prize_order, winner_index
            .catch(() => setError('Gagal memuatkan keputusan.'))
            .finally(() => setLoading(false));
    }, [eventId]);

    const eventDate = eventData?.event_date
        ? new Date(eventData.event_date).toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })
        : null;

    return (
        <div className="western-screen min-h-screen print:bg-white print:text-black">
            <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-west-border tracking-[0.6em] mb-2 print:hidden">✦ ★ ✦</div>
                    <h1 className="font-rye text-4xl md:text-6xl text-west-gold drop-shadow-[0_0_20px_rgba(212,160,23,0.35)] print:text-black print:drop-shadow-none">
                        🏆 HALL OF FAME
                    </h1>
                    <p className="font-oswald font-semibold uppercase tracking-[0.25em] text-sm md:text-base text-west-cream mt-3 print:text-black">
                        {SUMMARY_SUBTITLE}
                    </p>
                    {(eventData?.name || eventDate) && (
                        <p className="font-oswald uppercase tracking-widest text-xs text-west-muted mt-2 print:text-gray-600">
                            {eventData?.name}{eventData?.name && eventDate && ' • '}{eventDate && `📅 ${eventDate}`}
                        </p>
                    )}
                    <div className="rope-divider max-w-xs mx-auto mt-6 print:hidden" />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-center gap-3 mb-6 print:hidden">
                    <button
                        onClick={() => navigate('/admin')}
                        className="western-btn-secondary px-5 py-2.5 text-sm"
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <button
                        onClick={() => window.print()}
                        disabled={results.length === 0}
                        className="western-btn px-5 py-2.5 text-sm"
                    >
                        🖨️ Cetak / Export PDF
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="text-center font-rye text-xl text-west-gold py-10 animate-pulse">Memuatkan...</div>
                ) : error ? (
                    <div className="text-center text-[#F1A198] py-10">⚠️ {error}</div>
                ) : results.length === 0 ? (
                    <div className="western-card text-center font-oswald uppercase tracking-widest text-west-muted py-10">
                        🌵 Tiada pemenang lagi.
                    </div>
                ) : (
                    <div className="western-card no-ornament overflow-x-auto print:bg-white print:border-gray-300 print:shadow-none">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-west-gold text-west-bg font-oswald uppercase tracking-[0.15em] text-sm print:bg-gray-100 print:text-black">
                                    <th className="p-4 font-bold w-16">No.</th>
                                    <th className="p-4 font-bold">Nama Pemenang</th>
                                    <th className="p-4 font-bold">Hadiah</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <tr
                                        key={r.id}
                                        className="odd:bg-west-card even:bg-west-surface border-t border-west-border/20 text-west-cream print:bg-white print:text-black print:border-gray-200"
                                    >
                                        <td className="p-4 font-rye text-west-gold/80 print:text-gray-600">{i + 1}</td>
                                        <td className="p-4 font-oswald font-semibold uppercase tracking-wide text-base">
                                            <span className="mr-2">🏆</span>{r.winner_name}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {r.prize_image && (
                                                    <img src={r.prize_image} alt="" className="w-10 h-10 object-contain rounded-md bg-west-bg/60 border border-west-border/50 print:hidden" />
                                                )}
                                                <span>{r.prize_title}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="text-center font-oswald uppercase tracking-widest text-west-muted text-xs mt-8 print:text-gray-600">
                    ★ Jumlah pemenang: {results.length} ★ Dicetak {new Date().toLocaleString('ms-MY')} ★
                </p>
            </div>
        </div>
    );
};

export default SummaryScreen;
