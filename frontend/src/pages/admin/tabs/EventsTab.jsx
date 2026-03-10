import React from 'react';

const EventsTab = ({ events, selectedEvent, onSelectEvent, onCreateEvent, onArchiveEvent }) => {
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-white">Senarai Acara / Event List</h2>
                <button
                    onClick={onCreateEvent}
                    className="bg-[#DC2626] hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    + Cipta Acara / Create Event
                </button>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-10 text-gray-500 border border-dashed border-gray-700 rounded-xl mb-6">
                    Tiada acara ditemui. / No events found.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            onClick={() => onSelectEvent(event)}
                            className={`p-5 rounded-xl border cursor-pointer transition-all ${
                                selectedEvent?.id === event.id
                                    ? 'bg-gray-900 border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-white truncate pr-2">{event.name}</h3>
                                {event.registration_open ? (
                                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-md whitespace-nowrap">OPEN</span>
                                ) : (
                                    <span className="bg-red-500/20 text-red-400 text-xs px-2 py-1 rounded-md whitespace-nowrap">CLOSED</span>
                                )}
                            </div>
                            <p className="text-sm text-gray-400 mb-4 h-10 overflow-hidden line-clamp-2">
                                {event.description || 'Tiada deskripsi / No description'}
                            </p>
                            <div className="flex justify-between items-center mt-2">
                                <div className="text-xs text-gray-500">
                                    📅 {new Date(event.event_date).toLocaleDateString()}
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onArchiveEvent(event.id);
                                    }}
                                    className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                >
                                    🗄️ Archive
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EventsTab;