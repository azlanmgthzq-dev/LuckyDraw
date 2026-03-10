import React, { useState, useRef } from 'react';
import uploadService from '../../../services/uploadService';

const AddPrizeModal = ({ prizeForm, setPrizeForm, onSubmit, onClose, actionLoading }) => {
    const [imageUploading, setImageUploading] = useState(false);
    const [imagePreview, setImagePreview] = useState(prizeForm.image_url || null);
    const [uploadError, setUploadError] = useState('');
    const fileInputRef = useRef(null);

    const handleImageSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Show local preview immediately
        const localPreview = URL.createObjectURL(file);
        setImagePreview(localPreview);
        setUploadError('');
        setImageUploading(true);

        try {
            const result = await uploadService.uploadImage(file);
            // Replace local preview with real Cloudinary URL
            setImagePreview(result.url);
            setPrizeForm(prev => ({ ...prev, image_url: result.url }));
        } catch (err) {
            setUploadError('Gagal muat naik gambar. Cuba lagi. / Upload failed. Try again.');
            setImagePreview(prizeForm.image_url || null);
        } finally {
            setImageUploading(false);
        }
    };

    const handleRemoveImage = () => {
        setImagePreview(null);
        setPrizeForm(prev => ({ ...prev, image_url: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const isEditing = !!prizeForm.id;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold text-white mb-4">
                    {isEditing ? 'Kemaskini Hadiah / Edit Prize' : 'Tambah Hadiah / Add Prize'}
                </h3>

                <form onSubmit={onSubmit} className="space-y-4">

                    {/* Prize Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Nama Hadiah / Prize Title
                        </label>
                        <input
                            required
                            value={prizeForm.title}
                            onChange={e => setPrizeForm({ ...prizeForm, title: e.target.value })}
                            type="text"
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                            placeholder="e.g. Grand Prize - iPhone 15"
                        />
                    </div>

                    {/* Order & Winners */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Susunan / Order
                            </label>
                            <input
                                required
                                value={prizeForm.prize_order}
                                onChange={e => setPrizeForm({ ...prizeForm, prize_order: parseInt(e.target.value) || '' })}
                                type="number"
                                min="1"
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">
                                Bil. Pemenang / Winners
                            </label>
                            <input
                                required
                                value={prizeForm.winner_count}
                                onChange={e => setPrizeForm({ ...prizeForm, winner_count: parseInt(e.target.value) || '' })}
                                type="number"
                                min="1"
                                max="6"
                                className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                            />
                        </div>
                    </div>

                    {/* Selection Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                            Kaedah Pilihan / Selection Method
                        </label>
                        <select
                            value={prizeForm.selection_method}
                            onChange={e => setPrizeForm({ ...prizeForm, selection_method: e.target.value })}
                            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:border-yellow-500"
                        >
                            <option value="random">Random (Rawak)</option>
                            <option value="scripted">Scripted (Ditetapkan)</option>
                        </select>
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            Gambar Hadiah / Prize Image <span className="text-gray-600">(Optional)</span>
                        </label>

                        {/* Image Preview */}
                        {imagePreview ? (
                            <div className="relative mb-3 rounded-xl overflow-hidden border border-gray-700 bg-gray-800 aspect-video flex items-center justify-center">
                                {imageUploading && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-10">
                                        <svg className="animate-spin h-8 w-8 text-yellow-500 mb-2" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="text-sm text-yellow-400">Memuat naik... / Uploading...</span>
                                    </div>
                                )}
                                <img
                                    src={imagePreview}
                                    alt="Prize preview"
                                    className="w-full h-full object-contain max-h-48"
                                />
                                {!imageUploading && (
                                    <button
                                        type="button"
                                        onClick={handleRemoveImage}
                                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold transition-colors shadow-lg"
                                        title="Remove image"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ) : (
                            /* Upload Drop Zone */
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-gray-600 hover:border-yellow-500 rounded-xl p-6 text-center transition-colors group cursor-pointer bg-gray-800/50 hover:bg-gray-800"
                            >
                                <div className="text-3xl mb-2">🖼️</div>
                                <div className="text-sm text-gray-400 group-hover:text-yellow-400 transition-colors font-medium">
                                    Klik untuk pilih gambar
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                    JPEG, PNG, WEBP atau GIF • Maks 5MB
                                </div>
                            </button>
                        )}

                        {/* Hidden File Input */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleImageSelect}
                            className="hidden"
                        />

                        {/* Change image button (when preview exists) */}
                        {imagePreview && !imageUploading && (
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 w-full text-xs text-gray-500 hover:text-yellow-400 transition-colors py-1"
                            >
                                🔄 Tukar gambar / Change image
                            </button>
                        )}

                        {/* Upload Error */}
                        {uploadError && (
                            <p className="mt-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                                ⚠️ {uploadError}
                            </p>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            Batal / Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={actionLoading || imageUploading}
                            className="px-5 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {actionLoading ? 'Menyimpan...' : 'Simpan / Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPrizeModal;