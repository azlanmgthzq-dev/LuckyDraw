import React from 'react';

const AddVIPModal = ({ vipForm, setVipForm, onSubmit, onClose, actionLoading }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Daftar VIP / Pre-Register VIP</h3>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Nama Penuh / Full Name
                        </label>
                        <input
                            required
                            value={vipForm.name}
                            onChange={e => setVipForm({ ...vipForm, name: e.target.value })}
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Email <span className="text-gray-500">(Optional)</span>
                        </label>
                        <input
                            value={vipForm.email}
                            onChange={e => setVipForm({ ...vipForm, email: e.target.value })}
                            type="email"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                            placeholder="john@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            No. Telefon / Phone <span className="text-gray-500">(Optional)</span>
                        </label>
                        <input
                            value={vipForm.phone}
                            onChange={e => setVipForm({ ...vipForm, phone: e.target.value })}
                            type="tel"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                            placeholder="+60123456789"
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
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                        >
                            {actionLoading ? 'Mendaftar...' : 'Daftar / Register'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddVIPModal;