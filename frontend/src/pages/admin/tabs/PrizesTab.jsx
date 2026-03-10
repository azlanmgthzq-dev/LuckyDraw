import React from 'react';

const PrizesTab = ({ selectedEvent, prizes, onAddPrize, onEditPrize, onDeletePrize }) => {
    if (!selectedEvent) {
        return (
            <div className="text-center py-10 text-gray-500">
                Sila pilih acara dahulu. / Please select an event first.
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">Senarai Hadiah / Prize List</h2>
                <button
                    onClick={onAddPrize}
                    className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    + Tambah Hadiah / Add Prize
                </button>
            </div>

            {prizes.length === 0 ? (
                <div className="text-center py-10 text-gray-500 border border-dashed border-gray-700 rounded-xl mb-6">
                    Tiada hadiah didaftarkan. / No prizes added.
                </div>
            ) : (
                <div className="space-y-4">
                    {prizes.map((prize) => (
                        <div
                            key={prize.id}
                            className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                        >
                            <div className="flex items-center gap-4">
                                {/* Prize Image Thumbnail */}
                                {prize.image_url ? (
                                    <img
                                        src={prize.image_url}
                                        alt={prize.title}
                                        className="w-14 h-14 rounded-lg object-cover border border-gray-600 flex-shrink-0"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-lg bg-gray-700 border border-gray-600 flex items-center justify-center flex-shrink-0 text-2xl">
                                        🏆
                                    </div>
                                )}
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-md font-mono">
                                            #{prize.prize_order}
                                        </span>
                                        <h3 className="font-bold text-white text-lg">{prize.title}</h3>
                                    </div>
                                    <div className="text-sm text-gray-400 flex items-center gap-3">
                                        <span>🏆 {prize.winner_count} Winners</span>
                                        <span className={`px-2 py-0.5 rounded text-xs ${
                                            prize.selection_method === 'scripted'
                                                ? 'bg-purple-900 text-purple-200'
                                                : 'bg-blue-900 text-blue-200'
                                        }`}>
                                            {prize.selection_method.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                <button
                                    onClick={() => onEditPrize(prize)}
                                    className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => onDeletePrize(prize.id)}
                                    className="flex-1 sm:flex-none px-3 py-1.5 bg-red-900/40 hover:bg-red-600 border border-red-800/50 text-white rounded-md text-sm transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PrizesTab;