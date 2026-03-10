import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import eventService from '../../services/eventService';
import participantService from '../../services/participantService';
import prizeService from '../../services/prizeService';

// Tabs
import EventsTab from './tabs/EventsTab';
import PrizesTab from './tabs/PrizesTab';
import ParticipantsTab from './tabs/ParticipantsTab';
import RegistrationTab from './tabs/RegistrationTab';

// Modals
import CreateEventModal from './modals/CreateEventModal';
import AddPrizeModal from './modals/AddPrizeModal';
import AddVIPModal from './modals/AddVIPModal';

const TABS = [
    { id: 'events', label: 'Events (Acara)' },
    { id: 'prizes', label: 'Prizes (Hadiah)' },
    { id: 'participants', label: 'Participants (Peserta)' },
    { id: 'registration', label: 'Registration (Pendaftaran)' },
];

const AdminDashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

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

    // Modal visibility
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [showAddPrize, setShowAddPrize] = useState(false);
    const [showAddVIP, setShowAddVIP] = useState(false);

    // Form state
    const [eventForm, setEventForm] = useState({ name: '', description: '', event_date: '' });
    const [prizeForm, setPrizeForm] = useState({ title: '', prize_order: '', winner_count: 1, selection_method: 'random', image_url: '', id: null });
    const [vipForm, setVipForm] = useState({ name: '', email: '', phone: '' });

    // ─── Load Data ───────────────────────────────────────────────
    useEffect(() => { loadEvents(); }, []);

    useEffect(() => {
        if (selectedEvent) loadEventData(selectedEvent.id);
    }, [selectedEvent?.id]);

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
            } else if (selectedEvent) {
                const updated = data.find(e => e.id === selectedEvent.id);
                if (updated) setSelectedEvent(updated);
            }
        } catch {
            showMessage('error', 'Gagal memuatkan acara / Failed to load events');
        } finally {
            setLoading(false);
        }
    };

    const loadEventData = async (eventId) => {
        try {
            setLoading(true);
            const [parts, count, przs] = await Promise.all([
                participantService.getAll(eventId),
                participantService.getCount(eventId),
                prizeService.getAll(eventId),
            ]);
            setParticipants(parts);
            setParticipantCount(count);
            setPrizes(przs);
        } catch {
            showMessage('error', 'Gagal memuatkan data acara / Failed to load event data');
        } finally {
            setLoading(false);
        }
    };

    // ─── Event Handlers ──────────────────────────────────────────
    const handleCreateEvent = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        try {
            await eventService.create(eventForm);
            showMessage('success', 'Acara dicipta / Event created');
            setShowCreateEvent(false);
            setEventForm({ name: '', description: '', event_date: '' });
            await loadEvents();
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal mencipta acara');
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
            setPrizeForm({ title: '', prize_order: '', winner_count: 1, selection_method: 'random', image_url: '', id: null });
            await loadEventData(selectedEvent.id);
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal menyimpan hadiah');
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
        } catch {
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
            await participantService.addVIP(selectedEvent.id, vipForm);
            showMessage('success', 'VIP ditambah / VIP added');
            setShowAddVIP(false);
            setVipForm({ name: '', email: '', phone: '' });
            await loadEventData(selectedEvent.id);
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal menambah VIP');
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenRegistration = async () => {
        if (!selectedEvent) return;
        setActionLoading(true);
        try {
            await eventService.openRegistration(selectedEvent.id);
            showMessage('success', 'Pendaftaran dibuka / Registration opened');
            await loadEvents();
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal membuka pendaftaran');
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
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal menutup pendaftaran');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckIn = async (participantId) => {
        try {
            await participantService.checkIn(selectedEvent.id, participantId);
            showMessage('success', 'Check-in berjaya / Check-in successful');
            await loadEventData(selectedEvent.id);
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal check-in');
        }
    };

    const handleArchiveEvent = async (eventId) => {
        if (!window.confirm('Archive acara ini? / Archive this event?')) return;
        try {
            await eventService.archive(eventId);
            showMessage('success', 'Acara diarkibkan / Event archived');
            await loadEvents();
        } catch {
            showMessage('error', 'Gagal mengarkibkan acara / Failed to archive event');
        }
    };

    // ─── Delete Participant Handlers ─────────────────────────────
    const handleDeleteParticipant = async (participantId) => {
        if (!window.confirm('Padam peserta ini? / Delete this participant?')) return;
        try {
            await participantService.deleteOne(selectedEvent.id, participantId);
            showMessage('success', 'Peserta dipadam / Participant deleted');
            await loadEventData(selectedEvent.id);
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal memadam peserta');
        }
    };

    const handleDeleteAllParticipants = async () => {
        try {
            await participantService.deleteAll(selectedEvent.id);
            showMessage('success', 'Semua peserta dipadam / All participants deleted');
            await loadEventData(selectedEvent.id);
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal memadam semua peserta');
        }
    };

    const handleGoToLobby = () => {
        if (!selectedEvent) return;
        navigate(`/lobby/${selectedEvent.id}`);
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col font-sans">

            {/* Navbar */}
            <header className="bg-gray-950 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <h1 className="text-xl md:text-2xl font-bold text-yellow-500">
                        🎉 Lucky Draw System
                    </h1>
                    {selectedEvent && (
                        <button
                            onClick={handleGoToLobby}
                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors animate-pulse"
                        >
                            🎲 Mula Sesi / Start Session
                        </button>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-400 hidden sm:block">Admin Logged In</span>
                    <button
                        onClick={logout}
                        className="border border-gray-700 hover:bg-gray-800 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Main */}
            <div className="flex-1 mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">

                {/* Global Message */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${message.type === 'error'
                            ? 'bg-red-500/10 border border-red-500/50 text-red-500'
                            : 'bg-green-500/10 border border-green-500/50 text-green-500'
                        }`}>
                        {message.text}
                    </div>
                )}

                {/* Event Selector + Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Acara Aktif / Active Event
                        </label>
                        <select
                            value={selectedEvent?.id || ''}
                            onChange={(e) => setSelectedEvent(events.find(ev => ev.id === parseInt(e.target.value)))}
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-yellow-500"
                        >
                            <option value="" disabled>-- Sila Pilih Acara / Select Event --</option>
                            {events.map(ev => (
                                <option key={ev.id} value={ev.id}>
                                    {ev.name} ({new Date(ev.event_date).toLocaleDateString()})
                                </option>
                            ))}
                        </select>
                        <div className="mt-4 flex justify-end">
                            <button
                                disabled={!selectedEvent}
                                onClick={handleGoToLobby}
                                className={`px-5 py-2.5 font-bold rounded-lg transition-all flex items-center gap-2 ${selectedEvent
                                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white shadow-[0_0_15px_rgba(202,138,4,0.3)] hover:scale-105'
                                        : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                🎲 Mula Sesi Cabutan / Start Draw Session
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 flex flex-col justify-center items-center">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Total Participants</label>
                        <div className="text-4xl font-bold text-yellow-500">{participantCount}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-2 border-b border-gray-800 mb-6 overflow-x-auto">
                    {TABS.map(tab => (
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

                {/* Tab Content */}
                <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 min-h-[400px]">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Loading data...</div>
                    ) : (
                        <>
                            {activeTab === 'events' && (
                                <EventsTab
                                    events={events}
                                    selectedEvent={selectedEvent}
                                    onSelectEvent={setSelectedEvent}
                                    onCreateEvent={() => setShowCreateEvent(true)}
                                    onArchiveEvent={handleArchiveEvent}
                                />
                            )}
                            {activeTab === 'prizes' && (
                                <PrizesTab
                                    selectedEvent={selectedEvent}
                                    prizes={prizes}
                                    onAddPrize={() => {
                                        setPrizeForm({ title: '', prize_order: '', winner_count: 1, selection_method: 'random', image_url: '', id: null });
                                        setShowAddPrize(true);
                                    }}
                                    onEditPrize={handleEditPrize}
                                    onDeletePrize={handleDeletePrize}
                                />
                            )}
                            {activeTab === 'participants' && (
                                <ParticipantsTab
                                    selectedEvent={selectedEvent}
                                    participants={participants}
                                    onAddVIP={() => setShowAddVIP(true)}
                                    onCheckIn={handleCheckIn}
                                    onDeleteOne={handleDeleteParticipant}
                                    onDeleteAll={handleDeleteAllParticipants}
                                />
                            )}
                            {activeTab === 'registration' && (
                                <RegistrationTab
                                    selectedEvent={selectedEvent}
                                    onOpenRegistration={handleOpenRegistration}
                                    onCloseRegistration={handleCloseRegistration}
                                    actionLoading={actionLoading}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showCreateEvent && (
                <CreateEventModal
                    eventForm={eventForm}
                    setEventForm={setEventForm}
                    onSubmit={handleCreateEvent}
                    onClose={() => setShowCreateEvent(false)}
                    actionLoading={actionLoading}
                />
            )}
            {showAddPrize && (
                <AddPrizeModal
                    prizeForm={prizeForm}
                    setPrizeForm={setPrizeForm}
                    onSubmit={handleSavePrize}
                    onClose={() => setShowAddPrize(false)}
                    actionLoading={actionLoading}
                />
            )}
            {showAddVIP && (
                <AddVIPModal
                    vipForm={vipForm}
                    setVipForm={setVipForm}
                    onSubmit={handleAddVIP}
                    onClose={() => setShowAddVIP(false)}
                    actionLoading={actionLoading}
                />
            )}
        </div>
    );
};

export default AdminDashboard;