import React from 'react';

const RegistrationTab = ({
    selectedEvent,
    onOpenRegistration,
    onCloseRegistration,
    actionLoading,
}) => {
    if (!selectedEvent) {
        return (
            <div className="text-center py-10 text-gray-500">
                Sila pilih acara dahulu. / Please select an event first.
            </div>
        );
    }

    const isOpen = selectedEvent.registration_open;

    return (
        <div className="flex flex-col items-center justify-center py-10 max-w-md mx-auto text-center space-y-6">
            <h2 className="text-2xl font-bold text-white">
                Kawalan Pendaftaran / Registration Control
            </h2>

            {/* Status badge */}
            <div className={`text-xl font-medium px-8 py-2.5 rounded-full border ${isOpen
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>
                {isOpen ? '🟢 DIBUKA / OPEN' : '🔴 DITUTUP / CLOSED'}
            </div>

            {/* Info text */}
            <p className="text-sm text-gray-500 leading-relaxed">
                {isOpen
                    ? 'Peserta boleh mendaftar sekarang. Tutup pendaftaran bila sedia untuk mulakan cabutan.'
                    : 'Buka pendaftaran untuk membenarkan peserta mendaftar. Anda boleh tutup bila-bila masa.'}
            </p>

            {/* Action button */}
            {isOpen ? (
                <button
                    onClick={onCloseRegistration}
                    disabled={actionLoading}
                    className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
                >
                    {actionLoading ? 'Memproses...' : '🔒 Tutup Pendaftaran / Close Registration'}
                </button>
            ) : (
                <button
                    onClick={onOpenRegistration}
                    disabled={actionLoading}
                    className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
                >
                    {actionLoading ? 'Memproses...' : '🔓 Buka Pendaftaran / Open Registration'}
                </button>
            )}
        </div>
    );
};

export default RegistrationTab;