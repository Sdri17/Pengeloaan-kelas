import React, { useState, useEffect } from 'react';
import { Settings as SettingsType, store, defaultSettings } from '../lib/store';
import { Save, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function IdentitasSekolah({ settings, setSettings }: { settings: SettingsType | null, setSettings: (s: SettingsType | null) => void }) {
  const [formData, setFormData] = useState<SettingsType>(settings || defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [newSemester, setNewSemester] = useState('');

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addSemester = () => {
    if (newSemester.trim() && !formData.daftar_semester?.includes(newSemester.trim())) {
      setFormData(prev => ({
        ...prev,
        daftar_semester: [...(prev.daftar_semester || []), newSemester.trim()]
      }));
      setNewSemester('');
    }
  };

  const removeSemester = (sem: string) => {
    setFormData(prev => {
      const newDaftar = (prev.daftar_semester || []).filter(s => s !== sem);
      return { 
        ...prev, 
        daftar_semester: newDaftar,
        semester_aktif: prev.semester_aktif === sem ? (newDaftar[0] || '') : prev.semester_aktif
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await store.settings.setItem('app_settings', formData);
      setSettings(formData);
      toast.success('Identitas Sekolah berhasil disimpan.', { duration: 3000 });
    } catch (e) {
      console.error(e);
      toast.error('Gagal menyimpan Identitas Sekolah.', { duration: 3000 });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-8 text-slate-200 h-full overflow-auto custom-scrollbar">
      <form onSubmit={handleSave} className="space-y-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-5">
            <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700/50 pb-3">Identitas Sekolah & Kelas</h3>
            
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nama Sekolah</label>
              <input type="text" name="nama_sekolah" value={formData.nama_sekolah ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">NPSN</label>
              <input type="text" name="npsn" value={formData.npsn ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Alamat Sekolah</label>
              <input type="text" name="alamat" value={formData.alamat ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Email Sekolah</label>
              <input type="email" name="email" value={formData.email ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nama Kepala Sekolah</label>
              <input type="text" name="nama_kepala_sekolah" value={formData.nama_kepala_sekolah ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">NIP Kepala Sekolah</label>
              <input type="text" name="nip_kepala_sekolah" value={formData.nip_kepala_sekolah ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
            </div>
            
            <div className="pt-4 border-t border-slate-700/50">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nama Kelas</label>
              <input type="text" name="nama_kelas" value={formData.nama_kelas ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" required />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nama Wali Kelas</label>
              <input type="text" name="nama_wali_kelas" value={formData.nama_wali_kelas ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">NIP Wali Kelas</label>
              <input type="text" name="nip_wali_kelas" value={formData.nip_wali_kelas ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
            </div>
          </div>

          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-5">
            <h3 className="text-lg font-medium text-slate-200 border-b border-slate-700/50 pb-3">Pengaturan Semester</h3>
            
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Semester Aktif</label>
              <select name="semester_aktif" value={formData.semester_aktif ?? ''} onChange={handleChange} className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all cursor-pointer" required>
                {(formData.daftar_semester || []).map(sem => (
                  <option key={sem} value={sem}>{sem}</option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Daftar Semester</label>
              <div className="flex gap-2 mb-3">
                <input 
                  type="text" 
                  value={newSemester} 
                  onChange={(e) => setNewSemester(e.target.value)} 
                  placeholder="Semester Baru"
                  className="flex-1 px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" 
                />
                <button type="button" onClick={addSemester} className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-xl flex items-center gap-1 text-sm font-medium transition-colors">
                  <Plus size={16} /> Tambah
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {(formData.daftar_semester || []).map(sem => (
                  <div key={sem} className="flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded-lg border border-slate-700/30">
                    <span className="text-sm">{sem}</span>
                    <button type="button" onClick={() => removeSemester(sem)} className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-700/50 flex justify-end">
          <button 
            type="submit" 
            disabled={isSaving}
            className="flex items-center gap-2 bg-indigo-500 text-white px-6 py-3 rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 font-medium transition-all"
          >
            <Save size={18} />
            Simpan Identitas
          </button>
        </div>
      </form>
    </div>
  );
}
