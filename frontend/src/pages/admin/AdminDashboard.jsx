import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import eventService from '../../services/eventService';
import participantService from '../../services/participantService';
import prizeService from '../../services/prizeService';

const AdminDashboard = () => {
    const { logout } = useAuth();

    // Core State
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [prizes, setPrizes] = useState([]);
    const [participantCount, setParticipantCount] = useState(0);
    const [activeTab, setActiveTab] = useState('events');

    // UI State
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');

    // Modal States
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [showAddPrize, setShowAddPrize] = useState(false);
    const [showAddVIP, setShowAddVIP] = useState(false);

    // Form States
    const [eventForm, setEventForm] = useState({ name: '', description: '', event_date: '' });
    const [prizeForm, setPrizeForm] = useState({ title: '', prize_order: '', winner_count: 1, selection_method: 'random', id: null });
    const [vipForm, setVipForm] = useState({ name: '', email: '', phone: '' });
    const [regDuration, setRegDuration] = useState(3);

    // Load Initial Data
    useEffect(() => {
        loadEvents();
    }, []);

    // Load Event Data when event is selected
    useEffect(() => {
        if (selectedEvent) {
            loadEventData(selectedEvent.id);
        }
    }, [selectedEvent?.id]);

    // Countdown Timer Logic
    useEffect(() => {
        let interval;
        if (selectedEvent && selectedEvent.registration_open && selectedEvent.registration_closes_at) {
            const updateTimer = () => {
                const now = new Date().getTime();
                const closeTime = new Date(selectedEvent.registration_closes_at).getTime();
                const distance = closeTime - now;

                if (distance < 0) {
                    setTimeLeft('CLOSED');
                    clearInterval(interval);
                } else {
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    setTimeLeft(`${minutes}m ${seconds}s`);
                }
            };
            updateTimer();
            interval = setInterval(updateTimer, 1000);
        } else {
            setTimeLeft('');
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [selectedEvent]);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const loadEvents = async () => {
        try {
            setLoading(true);
            const data = await eventService.getAll();
            setEvents(data);
            if (data.length > 0 && !selectedEvent) {
                setSelectedEvent(data[0]);
            } else if (selectedEvent && data.length > 0) {
                // Update selected event if there are changes
                const updated = data.find(e => e.id === selectedEvent.id);
                if (updated) setSelectedEvent(updated);
            }
        } catch (error) {
            showMessage('error', 'Gagal memuatkan acara / Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const loadEventData = async (eventId) => {
        try {
            setLoading(true);
            const [parts, counts, przs] = await Promise.all([
                participantService.getAll(eventId),
                participantService.getCount(eventId),
                prizeService.getAll(eventId)
            ]);
            setParticipants(parts);
            setParticipantCount(counts);
            setPrizes(przs);
        } catch (error) {
            showMessage('error', 'Gagal memuatkan data acara / Failed to load event data');
        } finally {
            setLoading(false);
        }
    };

    // --- Action Handlers ---

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await eventService.create(eventForm);
            showMessage('success', 'Acara dicipta / Event created');
            setShowCreateEvent(false);
            setEventForm({ name: '', description: '', event_date: '' });
            await loadEvents();
        } catch (error) {
            showMessage('error', error.response?.data?.message || 'Gagal mencipta acara / Failed to create event');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSavePrize = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        setActionLoading(true);
        try {
            if (prizeForm.id) {
                await prizeService.update(prizeForm.id, prizeForm);
                showMessage('success', 'Hadiah dikemaskini / Prize updated');
            } else {
                await prizeService.create(selectedEvent.id, prizeForm);
                showMessage('success', 'Hadiah ditambah / Prize added');
            }
            setShowAddPrize(false);
            setPrizeForm({ title: '', prize_order: '', winner_count: 1, selection_method: 'random', id: null });
            await loadEventData(selectedEvent.id);
        } catch (error) {
            showMessage('error', error.response?.data?.message || 'Gagal menyimpan hadiah / Failed to save prize');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeletePrize = async (id) => {
        if (!window.confirm('Adakah anda pasti? / Are you sure?')) return;
        try {
            await prizeService.delete(id);
            showMessage('success', 'Hadiah dipadam / Prize deleted');
            await loadEventData(selectedEvent.id);
        } catch (error) {
            showMessage('error', 'Gagal memadam hadiah / Failed to delete prize');
        }
    };

    const handleEditPrize = (prize) => {
        setPrizeForm({ ...prize });
        setShowAddPrize(true);
    };

    const handleAddVIP = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        setActionLoading(true);
        try {
            const payload = { ...vipForm, is_pre_registered: true };
            await participantService.preRegister(selectedEvent.id, payload);
            showMessage('success', 'VIP didaftar / VIP registered');
            setShowAddVIP(false);
            setVipForm({ name: '', email: '', phone: '' });
            await loadEventData(selectedEvent.id);
        } catch (error) {
            showMessage('error', error.response?.data?.message || 'Gagal daftar VIP / Failed to register VIP');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckIn = async (participantId) => {
        if (!selectedEvent) return;
        try {
            await participantService.checkIn(selectedEvent.id, participantId);
            showMessage('success', 'Daftar masuk berjaya / Check-in successful');
            await loadEventData(selectedEvent.id);
        } catch (error) {
            showMessage('error', 'Gagal daftar masuk / Failed to check-in');
        }
    };

    const handleOpenRegistration = async () => {
        if (!selectedEvent) return;
        setActionLoading(true);
        try {
            await eventService.openRegistration(selectedEvent.id, regDuration);
            showMessage('success', 'Pendaftaran dibuka / Registration opened');
            await loadEvents(); // Refresh to catch new timers and stats
        } catch (error) {
            showMessage('error', 'Gagal buka pendaftaran / Failed to open registration');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseRegistration = async () => {
        if (!selectedEvent) return;
        setActionLoading(true);
        try {
            await eventService.closeRegistration(selectedEvent.id);
            showMessage('success', 'Pendaftaran ditutup / Registration closed');
            await loadEvents();
        } catch (error) {
            showMessage('error', 'Gagal tutup pendaftaran / Failed to close registration');
        } finally {
            setActionLoading(false);
        }
    };

    // --- Render Helpers ---

    const renderTabs = () => (
        <div className="flex space-x-2 border-b border-gray-800 mb-6 overflow-x-auto">
            {[
                { id: 'events', label: 'Events (Acara)' },
                { id: 'prizes', label: 'Prizes (Hadiah)' },
                { id: 'participants', label: 'Participants (Peserta)' },
                { id: 'registration', label: 'Registration (Pendaftaran)' },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                        ? 'border-yellow-500 text-yellow-500'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">
            {/* Top Navbar */}
            <header className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl md:text-2xl font-bold text-yellow-500 flex items-center">
                        🎉 Lucky Draw System
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 hidden sm:inline-block">Admin Logged In</span>
                    <button
                        onClick={logout}
                        className="bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main Layout Area */}
            <div className="flex-1 flex flex-col mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">

                {/* Global Messages */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/50 text-red-500' : 'bg-green-500/10 border border-green-500/50 text-green-500'}`}>
                        <span className="text-sm font-medium">{message.text}</span>
                    </div>
                )}

                {/* Dashboard Controls: Event Selector & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Acara Aktif / Active Event</label>
                        <select
                            value={selectedEvent?.id || ''}
                            onChange={(e) => {
                                const ev = events.find(event => event.id === parseInt(e.target.value));
                                setSelectedEvent(ev);
                            }}
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                        >
                            <option value="" disabled>-- Sila Pilih Acara / Select Event --</option>
                            {events.map(event => (
                                <option key={event.id} value={event.id}>
                                    {event.name} ({new Date(event.event_date).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 flex flex-col justify-center items-center">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Total Participants</label>
                        <div className="text-4xl font-bold text-yellow-500">{participantCount}</div>
                    </div>
                </div>

                {renderTabs()}

                {/* Tab Content */}
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 min-h-[400px]">
                    {loading && <div className="text-center py-10 text-gray-400">Loading data...</div>}

                    {!loading && activeTab === 'events' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-lg font-bold text-white">Senarai Acara / Event List</h2>
                                <button
                                    onClick={() => setShowCreateEvent(true)}
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
                                            onClick={() => setSelectedEvent(event)}
                                            className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedEvent?.id === event.id
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
                                            <p className="text-sm text-gray-400 mb-4 h-10 overflow-hidden line-clamp-2">{event.description || 'Tiada deskripsi / No description'}</p>
                                            <div className="text-xs text-gray-500 flex items-center">
                                                📅 {new Date(event.event_date).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!loading && activeTab === 'prizes' && (
                        <div>
                            {!selectedEvent ? (
                                <div className="text-center py-10 text-gray-500">Sila pilih acara dahulu. / Please select an event first.</div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-white">Senarai Hadiah / Prize List</h2>
                                        <button
                                            onClick={() => {
                                                setPrizeForm({ title: '', prize_order: '', winner_count: 1, selection_method: 'random', id: null });
                                                setShowAddPrize(true);
                                            }}
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
                                                <div key={prize.id} className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-md font-mono">#{prize.prize_order}</span>
                                                            <h3 className="font-bold text-white text-lg">{prize.title}</h3>
                                                        </div>
                                                        <div className="text-sm text-gray-400 flex items-center gap-3">
                                                            <span>🏆 {prize.winner_count} Winners</span>
                                                            <span className={`px-2 py-0.5 rounded text-xs ${prize.selection_method === 'scripted' ? 'bg-purple-900 text-purple-200' : 'bg-blue-900 text-blue-200'}`}>
                                                                {prize.selection_method.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                        <button
                                                            onClick={() => handleEditPrize(prize)}
                                                            className="flex-1 sm:flex-none px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-sm transition-colors"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeletePrize(prize.id)}
                                                            className="flex-1 sm:flex-none px-3 py-1.5 bg-red-900/40 hover:bg-red-600 border border-red-800/50 text-white rounded-md text-sm transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {!loading && activeTab === 'participants' && (
                        <div>
                            {!selectedEvent ? (
                                <div className="text-center py-10 text-gray-500">Sila pilih acara dahulu. / Please select an event first.</div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-lg font-bold text-white flex items-center gap-3">
                                            Senarai Peserta / Participants
                                            <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full border border-gray-700">{participants.length} Total</span>
                                        </h2>
                                        <button
                                            onClick={() => setShowAddVIP(true)}
                                            className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            + Daftar VIP / Pre-Register VIP
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto rounded-xl border border-gray-800">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-gray-800 text-gray-400 text-sm">
                                                    <th className="p-4 font-medium">ID</th>
                                                    <th className="p-4 font-medium">Name</th>
                                                    <th className="p-4 font-medium">Contact</th>
                                                    <th className="p-4 font-medium">Status / Eligible</th>
                                                    <th className="p-4 font-medium text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-800">
                                                {participants.map((p) => (
                                                    <tr key={p.id} className="hover:bg-gray-800/50 transition-colors">
                                                        <td className="p-4 text-sm font-mono text-gray-500">#{p.id}</td>
                                                        <td className="p-4 text-sm font-medium text-white">{p.name || 'Anonymous'}</td>
                                                        <td className="p-4 text-sm text-gray-400">
                                                            <div>{p.email}</div>
                                                            {p.phone && <div className="text-xs">{p.phone}</div>}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col items-start gap-1">
                                                                {p.is_pre_registered && <span className="bg-purple-500/20 text-purple-400 text-[10px] px-2 py-0.5 rounded uppercase">VIP</span>}
                                                                {p.is_eligible
                                                                    ? <span className="text-green-400 text-xs">✔ Eligible</span>
                                                                    : <span className="text-red-400 text-xs">✘ Not Eligible</span>
                                                                }
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {/* If they are pre-registered (VIP) and haven't checked in yet */}
                                                            {p.is_pre_registered && !p.checked_in ? (
                                                                <button
                                                                    onClick={() => handleCheckIn(p.id)}
                                                                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                                                                >
                                                                    Check In
                                                                </button>
                                                            ) : (
                                                                <span className="text-gray-600 text-xs">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {participants.length === 0 && (
                                                    <tr>
                                                        <td colSpan="5" className="p-8 text-center text-gray-500">Tiada peserta ditemui. / No participants found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {!loading && activeTab === 'registration' && (
                        <div>
                            {!selectedEvent ? (
                                <div className="text-center py-10 text-gray-500">Sila pilih acara dahulu. / Please select an event first.</div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 max-w-lg mx-auto text-center space-y-6">
                                    <h2 className="text-2xl font-bold text-white">Kawalan Pendaftaran / Registration Control</h2>

                                    <div className={`text-xl font-medium px-6 py-2 rounded-full border ${selectedEvent.registration_open ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-500 border-red-500/30'}`}>
                                        Status: {selectedEvent.registration_open ? 'OPEN' : 'CLOSED'}
                                    </div>

                                    {selectedEvent.registration_open && (
                                        <div className="bg-gray-800 rounded-xl p-6 w-full border border-gray-700">
                                            <div className="text-sm text-gray-400 mb-2">Masa Tinggal / Time Remaining</div>
                                            <div className="text-5xl font-mono text-yellow-500 font-bold mb-6 tracking-wider">
                                                {timeLeft || '00m 00s'}
                                            </div>
                                            <button
                                                onClick={handleCloseRegistration}
                                                disabled={actionLoading}
                                                className="w-full bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                                            >
                                                {actionLoading ? 'Processing...' : 'Tutup Pendaftaran Sekarang / Close Now'}
                                            </button>
                                        </div>
                                    )}

                                    {!selectedEvent.registration_open && (
                                        <div className="bg-gray-800 rounded-xl p-6 w-full border border-gray-700 mt-6">
                                            <label className="block text-sm font-medium text-gray-300 mb-3 text-left">Tetapkan Tempoh (Minit) / Set Duration (Mins)</label>
                                            <div className="flex gap-3 mb-6">
                                                {[3, 5, 7].map(mins => (
                                                    <button
                                                        key={mins}
                                                        onClick={() => setRegDuration(mins)}
                                                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${regDuration === mins
                                                            ? 'bg-yellow-600 border-yellow-500 text-white'
                                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                                                            }`}
                                                    >
                                                        {mins} Min
                                                    </button>
                                                ))}
                                            </div>
                                            <button
                                                onClick={handleOpenRegistration}
                                                disabled={actionLoading}
                                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                                            >
                                                {actionLoading ? 'Processing...' : 'Buka Pendaftaran / Open Registration'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* --- Modals --- */}

            {/* Create Event Modal */}
            {showCreateEvent && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Cipta Acara / Create Event</h3>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nama Acara / Event Name</label>
                                <input required value={eventForm.name} onChange={e => setEventForm({ ...eventForm, name: e.target.value })} type="text" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" placeholder="e.g. Annual Dinner 2026" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Deskripsi / Description</label>
                                <textarea value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" rows="3"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Tarikh / Date</label>
                                <input required value={eventForm.event_date} onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })} type="date" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowCreateEvent(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Batal / Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-[#DC2626] hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan / Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add/Edit Prize Modal */}
            {showAddPrize && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">{prizeForm.id ? 'Kemaskini Hadiah / Edit Prize' : 'Tambah Hadiah / Add Prize'}</h3>
                        <form onSubmit={handleSavePrize} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nama Hadiah / Prize Title</label>
                                <input required value={prizeForm.title} onChange={e => setPrizeForm({ ...prizeForm, title: e.target.value })} type="text" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" placeholder="e.g. Grand Prize - iPhone 15" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Susunan / Order</label>
                                    <input required value={prizeForm.prize_order} onChange={e => setPrizeForm({ ...prizeForm, prize_order: parseInt(e.target.value) || '' })} type="number" min="1" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Bil. Pemenang / Winners</label>
                                    <input required value={prizeForm.winner_count} onChange={e => setPrizeForm({ ...prizeForm, winner_count: parseInt(e.target.value) || '' })} type="number" min="1" max="6" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Method Buka Hadiah / Selection Method</label>
                                <select value={prizeForm.selection_method} onChange={e => setPrizeForm({ ...prizeForm, selection_method: e.target.value })} className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500">
                                    <option value="random">Random (Rawak)</option>
                                    <option value="scripted">Scripted (Ditetapkan)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowAddPrize(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Batal / Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">Simpan / Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Register VIP Modal */}
            {showAddVIP && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-white mb-4">Daftar VIP / Pre-Register VIP</h3>
                        <form onSubmit={handleAddVIP} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nama Penuh / Full Name</label>
                                <input required value={vipForm.name} onChange={e => setVipForm({ ...vipForm, name: e.target.value })} type="text" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Email <span className="text-gray-500">(Optional)</span></label>
                                <input value={vipForm.email} onChange={e => setVipForm({ ...vipForm, email: e.target.value })} type="email" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" placeholder="john@example.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">No. Telefon / Phone <span className="text-gray-500">(Optional)</span></label>
                                <input value={vipForm.phone} onChange={e => setVipForm({ ...vipForm, phone: e.target.value })} type="tel" className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500" placeholder="+60123456789" />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowAddVIP(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Batal / Cancel</button>
                                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50">Daftar / Register</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;