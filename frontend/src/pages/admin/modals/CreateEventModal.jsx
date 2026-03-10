import React from 'react';

const CreateEventModal = ({ eventForm, setEventForm, onSubmit, onClose, actionLoading }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Cipta Acara / Create Event</h3>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Nama Acara / Event Name
                        </label>
                        <input
                            required
                            value={eventForm.name}
                            onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                            placeholder="e.g. Annual Dinner 2026"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Deskripsi / Description
                        </label>
                        <textarea
                            value={eventForm.description}
                            onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                            rows="3"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Tarikh / Date
                        </label>
                        <input
                            required
                            value={eventForm.event_date}
                            onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })}
                            type="date"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                        >
                            Batal / Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading}
                            className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {actionLoading ? 'Menyimpan...' : 'Simpan / Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateEventModal;