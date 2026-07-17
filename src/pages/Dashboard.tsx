import React, { useState, useEffect } from 'react';
import { store, Student, Grade, Attendance, Settings } from '../lib/store';
import { getSyncStats } from '../lib/sync';
import { Users, BookOpen, CheckSquare, TrendingUp, Filter, BarChart2, PieChart as PieIcon, Cloud, AlertCircle, CheckSquare as CheckIcon } from 'lucide-react';
import { startOfMonth, endOfMonth, parseISO, format, isWithinInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area } from 'recharts';

interface DashboardProps {
  semester: string;
  syncData?: () => Promise<void>;
  isSyncing?: boolean;
}

export default function Dashboard({ semester, syncData, isSyncing }: DashboardProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [filterWaktu, setFilterWaktu] = useState<'Hari Ini' | 'Minggu Ini' | 'Bulan Ini' | 'Semester' | 'Kustom'>('Semester');
  const [filterMapel, setFilterMapel] = useState<string>('Semua');
  const [activeTrendTab, setActiveTrendTab] = useState<'kehadiran' | 'nilai'>('kehadiran');
  
  const [customStartDate, setCustomStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  
  const [attendanceChartData, setAttendanceChartData] = useState<any[]>([]);
  const [subjectChartData, setSubjectChartData] = useState<any[]>([]);
  const [attendanceTrendData, setAttendanceTrendData] = useState<any[]>([]);
  const [gradeTrendData, setGradeTrendData] = useState<any[]>([]);

  // Name resolving states for sync queue items
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allGrades, setAllGrades] = useState<Grade[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);

  const [syncStats, setSyncStats] = useState({
    percentage: 100,
    unsyncedCount: 0,
    totalItems: 0,
    queueItems: [] as { store: string; id: string; action: string }[]
  });

  const [stats, setStats] = useState({
    totalStudents: 0,
    classes: 0,
    attendanceToday: 0,
    avgGrades: 0,
    totalAlumni: 0
  });

  const ATTENDANCE_COLORS = {
    Hadir: '#10b981', // emerald
    Sakit: '#f59e0b', // amber
    Izin: '#6366f1',  // indigo
    Alpa: '#f43f5e'   // rose
  };

  useEffect(() => {
    const loadSettings = async () => {
      const s = await store.settings.getItem<Settings>('app_settings');
      setSettings(s);
    };
    loadSettings();
  }, []);

  useEffect(() => {
    const loadSync = async () => {
      const statsObj = await getSyncStats();
      setSyncStats(statsObj);
    };
    loadSync();
    
    window.addEventListener('data-changed', loadSync);
    window.addEventListener('sync-status-changed', loadSync);
    return () => {
      window.removeEventListener('data-changed', loadSync);
      window.removeEventListener('sync-status-changed', loadSync);
    };
  }, []);

  useEffect(() => {
    const loadStats = async () => {
      const sList: Student[] = [];
      await store.students.iterate<Student, void>((v) => { sList.push(v); });
      setAllStudents(sList);
      
      const uniqueClasses = Array.from(new Set(sList.map(s => s.kelas).filter(Boolean)));
      setAvailableClasses(uniqueClasses);

      const totalAlumni = sList.filter(s => s.kelas && s.kelas.toLowerCase() === 'alumni').length;
      const activeClassesCount = uniqueClasses.filter(c => c && c.toLowerCase() !== 'alumni').length;

      let filteredStudents = sList;
      if (filterKelas === 'Semua') {
        // Only active students (excluding Alumni)
        filteredStudents = sList.filter(s => !s.kelas || s.kelas.toLowerCase() !== 'alumni');
      } else {
        filteredStudents = sList.filter(s => s.kelas === filterKelas);
      }

      // Fetch all raw grades and attendance for name resolving and trends
      const rawGList: Grade[] = [];
      await store.grades.iterate<Grade, void>((v) => { rawGList.push(v); });
      setAllGrades(rawGList);

      const rawAList: Attendance[] = [];
      await store.attendance.iterate<Attendance, void>((v) => { rawAList.push(v); });
      setAllAttendance(rawAList);

      const aList: Attendance[] = [];
      const today = new Date();
      
      let startDate = new Date(2000, 0, 1);
      let endDate = new Date(2100, 0, 1);
      
      if (filterWaktu === 'Hari Ini') {
        startDate = today;
        endDate = today;
      } else if (filterWaktu === 'Minggu Ini') {
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
      } else if (filterWaktu === 'Bulan Ini') {
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
      } else if (filterWaktu === 'Kustom') {
        startDate = parseISO(customStartDate);
        endDate = parseISO(customEndDate);
        endDate.setHours(23, 59, 59, 999);
      }

      rawAList.forEach((v) => {
        if (v.semester !== semester) return;
        if (filterMapel !== 'Semua' && v.mata_pelajaran && v.mata_pelajaran !== filterMapel) return;
        
        const attDate = new Date(v.tanggal);
        if (filterWaktu === 'Semester') {
          aList.push(v);
        } else if (isWithinInterval(attDate, { start: startDate, end: endDate })) {
          aList.push(v);
        }
      });

      const gList: Grade[] = [];
      rawGList.forEach((v) => {
        if (v.semester !== semester) return;
        if (filterMapel !== 'Semua' && v.mata_pelajaran && v.mata_pelajaran !== filterMapel) return;

        if (filterWaktu === 'Semester' || !v.tanggal) {
          gList.push(v);
        } else {
          const gDate = new Date(v.tanggal);
          if (isWithinInterval(gDate, { start: startDate, end: endDate })) {
            gList.push(v);
          }
        }
      });

      const studentIds = new Set(filteredStudents.map(s => s.id));
      const filteredAList = aList.filter(a => studentIds.has(a.id_siswa));
      const filteredGList = gList.filter(g => studentIds.has(g.id_siswa));

      const presentCount = filteredAList.filter(a => a.status === 'Hadir').length;
      const attendancePerc = filteredStudents.length > 0 && filteredAList.length > 0 ? (presentCount / filteredAList.length) * 100 : 0;
      
      const validGrades = filteredGList.filter(g => g.nilai > 0);
      const avgG = validGrades.length > 0 ? validGrades.reduce((a, b) => a + b.nilai, 0) / validGrades.length : 0;

      setStats({
        totalStudents: filteredStudents.length,
        classes: activeClassesCount,
        attendanceToday: attendancePerc,
        avgGrades: avgG,
        totalAlumni
      });

      // Aggregate attendance status counts for interactive Pie Chart
      const statusCounts = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
      filteredAList.forEach(a => {
        if (a.status in statusCounts) {
          statusCounts[a.status as keyof typeof statusCounts]++;
        }
      });
      const attendancePieData = Object.entries(statusCounts).map(([name, value]) => ({
        name,
        value
      }));
      setAttendanceChartData(attendancePieData);

      // Aggregate subject averages for interactive Bar Chart
      const mapelAvg: Record<string, { sum: number; count: number }> = {};
      filteredGList.forEach(g => {
        const mapel = g.mata_pelajaran || 'Umum';
        if (g.nilai > 0) {
          if (!mapelAvg[mapel]) {
            mapelAvg[mapel] = { sum: 0, count: 0 };
          }
          mapelAvg[mapel].sum += g.nilai;
          mapelAvg[mapel].count++;
        }
      });
      const mapelChartData = Object.entries(mapelAvg).map(([name, val]) => ({
        name,
        'Rata-rata': Number((val.sum / val.count).toFixed(1))
      })).sort((a, b) => b['Rata-rata'] - a['Rata-rata']);
      setSubjectChartData(mapelChartData);

      // Calculate daily attendance trend (percentage of Hadir by date)
      const attTrendMap: Record<string, { total: number; hadir: number }> = {};
      filteredAList.forEach(a => {
        if (!a.tanggal) return;
        const dateStr = a.tanggal;
        if (!attTrendMap[dateStr]) {
          attTrendMap[dateStr] = { total: 0, hadir: 0 };
        }
        attTrendMap[dateStr].total++;
        if (a.status === 'Hadir') {
          attTrendMap[dateStr].hadir++;
        }
      });

      const attTrendData = Object.entries(attTrendMap)
        .map(([date, val]) => {
          let formatted = date;
          try {
            formatted = format(parseISO(date), 'dd MMM');
          } catch (e) {}
          return {
            tanggal: date,
            formattedTanggal: formatted,
            'Persentase Hadir': Number(((val.hadir / val.total) * 100).toFixed(1))
          };
        })
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      setAttendanceTrendData(attTrendData);

      // Calculate daily grade average trend (average score by date)
      const grTrendMap: Record<string, { sum: number; count: number }> = {};
      filteredGList.forEach(g => {
        if (!g.tanggal || g.nilai <= 0) return;
        const dateStr = g.tanggal;
        if (!grTrendMap[dateStr]) {
          grTrendMap[dateStr] = { sum: 0, count: 0 };
        }
        grTrendMap[dateStr].sum += g.nilai;
        grTrendMap[dateStr].count++;
      });

      const grTrendData = Object.entries(grTrendMap)
        .map(([date, val]) => {
          let formatted = date;
          try {
            formatted = format(parseISO(date), 'dd MMM');
          } catch (e) {}
          return {
            tanggal: date,
            formattedTanggal: formatted,
            'Rata-rata': Number((val.sum / val.count).toFixed(1))
          };
        })
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal));
      setGradeTrendData(grTrendData);
    };
    loadStats();
  }, [semester, filterKelas, filterWaktu, customStartDate, customEndDate, filterMapel]);

  // Check if charts have any data
  const hasAttendanceData = attendanceChartData.some(d => d.value > 0);
  const hasSubjectData = subjectChartData.length > 0;

  const getQueueItemDetails = (item: { store: string; id: string; action: string }, studentsList: Student[], gradesList: Grade[], attendanceList: Attendance[]) => {
    const actionLabel = item.action === 'delete' ? 'Hapus' : 'Ubah';
    let targetName = 'Data';
    let desc = `ID: ${item.id}`;

    if (item.store === 'students') {
      targetName = 'Siswa';
      const std = studentsList.find(s => s.id === item.id);
      if (std) desc = std.nama;
    } else if (item.store === 'grades') {
      targetName = 'Nilai';
      const gr = gradesList.find(g => g.id === item.id);
      if (gr) {
        const std = studentsList.find(s => s.id === gr.id_siswa);
        desc = `${std ? std.nama : 'Siswa'} - ${gr.mata_pelajaran || 'Umum'} (${gr.nama_kolom}: ${gr.nilai})`;
      }
    } else if (item.store === 'attendance') {
      targetName = 'Absen';
      const att = attendanceList.find(a => a.id === item.id);
      if (att) {
        const std = studentsList.find(s => s.id === att.id_siswa);
        desc = `${std ? std.nama : 'Siswa'} - ${att.tanggal} (${att.status})`;
      }
    }

    return { targetName, actionLabel, desc };
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-slate-200">
      {/* Interactive Header Filters with Glassmorphism */}
      <div className="flex flex-wrap gap-4 bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-xl">
        <div className="flex items-center gap-2 text-slate-400">
          <Filter size={18} />
          <span className="text-sm font-medium uppercase tracking-wider">Filter Dashboard:</span>
        </div>
        
        <select 
          value={filterKelas}
          onChange={e => setFilterKelas(e.target.value)}
          className="px-4 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all cursor-pointer hover:bg-slate-900"
        >
          <option value="Semua">Semua Kelas</option>
          {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <select 
            value={filterWaktu}
            onChange={e => setFilterWaktu(e.target.value as any)}
            className="px-4 py-2 bg-slate-900/60 border border-slate-700/60 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all cursor-pointer hover:bg-slate-900"
          >
            <option value="Semester">Semester Ini</option>
            <option value="Hari Ini">Hari Ini</option>
            <option value="Minggu Ini">Minggu Ini</option>
            <option value="Bulan Ini">Bulan Ini</option>
            <option value="Kustom">Kustom</option>
          </select>

          {filterWaktu === 'Kustom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 [color-scheme:dark] transition-all" />
              <span className="text-slate-500">-</span>
              <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="px-3 py-2 bg-slate-900/60 border border-slate-700/60 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 [color-scheme:dark] transition-all" />
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards Grid with Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-lg transition-all hover:translate-y-[-2px] hover:border-slate-600/50">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-sm">Total Siswa Aktif</p>
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><Users size={20} /></div>
          </div>
          <h3 className="text-3xl font-bold text-slate-100">{stats.totalStudents}</h3>
          <div className="mt-2 text-xs text-indigo-400">{filterKelas === 'Semua' ? `${stats.classes} Kelas Aktif` : `Kelas ${filterKelas}`}</div>
        </div>

        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-lg transition-all hover:translate-y-[-2px] hover:border-slate-600/50">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-sm">Siswa Non Aktif</p>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><Users size={20} /></div>
          </div>
          <h3 className="text-3xl font-bold text-slate-100">{stats.totalAlumni}</h3>
          <div className="mt-2 text-xs text-rose-400">Total Alumni/Lulus</div>
        </div>

        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-lg transition-all hover:translate-y-[-2px] hover:border-slate-600/50">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-sm">Rata-rata Kehadiran</p>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckSquare size={20} /></div>
          </div>
          <h3 className="text-3xl font-bold text-slate-100">{stats.attendanceToday.toFixed(1)}%</h3>
          <div className="mt-2 text-xs text-emerald-400">{filterWaktu}</div>
        </div>

        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-lg transition-all hover:translate-y-[-2px] hover:border-slate-600/50">
          <div className="flex justify-between items-start mb-4">
            <p className="text-slate-400 text-sm">Rata-rata Nilai</p>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><TrendingUp size={20} /></div>
          </div>
          <h3 className="text-3xl font-bold text-slate-100">{stats.avgGrades.toFixed(1)}</h3>
          <div className="mt-2 text-xs text-amber-400 italic">Keseluruhan Tugas & Harian</div>
        </div>

        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-lg transition-all hover:translate-y-[-2px] hover:border-slate-600/50">
          <div className="flex justify-between items-start mb-3">
            <p className="text-slate-400 text-sm">Sinkronisasi Database</p>
            <div className={`p-2 rounded-lg ${syncStats.unsyncedCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
              <Cloud size={20} className={syncStats.unsyncedCount > 0 ? 'animate-pulse' : ''} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-slate-100">{syncStats.percentage}%</h3>
            <span className="text-xs text-slate-400">Tersinkron</span>
          </div>
          
          <div className="mt-3 space-y-2">
            {/* Progress Bar */}
            <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full transition-all duration-500 ${syncStats.unsyncedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${syncStats.percentage}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                {syncStats.unsyncedCount > 0 ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    <span className="text-amber-400 font-medium">{syncStats.unsyncedCount} antrean</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-emerald-400 font-medium">Semua data aman</span>
                  </>
                )}
              </span>
              <span className="font-mono">({syncStats.totalItems - syncStats.unsyncedCount}/{syncStats.totalItems})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row with Trend Chart and Sync queue Details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Interactive Trends Panel */}
        <div className="xl:col-span-2 bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-xl flex flex-col h-[420px]">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6 shrink-0">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-indigo-400 w-5 h-5" />
              <div>
                <h3 className="text-md font-semibold text-slate-100">Analisis Tren Real-Time</h3>
                <p className="text-xs text-slate-400">Tren statistik kehadiran dan pencapaian akademik harian</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Subject Filter inside Trend Panel */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Mata Pelajaran:</span>
                <select 
                  value={filterMapel}
                  onChange={e => setFilterMapel(e.target.value)}
                  className="px-3 py-1.5 bg-slate-900/60 border border-slate-700/60 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all cursor-pointer hover:bg-slate-900"
                >
                  <option value="Semua">Semua Mapel</option>
                  {(settings?.mata_pelajaran || []).map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700/40">
                <button
                  onClick={() => setActiveTrendTab('kehadiran')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTrendTab === 'kehadiran'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Kehadiran
                </button>
                <button
                  onClick={() => setActiveTrendTab('nilai')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTrendTab === 'nilai'
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Rata-rata Nilai
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative">
            {activeTrendTab === 'kehadiran' ? (
              attendanceTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.2)" />
                    <XAxis dataKey="formattedTanggal" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                        borderRadius: '8px', 
                        borderColor: 'rgba(51, 65, 85, 0.5)',
                        color: '#f8fafc'
                      }} 
                      formatter={(value: any) => [`${value}%`, 'Tingkat Kehadiran']}
                    />
                    <Area type="monotone" dataKey="Persentase Hadir" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorHadir)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 rounded-xl border border-dashed border-slate-700/50">
                  <CheckIcon size={36} className="text-slate-500 mb-2" />
                  <p className="text-slate-400 text-sm font-medium">Tidak ada data tren kehadiran</p>
                  <p className="text-slate-500 text-xs mt-1">Ganti filter waktu atau input data absen di halaman Absensi.</p>
                </div>
              )
            ) : (
              gradeTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gradeTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorNilai" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.2)" />
                    <XAxis dataKey="formattedTanggal" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                        borderRadius: '8px', 
                        borderColor: 'rgba(51, 65, 85, 0.5)',
                        color: '#f8fafc'
                      }} 
                      formatter={(value: any) => [value, 'Rata-rata Nilai']}
                    />
                    <Area type="monotone" dataKey="Rata-rata" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNilai)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 rounded-xl border border-dashed border-slate-700/50">
                  <BarChart2 size={36} className="text-slate-500 mb-2" />
                  <p className="text-slate-400 text-sm font-medium">Tidak ada data tren nilai</p>
                  <p className="text-slate-500 text-xs mt-1">Ganti filter waktu atau input nilai ber-tanggal di halaman Nilai.</p>
                </div>
              )
            )}
          </div>
        </div>

        {/* Visibilitas Status Sinkronisasi & Antrean Data */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-xl flex flex-col h-[420px]">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Cloud className="text-indigo-400 w-5 h-5" />
              <div>
                <h3 className="text-md font-semibold text-slate-100">Status Sinkronisasi</h3>
                <p className="text-xs text-slate-400">Antrean perubahan data tertunda (pending)</p>
              </div>
            </div>
            
            {syncData && (
              <button 
                onClick={syncData}
                disabled={isSyncing || syncStats.unsyncedCount === 0}
                className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkron'}</span>
              </button>
            )}
          </div>

          {/* Overall progress indicator */}
          <div className="bg-slate-900/40 border border-slate-700/50 p-4 rounded-xl mb-4 shrink-0 flex items-center gap-4">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle cx="24" cy="24" r="20" stroke="rgba(51, 65, 85, 0.4)" strokeWidth="4" fill="transparent" />
                <circle 
                  cx="24" 
                  cy="24" 
                  r="20" 
                  stroke={syncStats.unsyncedCount > 0 ? '#f59e0b' : '#10b981'} 
                  strokeWidth="4" 
                  fill="transparent" 
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - syncStats.percentage / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute text-xs font-bold font-mono text-slate-200">{syncStats.percentage}%</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-slate-300">
                {syncStats.unsyncedCount > 0 ? 'Beberapa Perubahan Tertunda' : 'Semua Data Tersinkron'}
              </h4>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {syncStats.unsyncedCount > 0 
                  ? `${syncStats.unsyncedCount} perubahan tersimpan secara lokal dan akan disinkronkan.` 
                  : 'Data lokal Anda sinkron dengan Cloud Google Sheets.'}
              </p>
            </div>
          </div>

          {/* Pending sync queue list */}
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Daftar Antrean</h4>
            
            <div className="space-y-2">
              {syncStats.queueItems && syncStats.queueItems.length > 0 ? (
                syncStats.queueItems.map((item, index) => {
                  const resolved = getQueueItemDetails(item, allStudents, allGrades, allAttendance);
                  return (
                    <div 
                      key={`${item.store}-${item.id}-${index}`} 
                      className="bg-slate-900/30 hover:bg-slate-900/50 border border-slate-700/30 rounded-xl p-3 flex justify-between items-center gap-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-indigo-300 capitalize shrink-0">
                            {resolved.targetName}
                          </span>
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                            resolved.actionLabel === 'Hapus' 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {resolved.actionLabel}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate mt-1.5" title={resolved.desc}>{resolved.desc}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Tunda</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 rounded-xl border border-dashed border-slate-700/30 py-10">
                  <CheckIcon size={24} className="text-emerald-400/80 mb-2" />
                  <p className="text-slate-400 text-xs font-semibold">Tidak ada antrean tertunda</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">Semua modifikasi Anda berhasil ter-sync!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts Panel with Glassmorphism */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Statistics (Pie Chart) */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-xl flex flex-col h-[380px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <PieIcon className="text-indigo-400 w-5 h-5" />
            <h3 className="text-md font-semibold text-slate-100">Distribusi Kehadiran Siswa</h3>
          </div>
          
          <div className="flex-1 min-h-0 relative">
            {hasAttendanceData ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {attendanceChartData.map((entry) => (
                      <Cell 
                        key={`cell-${entry.name}`} 
                        fill={ATTENDANCE_COLORS[entry.name as keyof typeof ATTENDANCE_COLORS] || '#6366f1'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '8px', 
                      borderColor: 'rgba(51, 65, 85, 0.5)',
                      color: '#f8fafc'
                    }} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-slate-300 text-xs font-medium">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 rounded-xl border border-dashed border-slate-700/50">
                <CheckSquare size={36} className="text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm font-medium">Belum ada data absensi</p>
                <p className="text-slate-500 text-xs mt-1">Silakan tambahkan data absensi untuk menampilkan statistik visual.</p>
              </div>
            )}
          </div>
        </div>

        {/* Grades Statistics (Bar Chart) */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-md shadow-xl flex flex-col h-[380px]">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <BarChart2 className="text-emerald-400 w-5 h-5" />
            <h3 className="text-md font-semibold text-slate-100">Rata-rata Nilai per Mata Pelajaran</h3>
          </div>
          
          <div className="flex-1 min-h-0 relative">
            {hasSubjectData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(51, 65, 85, 0.2)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    domain={[0, 100]} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                      borderRadius: '8px', 
                      borderColor: 'rgba(51, 65, 85, 0.5)',
                      color: '#f8fafc'
                    }} 
                  />
                  <Bar 
                    dataKey="Rata-rata" 
                    fill="#6366f1" 
                    radius={[6, 6, 0, 0]}
                  >
                    {subjectChartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? '#6366f1' : '#10b981'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-slate-900/10 rounded-xl border border-dashed border-slate-700/50">
                <BarChart2 size={36} className="text-slate-500 mb-2" />
                <p className="text-slate-400 text-sm font-medium">Belum ada data nilai</p>
                <p className="text-slate-500 text-xs mt-1">Silakan tambahkan data nilai mata pelajaran untuk melihat perbandingan statistik.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
