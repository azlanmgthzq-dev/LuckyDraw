import React, { useState, useRef } from 'react';

// "JEAN PAUL MICHEL" → "JP"
const getInitials = (name) => {
    if (!name) return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
};

const ParticipantsTab = ({ selectedEvent, participants, onAddVIP, onCheckIn, onDeleteOne, onDeleteAll, onResetDraw, onUploadPhoto }) => {
    const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
    const [uploadingId, setUploadingId] = useState(null);

    // One hidden file input shared by all rows; remembers which row asked
    const fileInputRef = useRef(null);
    const photoTargetRef = useRef(null);

    const pickPhoto = (participantId) => {
        photoTargetRef.current = participantId;
        fileInputRef.current?.click();
    };

    const handlePhotoSelected = async (e) => {
        const file = e.target.files?.[0];
        const participantId = photoTargetRef.current;
        e.target.value = ''; // allow choosing the same file again
        if (!file || !participantId) return;
        setUploadingId(participantId);
        try {
            await onUploadPhoto(participantId, file);
        } finally {
            setUploadingId(null);
        }
    };

    if (!selectedEvent) {
        return (
            <div className="text-center py-10 text-gray-500">
                Sila pilih acara dahulu. / Please select an event first.
            </div>
        );
    }

    const winnerCount = participants.filter(p => p.is_winner).length;

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6 gap-3 flex-wrap">
                <h2 className="text-lg font-bold text-white flex items-center gap-3">
                    Senarai Peserta / Participants
                    <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full border border-gray-700">
                        {participants.length} Total
                    </span>
                    {winnerCount > 0 && (
                        <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-1 rounded-full border border-yellow-500/30">
                            🏆 {winnerCount} Pemenang
                        </span>
                    )}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Reset Draw (confirmation is handled by onResetDraw) */}
                    {participants.length > 0 && (
                        <button
                            onClick={onResetDraw}
                            className="bg-amber-900/40 hover:bg-amber-600 border border-amber-600/50 text-amber-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            🔄 Reset Draw
                        </button>
                    )}
                    {/* Delete All */}
                    {participants.length > 0 && (
                        !confirmDeleteAll ? (
                            <button
                                onClick={() => setConfirmDeleteAll(true)}
                                className="bg-red-900/40 hover:bg-red-700 border border-red-700/50 text-red-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                            >
                                🗑 Padam Semua
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-red-900/30 border border-red-600/50 rounded-lg px-3 py-1.5">
                                <span className="text-red-300 text-xs font-medium">Pasti padam semua?</span>
                                <button
                                    onClick={() => { onDeleteAll(); setConfirmDeleteAll(false); }}
                                    className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded-md text-xs font-bold transition-colors"
                                >
                                    Ya, Padam
                                </button>
                                <button
                                    onClick={() => setConfirmDeleteAll(false)}
                                    className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded-md text-xs font-medium transition-colors"
                                >
                                    Batal
                                </button>
                            </div>
                        )
                    )}
                    {/* Add VIP */}
                    <button
                        onClick={onAddVIP}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                        + Daftar VIP
                    </button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelected}
                className="hidden"
            />

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-800 text-gray-400 text-sm">
                            <th className="p-4 font-medium">ID</th>
                            <th className="p-4 font-medium">Nama / Name</th>
                            <th className="p-4 font-medium">Kenalan / Contact</th>
                            <th className="p-4 font-medium">Status</th>
                            <th className="p-4 font-medium text-right">Tindakan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {participants.map((p) => (
                            <tr
                                key={p.id}
                                className={`transition-colors ${p.is_winner
                                        ? 'bg-yellow-500/5 hover:bg-yellow-500/10'
                                        : 'hover:bg-gray-800/50'
                                    }`}
                            >
                                <td className="p-4 text-sm font-mono text-gray-500">
                                    #{String(p.id).padStart(4, '0')}
                                </td>
                                <td className="p-4 text-sm font-medium text-white">
                                    <div className="flex items-center gap-3">
                                        {p.photo_url ? (
                                            <img
                                                src={p.photo_url}
                                                alt=""
                                                className="w-9 h-9 rounded-full object-cover border border-gray-600 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-gray-700 text-gray-300 text-xs font-bold flex items-center justify-center shrink-0">
                                                {getInitials(p.name)}
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {p.name || 'Anonymous'}
                                                {p.is_winner && (
                                                    <span className="text-yellow-400 text-xs" title={`Menang: ${p.prize_title}`}>
                                                        🏆
                                                    </span>
                                                )}
                                            </div>
                                            {p.is_winner && p.prize_title && (
                                                <div className="text-[11px] text-yellow-500/70 mt-0.5">
                                                    {p.prize_title} — #{p.winner_index}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-400">
                                    <div>{p.email || '-'}</div>
                                    {p.phone && <div className="text-xs">{p.phone}</div>}
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col items-start gap-1">
                                        {p.is_pre_registered && (
                                            <div className="flex items-center gap-1.5">
                                                <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded uppercase">VIP</span>
                                                {p.checkin_code && (
                                                    <span className="font-mono text-[11px] text-gray-300 bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded" title="Kod check-in">
                                                        {p.checkin_code}
                                                    </span>
                                                )}
                                                <span className={`text-[10px] ${p.checked_in ? 'text-green-400' : 'text-gray-500'}`}>
                                                    {p.checked_in ? '✔ Hadir' : 'Belum hadir'}
                                                </span>
                                            </div>
                                        )}
                                        {p.is_winner ? (
                                            <span className="bg-yellow-500/20 text-yellow-400 text-[10px] px-2 py-0.5 rounded uppercase">Pemenang</span>
                                        ) : p.is_eligible ? (
                                            <span className="text-green-400 text-xs">✔ Eligible</span>
                                        ) : (
                                            <span className="text-red-400 text-xs">✘ Not Eligible</span>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {p.is_pre_registered && !p.checked_in && (
                                            <button
                                                onClick={() => onCheckIn(p.id)}
                                                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                            >
                                                Check In
                                            </button>
                                        )}
                                        <button
                                            onClick={() => pickPhoto(p.id)}
                                            disabled={uploadingId !== null}
                                            className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-200 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title={p.photo_url ? 'Tukar gambar / Change photo' : 'Muat naik gambar / Upload photo'}
                                        >
                                            {uploadingId === p.id ? '⏳' : '📷'}
                                        </button>
                                        <button
                                            onClick={() => onDeleteOne(p.id)}
                                            className="bg-red-900/40 hover:bg-red-700 border border-red-700/40 text-red-400 hover:text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                            title="Padam peserta"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {participants.length === 0 && (
                            <tr>
                                <td colSpan="5" className="p-8 text-center text-gray-500">
                                    Tiada peserta ditemui. / No participants found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ParticipantsTab;