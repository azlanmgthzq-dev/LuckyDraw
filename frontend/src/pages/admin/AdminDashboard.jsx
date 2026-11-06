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

const EMPTY_PRIZE_FORM = { title: '', prize_order: '', winner_count: 1, selection_method: 'random', image_url: '', is_mystery: false, id: null };

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
    const [timeLeft, setTimeLeft] = useState('');

    // Modal visibility
    const [showCreateEvent, setShowCreateEvent] = useState(false);
    const [showAddPrize, setShowAddPrize] = useState(false);
    const [showAddVIP, setShowAddVIP] = useState(false);

    // Form state
    const [eventForm, setEventForm] = useState({ name: '', description: '', event_date: '' });
    const [prizeForm, setPrizeForm] = useState(EMPTY_PRIZE_FORM);
    const [prizeModalParticipants, setPrizeModalParticipants] = useState([]);
    const [prizeModalParticipantsLoading, setPrizeModalParticipantsLoading] = useState(false);
    const [vipForm, setVipForm] = useState({ name: '', email: '', phone: '' });
    const [regDuration, setRegDuration] = useState(3);

    // ─── Load Data ───────────────────────────────────────────────
    useEffect(() => { loadEvents(); }, []);

    useEffect(() => {
        if (selectedEvent) loadEventData(selectedEvent.id);
    }, [selectedEvent?.id]);

    // Countdown timer
    useEffect(() => {
        let interval;
        if (selectedEvent?.registration_open && selectedEvent?.registration_closes_at) {
            const tick = () => {
                const distance = new Date(selectedEvent.registration_closes_at) - Date.now();
                if (distance < 0) {
                    setTimeLeft('CLOSED');
                    clearInterval(interval);
                } else {
                    const m = Math.floor((distance % 3600000) / 60000);
                    const s = Math.floor((distance % 60000) / 1000);
                    setTimeLeft(`${m}m ${s}s`);
                }
            };
            tick();
            interval = setInterval(tick, 1000);
        } else {
            setTimeLeft('');
        }
        return () => clearInterval(interval);
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

    // Open the prize modal (add or edit) and fetch fresh participants for the scripted pickers
    const openPrizeModal = async (form) => {
        setPrizeForm(form);
        setShowAddPrize(true);
        if (!selectedEvent) return;
        setPrizeModalParticipantsLoading(true);
        try {
            setPrizeModalParticipants(await participantService.getAll(selectedEvent.id));
        } catch {
            setPrizeModalParticipants(participants);
        } finally {
            setPrizeModalParticipantsLoading(false);
        }
    };

    // scriptedWinners: [{ winner_index, participant_id }] — only filled slots, sent by AddPrizeModal
    const handleSavePrize = async (e, scriptedWinners = []) => {
        e.preventDefault();
        if (!selectedEvent) return;
        setActionLoading(true);
        try {
            const isEdit = !!prizeForm.id;
            const saved = isEdit
                ? await prizeService.update(prizeForm.id, prizeForm)
                : await prizeService.create(selectedEvent.id, prizeForm);

            // draw_winner uses scripted_winners regardless of selection_method,
            // so always clear old rows on edit, then re-add only if scripted.
            if (prizeForm.selection_method === 'scripted' || isEdit) {
                await prizeService.clearScriptedWinners(saved.id);
            }
            if (prizeForm.selection_method === 'scripted') {
                for (const w of scriptedWinners) {
                    await prizeService.setScriptedWinner(saved.id, w.participant_id, w.winner_index);
                }
            }

            showMessage('success', isEdit ? 'Hadiah dikemaskini / Prize updated' : 'Hadiah ditambah / Prize added');
            setShowAddPrize(false);
            setPrizeForm(EMPTY_PRIZE_FORM);
            await loadEventData(selectedEvent.id);
        } catch (err) {
            showMessage('error', err.message || 'Gagal menyimpan hadiah');
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

    const handleEditPrize = (prize) => openPrizeModal({ ...prize });

    const handleAddVIP = async (e) => {
        e.preventDefault();
        if (!selectedEvent) return;
        setActionLoading(true);
        try {
            const vip = await participantService.preRegister(selectedEvent.id, { ...vipForm, is_pre_registered: true });
            showMessage('success', `VIP didaftar. Kod check-in: ${vip.checkin_code ?? '-'}`);
            setShowAddVIP(false);
            setVipForm({ name: '', email: '', phone: '' });
            await loadEventData(selectedEvent.id);
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Gagal daftar VIP');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckIn = async (participantId) => {
        try {
            await participantService.checkIn(selectedEvent.id, participantId);
            showMessage('success', 'Daftar masuk berjaya / Check-in successful');
            await loadEventData(selectedEvent.id);
        } catch {
            showMessage('error', 'Gagal daftar masuk / Failed to check-in');
        }
    };

    const handleDeleteParticipant = async (participantId) => {
        if (!window.confirm('Padam peserta ini? Keputusan cabutan mereka juga akan dipadam.')) return;
        try {
            await participantService.deleteOne(selectedEvent.id, participantId);
            showMessage('success', 'Peserta dipadam / Participant deleted');
            await loadEventData(selectedEvent.id);
        } catch {
            showMessage('error', 'Gagal memadam peserta / Failed to delete participant');
        }
    };

    // Full reset: closes open draw sessions, deletes results and all participants
    const handleDeleteAllParticipants = async () => {
        try {
            await participantService.deleteAll(selectedEvent.id);
            showMessage('success', 'Semua peserta dipadam / All participants deleted');
            await loadEventData(selectedEvent.id);
        } catch {
            showMessage('error', 'Gagal memadam peserta / Failed to delete participants');
        }
    };

    const handleOpenRegistration = async () => {
        setActionLoading(true);
        try {
            await eventService.openRegistration(selectedEvent.id, regDuration);
            showMessage('success', 'Pendaftaran dibuka / Registration opened');
            await loadEvents();
        } catch {
            showMessage('error', 'Gagal buka pendaftaran');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCloseRegistration = async () => {
        setActionLoading(true);
        try {
            await eventService.closeRegistration(selectedEvent.id);
            showMessage('success', 'Pendaftaran ditutup / Registration closed');
            await loadEvents();
        } catch {
            showMessage('error', 'Gagal tutup pendaftaran');
        } finally {
            setActionLoading(false);
        }
    };

    const handleArchiveEvent = async (id) => {
        if (!window.confirm('Archive acara ini? / Archive this event?')) return;
        try {
            await eventService.archive(id);
            showMessage('success', 'Acara diarkib / Event archived');
            if (selectedEvent?.id === id) setSelectedEvent(null);
            await loadEvents();
        } catch {
            showMessage('error', 'Gagal arkib acara');
        }
    };

    // ─── Render ───────────────────────────────────────────────────
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
                            onClick={() => navigate(`/lobby/${selectedEvent.id}`)}
                            className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors animate-pulse"
                        >
                            🎲 Mula Draw / Start Draw
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
                    <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${
                        message.type === 'error'
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
                                onClick={() => navigate(`/lobby/${selectedEvent.id}`)}
                                className={`px-4 py-2 font-bold rounded-lg transition-colors ${
                                    selectedEvent
                                        ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
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
                            className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                                activeTab === tab.id
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
                                    onAddPrize={() => openPrizeModal(EMPTY_PRIZE_FORM)}
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
                                    timeLeft={timeLeft}
                                    regDuration={regDuration}
                                    setRegDuration={setRegDuration}
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
                    participants={prizeModalParticipants}
                    participantsLoading={prizeModalParticipantsLoading}
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