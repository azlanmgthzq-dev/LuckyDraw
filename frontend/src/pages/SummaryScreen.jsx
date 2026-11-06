import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import drawService from '../services/drawService';

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
        <div className="min-h-screen bg-slate-950 text-white print:bg-white print:text-black">
            <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="text-xs font-bold tracking-[0.3em] uppercase text-yellow-500 print:text-gray-600 mb-2">
                        Keputusan Cabutan Bertuah
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black">{eventData?.name ?? '...'}</h1>
                    {eventDate && <p className="text-gray-400 print:text-gray-600 mt-1">📅 {eventDate}</p>}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap justify-center gap-3 mb-6 print:hidden">
                    <button
                        onClick={() => navigate('/admin')}
                        className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-colors"
                    >
                        ← Kembali ke Dashboard
                    </button>
                    <button
                        onClick={() => window.print()}
                        disabled={results.length === 0}
                        className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-40"
                    >
                        🖨️ Cetak / Export PDF
                    </button>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="text-center text-gray-400 py-10 animate-pulse">Memuatkan...</div>
                ) : error ? (
                    <div className="text-center text-red-400 py-10">⚠️ {error}</div>
                ) : results.length === 0 ? (
                    <div className="text-center text-gray-500 py-10 border border-dashed border-gray-700 rounded-xl">
                        Tiada pemenang lagi.
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-white/10 print:border-gray-300">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 print:bg-gray-100 text-gray-400 print:text-gray-700 text-sm">
                                    <th className="p-4 font-semibold w-16">No.</th>
                                    <th className="p-4 font-semibold">Nama Pemenang</th>
                                    <th className="p-4 font-semibold">Hadiah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 print:divide-gray-200">
                                {results.map((r, i) => (
                                    <tr key={r.id} className="hover:bg-white/[0.03] print:hover:bg-transparent">
                                        <td className="p-4 font-mono text-gray-400 print:text-gray-600">{i + 1}</td>
                                        <td className="p-4 font-bold">{r.winner_name}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                {r.prize_image && (
                                                    <img src={r.prize_image} alt="" className="w-10 h-10 object-contain rounded-lg bg-white/5 border border-white/10 print:hidden" />
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

                <p className="text-center text-gray-600 text-xs mt-8">
                    Jumlah pemenang: {results.length} • Dicetak {new Date().toLocaleString('ms-MY')}
                </p>
            </div>
        </div>
    );
};

export default SummaryScreen;
