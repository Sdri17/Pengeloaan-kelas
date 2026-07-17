import React, { useState, useEffect } from 'react';
import { Users, FileSpreadsheet, CheckSquare, Settings as SettingsIcon, LogOut, Cloud, LayoutDashboard, School, HelpCircle, Download, Menu, X, Sun, Moon } from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import DataSiswa from '../pages/DataSiswa';
import Nilai from '../pages/Nilai';
import Absensi from '../pages/Absensi';
import Pengaturan from '../pages/Pengaturan';
import IdentitasSekolah from '../pages/IdentitasSekolah';
import Panduan from '../pages/Panduan';
import EksporTerpadu from '../pages/EksporTerpadu';
import { Settings, AppUser, store } from '../lib/store';
import toast from 'react-hot-toast';

interface LayoutProps {
  user: AppUser;
  role: 'guru' | 'kepsek';
  onLogout: () => void;
  syncData: () => Promise<void>;
  isSyncing: boolean;
  hasUnsyncedChanges?: boolean;
  settings: Settings | null;
  setSettings: (s: Settings | null) => void;
  syncStats?: {
    percentage: number;
    unsyncedCount: number;
    totalItems: number;
    queueItems: { store: string; id: string; action: string }[];
  };
}

export default function Layout({ user, role, onLogout, syncData, isSyncing, hasUnsyncedChanges, settings, setSettings, syncStats }: LayoutProps) {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isAddingSemester, setIsAddingSemester] = useState(false);
  const [newSemesterName, setNewSemesterName] = useState('');

  const handleConfirmAddSemester = async () => {
    if (!settings || !newSemesterName.trim()) return;
    const name = newSemesterName.trim();
    const list = settings.daftar_semester || ['Ganjil 2026', 'Genap 2026'];
    if (list.includes(name)) {
      toast.error('Semester sudah ada');
      return;
    }
    const newList = [...list, name];
    const newSettings = { ...settings, daftar_semester: newList, semester_aktif: name };
    setSettings(newSettings);
    await store.settings.setItem('app_settings', newSettings);
    toast.success(`Semester ${name} berhasil ditambahkan dan diaktifkan`);
    setIsAddingSemester(false);
  };

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, [isLightMode]);

  const menus = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'siswa', label: 'Data Siswa', icon: Users },
    { id: 'nilai', label: 'Nilai', icon: FileSpreadsheet },
    { id: 'absensi', label: 'Absensi', icon: CheckSquare },
    { id: 'ekspor', label: 'Ekspor Terpadu', icon: Download },
    ...(role === 'guru' ? [
      { id: 'identitas', label: 'Identitas Sekolah', icon: School },
      { id: 'pengaturan', label: 'Pengaturan', icon: SettingsIcon },
    ] : []),
    { id: 'panduan', label: 'Panduan', icon: HelpCircle },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 overflow-hidden font-sans relative">
      {/* Subtle Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.05)_0%,transparent_100%)] z-0"></div>
      
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0 opacity-0 overflow-hidden'} transition-all duration-300 ease-in-out bg-slate-800/50 backdrop-blur-xl border-r border-slate-700/50 flex flex-col justify-between z-10 relative shrink-0`}>
        <div className="w-64">
          <div className="p-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Cloud className="text-white w-5 h-5" />
              </div>
              <span className="tracking-tight">EduSync</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1 pl-10">{settings?.nama_sekolah || 'Nama Sekolah Belum Diatur'}</p>
          </div>
          
          <nav className="px-4 space-y-1 mt-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {menus.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveMenu(m.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-sm transition-all ${
                    activeMenu === m.id 
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium' 
                      : 'text-slate-400 hover:bg-slate-700/40 hover:text-slate-100 border border-transparent'
                  }`}
                >
                  <Icon size={18} className={activeMenu === m.id ? 'opacity-80' : 'opacity-60'} />
                  {m.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6 mt-auto space-y-3 w-64">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/50 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 uppercase">
              {user.name ? user.name.substring(0, 2) : user.username.substring(0, 2)}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-medium text-slate-200 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{role === 'kepsek' ? 'Kepala Sekolah' : 'Guru Kelas'}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-rose-400 border border-transparent hover:border-rose-500/30 hover:bg-rose-500/10 rounded-lg text-xs transition-colors mt-2"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        <header className="h-20 bg-slate-900/40 backdrop-blur-md border-b border-slate-700/50 px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-3">
              {menus.find(m => m.id === activeMenu)?.label}
              {role === 'kepsek' && <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Mode Baca Saja</span>}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 font-medium tracking-wider uppercase">
              <span>Semester Aktif:</span>
              <select 
                value={settings?.semester_aktif || ''}
                onChange={async (e) => {
                  if (!settings) return;
                  if (e.target.value === 'ADD_NEW') {
                    setNewSemesterName('');
                    setIsAddingSemester(true);
                  } else {
                    const newSettings = { ...settings, semester_aktif: e.target.value };
                    setSettings(newSettings);
                    await store.settings.setItem('app_settings', newSettings);
                  }
                }}
                className="bg-transparent border-none text-indigo-400 focus:ring-0 outline-none cursor-pointer appearance-none px-0 font-bold"
              >
                {(settings?.daftar_semester || ['Ganjil 2026', 'Genap 2026']).map(sem => (
                  <option key={sem} value={sem} className="bg-slate-800 text-slate-200">{sem}</option>
                ))}
                <option value="ADD_NEW" className="bg-slate-800 text-emerald-400 font-bold">+ Tambah Semester...</option>
              </select>
              <span className="text-slate-600">•</span>
              <span>Kelas: {settings?.nama_kelas || '-'}</span>
            </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLightMode(!isLightMode)}
              className="p-2 rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-all flex items-center justify-center"
              title={isLightMode ? "Ubah ke Dark Mode" : "Ubah ke Light Mode"}
            >
              {isLightMode ? <Moon size={16} /> : <Sun size={16} />}
            </button>
            {settings?.appsScriptUrl && (
              <div className="flex items-center gap-3">
                {syncStats && syncStats.unsyncedCount > 0 ? (
                  <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full animate-pulse" title={`${syncStats.unsyncedCount} perubahan menunggu sinkronisasi di latar belakang`}>
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                    </span>
                    <span>{syncStats.unsyncedCount} Antrean</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full" title="Semua data lokal telah sinkron dengan Google Sheet">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{syncStats ? `${syncStats.percentage}%` : '100%'} Sinkron</span>
                  </div>
                )}
                <button 
                  onClick={syncData}
                  disabled={isSyncing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    isSyncing 
                      ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400 animate-pulse' 
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600'
                  }`}
                  title="Sinkronisasi manual ke Google Sheet"
                >
                  <div className={`w-1.5 h-1.5 rounded-full bg-indigo-400 ${isSyncing ? 'animate-ping' : ''}`}></div>
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron Sekarang'}</span>
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              <Cloud size={14} className={isSyncing ? 'animate-bounce' : ''} />
              <span>Offline-First</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <div className="bg-slate-800/40 rounded-2xl border border-slate-700/50 backdrop-blur-sm min-h-full overflow-hidden">
            {activeMenu === 'dashboard' && (
              <Dashboard 
                semester={settings?.semester_aktif || ''} 
                syncData={syncData} 
                isSyncing={isSyncing} 
              />
            )}
            {activeMenu === 'siswa' && <DataSiswa role={role} settings={settings} setSettings={setSettings} semester={settings?.semester_aktif || ''} />}
            {activeMenu === 'nilai' && <Nilai role={role} semester={settings?.semester_aktif || ''} settings={settings} />}
            {activeMenu === 'absensi' && <Absensi role={role} semester={settings?.semester_aktif || ''} settings={settings} setSettings={setSettings} />}
            {activeMenu === 'ekspor' && <EksporTerpadu settings={settings} />}
            {activeMenu === 'identitas' && role === 'guru' && <IdentitasSekolah settings={settings} setSettings={setSettings} />}
            {activeMenu === 'pengaturan' && role === 'guru' && <Pengaturan role={role} settings={settings} setSettings={setSettings} currentUser={user} />}
            {activeMenu === 'panduan' && <Panduan />}
          </div>
        </div>
      </main>

      {/* Modal Add Semester */}
      {isAddingSemester && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Tambah Semester Baru</h3>
            <p className="text-sm text-slate-400 mb-4">Masukkan nama semester baru untuk ditambahkan dan diaktifkan:</p>
            <input 
              type="text"
              autoFocus
              value={newSemesterName}
              onChange={e => setNewSemesterName(e.target.value)}
              placeholder="Contoh: Ganjil 2027"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsAddingSemester(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmAddSemester}
                disabled={!newSemesterName.trim()}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/20 transition-colors disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
