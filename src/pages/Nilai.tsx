import React, { useState, useEffect, useMemo } from 'react';
import { store, Student, Grade, Settings, pauseNotifications, resumeNotifications } from '../lib/store';
import { v4 as uuidv4 } from 'uuid';
import { Download, Plus, Save } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

export default function Nilai({ semester, role, settings }: { semester: string, role: 'guru' | 'kepsek', settings: Settings | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [activeTab, setActiveTab] = useState<'Harian' | 'Tugas' | 'Ujian' | 'Akhir' | 'Rekap'>('Harian');
  const [filterClass, setFilterClass] = useState('');
  const [filterMapel, setFilterMapel] = useState(settings?.mata_pelajaran?.[0] || '');
  const [filterMapels, setFilterMapels] = useState<string[]>(settings?.mata_pelajaran || []);
  const [isMapelDropdownOpen, setIsMapelDropdownOpen] = useState(false);
  const [filterWaktu, setFilterWaktu] = useState<'Mingguan' | 'Bulanan' | 'Semester' | 'Tahunan' | 'Seluruh' | 'Kustom'>('Semester');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [localGrades, setLocalGrades] = useState<Record<string, string>>({});
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (settings?.mata_pelajaran && settings.mata_pelajaran.length > 0) {
      if (!filterMapel) {
        setFilterMapel(settings.mata_pelajaran[0]);
      }
      if (filterMapels.length === 0) {
        setFilterMapels(settings.mata_pelajaran);
      }
    }
  }, [settings]);

  useEffect(() => {
    loadData();
  }, [semester, filterMapel, filterMapels, activeTab]);

  const loadData = async () => {
    const sList: Student[] = [];
    await store.students.iterate<Student, void>((v) => {
      if (!v.semester || v.semester === semester) {
        sList.push(v);
      }
    });
    setStudents(sList.sort((a, b) => a.no - b.no));

    const gList: Grade[] = [];
    const localVals: Record<string, string> = {};
    await store.grades.iterate<Grade, void>((v) => {
      if (v.semester === semester) {
        let isMatch = false;
        if (activeTab === 'Rekap' || activeTab === 'Akhir') {
          isMatch = filterMapels.includes(v.mata_pelajaran || '');
        } else {
          isMatch = v.mata_pelajaran === filterMapel;
        }
        
        if (isMatch) {
          gList.push(v);
          localVals[`${v.id_siswa}::${v.nama_kolom}::${v.jenis_nilai}`] = v.nilai.toString();
        }
      }
    });
    setGrades(gList);
    setLocalGrades(localVals);
  };

  const getCityFromAlamat = (alamat?: string) => {
    if (!alamat || alamat.trim() === 'Alamat Sekolah Belum Diatur' || alamat.trim() === '') return 'Jakarta';
    const cleanAlamat = alamat.replace(/[\r\n]+/g, ' ').trim();
    const parts = cleanAlamat.split(',').map(p => p.trim()).filter(Boolean);
    for (const part of parts) {
      const pLower = part.toLowerCase();
      if (pLower.startsWith('kota ')) return part.substring(5).trim();
      if (pLower.startsWith('kabupaten ')) return part.substring(10).trim();
      if (pLower.startsWith('kab. ')) return part.substring(5).trim();
    }
    const filteredParts = parts.filter(p => !/^\d+$/.test(p));
    if (filteredParts.length > 0) {
      const provinces = [
        'aceh', 'sumatera', 'sumatra', 'riau', 'jambi', 'bengkulu', 'lampung', 'bangka', 'kepulauan',
        'jakarta', 'banten', 'jawa', 'yogyakarta', 'bali', 'nusa', 'kalimantan', 'sulawesi', 'gorontalo',
        'maluku', 'papua'
      ];
      const lastPart = filteredParts[filteredParts.length - 1];
      const lastLower = lastPart.toLowerCase();
      const hasProvince = provinces.some(prov => lastLower.includes(prov));
      if (hasProvince && filteredParts.length > 1) {
        return filteredParts[filteredParts.length - 2];
      }
      if (lastPart.length < 25) {
        return lastPart;
      }
      const secondLast = filteredParts[filteredParts.length - 2];
      if (secondLast && secondLast.length < 25) {
        return secondLast;
      }
    }
    const words = cleanAlamat.split(/\s+/);
    if (words.length > 0) {
      const lastWord = words[words.length - 1];
      if (!/^\d+$/.test(lastWord) && lastWord.length < 20) {
        return lastWord;
      }
    }
    return 'Jakarta';
  };

  const filteredStudents = students.filter(s => filterClass 
    ? s.kelas === filterClass 
    : (!s.kelas || s.kelas.toLowerCase() !== 'alumni'));
  const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).filter(Boolean);

  const columns = useMemo(() => {
    const cols = new Set<string>();
    grades.forEach(g => {
      if (g.jenis_nilai === activeTab) cols.add(g.nama_kolom);
    });
    return Array.from(cols).sort();
  }, [grades, activeTab]);

  const finalGrades = useMemo(() => {
    const studentGrades = filteredStudents.map(student => {
      let sGrades = grades.filter(g => g.id_siswa === student.id);
      
      let start: Date | null = null;
      let end: Date | null = null;
      const today = new Date();
      
      if (filterWaktu === 'Mingguan') {
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        start = new Date(today.setDate(diff));
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
      } else if (filterWaktu === 'Bulanan') {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (filterWaktu === 'Tahunan') {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      } else if (filterWaktu === 'Kustom' && customStartDate && customEndDate) {
        start = new Date(customStartDate);
        end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
      }
      
      if (start && end) {
        const s = start;
        const e = end;
        sGrades = sGrades.filter(g => {
          if (!g.tanggal) return false;
          const d = new Date(g.tanggal);
          return d >= s && d <= e;
        });
      }

      const calcAvg = (type: string) => {
        const tg = sGrades.filter(g => g.jenis_nilai === type);
        if (tg.length === 0) return 0;
        return tg.reduce((acc, curr) => acc + curr.nilai, 0) / tg.length;
      };

      const avgHarian = calcAvg('Harian');
      const avgTugas = calcAvg('Tugas');
      const avgUjian = calcAvg('Ujian');

      const bh = (settings?.bobot_harian || 30) / 100;
      const bt = (settings?.bobot_tugas || 30) / 100;
      const bu = (settings?.bobot_ujian || 40) / 100;

      const final = (avgHarian * bh) + (avgTugas * bt) + (avgUjian * bu);

      let predikat = 'D';
      if (final >= 90) predikat = 'A';
      else if (final >= 80) predikat = 'B';
      else if (final >= 70) predikat = 'C';

      return {
        ...student,
        avgHarian,
        avgTugas,
        avgUjian,
        final,
        predikat
      };
    });
    return studentGrades;
  }, [grades, students, settings, filteredStudents, filterWaktu, customStartDate, customEndDate]);

  const addColumn = async () => {
    if (!filterMapel) {
      toast.error('Pilih mata pelajaran terlebih dahulu', { duration: 3000 });
      return;
    }
    setIsAddingColumn(true);
    setNewColumnName('');
  };

  const handleConfirmAddColumn = async () => {
    if (newColumnName && !columns.includes(newColumnName)) {
      setIsSaving(true);
      pauseNotifications();
      try {
        const today = new Date().toISOString().split('T')[0];
        for (const s of students) {
          const grade: Grade = {
            id: uuidv4(),
            id_siswa: s.id,
            jenis_nilai: activeTab as any,
            nama_kolom: newColumnName,
            nilai: 0,
            semester,
            mata_pelajaran: filterMapel,
            tanggal: today
          };
          await store.grades.setItem(grade.id, grade);
        }
        toast.success(`Kolom ${newColumnName} ditambahkan`, { duration: 3000 });
        setIsAddingColumn(false);
        loadData();
      } catch (err) {
        console.error(err);
        toast.error('Gagal menambahkan kolom');
      } finally {
        setIsSaving(false);
        resumeNotifications(true);
      }
    }
  };

  const handleLocalChange = (studentId: string, colName: string, value: string) => {
    setLocalGrades(prev => ({
      ...prev,
      [`${studentId}::${colName}::${activeTab}`]: value
    }));
  };

  const saveAllGrades = async () => {
    setIsSaving(true);
    pauseNotifications();
    try {
      let changed = false;
      for (const [key, value] of Object.entries(localGrades)) {
        const parts = key.split('::');
        if (parts.length < 3) continue;
        const studentId = parts[0];
        const colName = parts[1];
        const tab = parts[2];
        
        if (tab !== activeTab) continue;
        
        const studentObj = students.find(s => s.id === studentId);
        if (studentObj && studentObj.kelas === 'Alumni') continue;
        
        let numValue = parseFloat(value as string);
        if (isNaN(numValue)) numValue = 0;
        if (numValue > 100) numValue = 100;
        if (numValue < 0) numValue = 0;

        const existing = grades.find(g => g.id_siswa === studentId && g.nama_kolom === colName && g.jenis_nilai === tab);
        
        if (existing) {
          if (existing.nilai !== numValue) {
            existing.nilai = numValue;
            await store.grades.setItem(existing.id, existing);
            changed = true;
          }
        } else {
          const newGrade: Grade = {
            id: uuidv4(),
            id_siswa: studentId,
            jenis_nilai: tab as any,
            nama_kolom: colName,
            nilai: numValue,
            semester,
            mata_pelajaran: filterMapel,
            tanggal: new Date().toISOString().split('T')[0]
          };
          await store.grades.setItem(newGrade.id, newGrade);
          changed = true;
        }
      }
      
      if (changed) {
        toast.success('Semua nilai berhasil disimpan', { duration: 2000 });
        loadData();
      } else {
        toast.success('Tidak ada perubahan nilai', { duration: 2000 });
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan nilai');
    } finally {
      setIsSaving(false);
      resumeNotifications(true);
    }
  };

  const handleDeleteColumn = (colName: string) => {
    setColumnToDelete(colName);
  };

  const handleConfirmDeleteColumn = async () => {
    if (!columnToDelete) return;
    const gradesToDelete = grades.filter(g => g.nama_kolom === columnToDelete && g.jenis_nilai === activeTab);
    for (const g of gradesToDelete) {
      await store.grades.removeItem(g.id);
    }
    toast.success(`Kolom ${columnToDelete} berhasil dihapus`);
    setColumnToDelete(null);
    loadData();
  };



  const getCols = (type: string) => {
    const cols = new Set<string>();
    grades.forEach(g => {
      if (g.jenis_nilai === type) cols.add(g.nama_kolom);
    });
    return Array.from(cols).sort();
  };

  const getGradeVal = (studentId: string, colName: string, type: string) => {
    const g = grades.find(g => g.id_siswa === studentId && g.nama_kolom === colName && g.jenis_nilai === type);
    return g ? g.nilai : '';
  };

  const exportExcel = () => {
    const harianCols = getCols('Harian');
    const tugasCols = getCols('Tugas');
    const ujianCols = getCols('Ujian');

    const data = finalGrades.map((s, idx) => {
      const row: any = {
        'No': idx + 1,
        'Nama Siswa': s.nama,
        'NISN': s.nisn || '-',
        'NIPD': s.nipd || '-',
        'Mapel': filterMapel || 'Semua Mapel'
      };
      
      harianCols.forEach(col => {
        row[`Harian_${col}`] = getGradeVal(s.id, col, 'Harian');
      });
      tugasCols.forEach(col => {
        row[`Tugas_${col}`] = getGradeVal(s.id, col, 'Tugas');
      });
      ujianCols.forEach(col => {
        row[`Ujian_${col}`] = getGradeVal(s.id, col, 'Ujian');
      });
      
      row['Nilai Akhir'] = s.final.toFixed(2);
      row['Predikat'] = s.predikat;
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
    XLSX.writeFile(wb, `Rekap_Nilai_${semester}_${filterClass || 'Semua'}_${filterMapel || 'Semua'}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Kop Surat (School Letterhead)
    const schoolName = settings?.nama_sekolah || 'EduSync Pro';
    const schoolAlamat = settings?.alamat || 'Alamat Sekolah Belum Diatur';
    const schoolNpsn = settings?.npsn || '-';
    const schoolEmail = settings?.email || '-';

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(schoolName.toUpperCase(), 14, 15);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Alamat: ${schoolAlamat}`, 14, 20);
    doc.text(`NPSN: ${schoolNpsn} | Email: ${schoolEmail}`, 14, 24);
    
    // Draw double lines separator
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(1);
    doc.line(14, 27, 196, 27);
    doc.setLineWidth(0.5);
    doc.line(14, 28, 196, 28);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    
    let titleStr = `REKAP NILAI SISWA - SEMESTER ${semester.toUpperCase()}`;
    if (activeTab === 'Akhir') {
      titleStr = `LAPORAN NILAI AKHIR - SEMESTER ${semester.toUpperCase()}`;
    }
    doc.text(titleStr, 14, 35);
    
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    
    const mapelText = (activeTab === 'Rekap' || activeTab === 'Akhir') 
      ? `Mapel: ${filterMapels.join(', ')}` 
      : `Mapel: ${filterMapel}`;
    doc.text(`Kelas: ${filterClass || 'Semua Kelas'} | ${mapelText} | Periode: ${filterWaktu}`, 14, 40);

    const harianCols = getCols('Harian');
    const tugasCols = getCols('Tugas');
    const ujianCols = getCols('Ujian');

    let head: string[][] = [];
    let body: any[][] = [];

    if (activeTab === 'Akhir') {
      head = [['No', 'Nama Siswa', 'NISN', `Harian (${settings?.bobot_harian}%)`, `Tugas (${settings?.bobot_tugas}%)`, `Ujian (${settings?.bobot_ujian}%)`, 'Nilai Akhir', 'Predikat']];
      body = finalGrades.map((s, idx) => [
        idx + 1,
        s.nama,
        s.nisn || '-',
        s.avgHarian.toFixed(1),
        s.avgTugas.toFixed(1),
        s.avgUjian.toFixed(1),
        s.final.toFixed(1),
        s.predikat
      ]);
    } else if (activeTab === 'Rekap') {
      head = [['No', 'Nama Siswa', 'NISN', ...harianCols.map(c => `${c} (H)`), ...tugasCols.map(c => `${c} (T)`), ...ujianCols.map(c => `${c} (U)`), 'Nilai Akhir', 'Predikat']];
      body = finalGrades.map((s, idx) => {
        const row: any[] = [
          idx + 1,
          s.nama,
          s.nisn || '-'
        ];
        harianCols.forEach(col => row.push(getGradeVal(s.id, col, 'Harian')));
        tugasCols.forEach(col => row.push(getGradeVal(s.id, col, 'Tugas')));
        ujianCols.forEach(col => row.push(getGradeVal(s.id, col, 'Ujian')));
        row.push(s.final.toFixed(1));
        row.push(s.predikat);
        return row;
      });
    } else {
      head = [['No', 'Nama Siswa', 'NISN', ...columns, 'Rata-rata']];
      body = filteredStudents.map((student, idx) => {
        const row: any[] = [
          idx + 1,
          student.nama,
          student.nisn || '-'
        ];
        let sum = 0, count = 0;
        columns.forEach(col => {
          const valStr = localGrades[`${student.id}::${col}::${activeTab}`] || '';
          const val = parseFloat(valStr);
          row.push(valStr !== '' ? valStr : '-');
          if (!isNaN(val)) {
            sum += val;
            count++;
          }
        });
        const avg = count > 0 ? (sum / count).toFixed(1) : '-';
        row.push(avg);
        return row;
      });
    }

    autoTable(doc, {
      head: head,
      body: body,
      startY: 44,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { top: 44 }
    });
    
    const finalY = (doc as any).lastAutoTable.finalY || 44;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const pageHeight = doc.internal.pageSize.height;
    let sigY = finalY + 15;
    if (sigY + 40 > pageHeight) {
      doc.addPage();
      sigY = 20;
    }

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    const city = getCityFromAlamat(settings?.alamat);

    doc.text('Mengetahui,', 14, sigY);
    doc.text('Kepala Sekolah', 14, sigY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.nama_kepala_sekolah || '.........................', 14, sigY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings?.nip_kepala_sekolah || '.........................'}`, 14, sigY + 35);

    doc.text(`${city}, ${today}`, 140, sigY);
    doc.text('Guru Kelas', 140, sigY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(settings?.nama_wali_kelas || '.........................', 140, sigY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`NIP. ${settings?.nip_wali_kelas || '.........................'}`, 140, sigY + 35);

    doc.save(`Rekap_Nilai_${semester}_${filterClass || 'Semua'}_${activeTab}.pdf`);
  };

  return (
    <div className="flex flex-col h-full text-slate-200">
      <div className="p-4 border-b border-slate-700/50 flex flex-wrap justify-between items-center bg-slate-900/40 gap-4">
        <div className="flex bg-slate-800 rounded-xl border border-slate-700 p-1">
          {(['Harian', 'Tugas', 'Ujian', 'Akhir', 'Rekap'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab as any)}
              className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-indigo-500/20 text-indigo-300 shadow-[inset_0_1px_0_0_rgba(99,102,241,0.2)]' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}`}
            >
              {tab === 'Rekap' ? 'Rekap Nilai' : tab === 'Akhir' ? 'Nilai Akhir' : `Nilai ${tab}`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {(activeTab === 'Rekap' || activeTab === 'Akhir') && (
            <div className="flex items-center gap-2">
              <select 
                value={filterWaktu}
                onChange={e => setFilterWaktu(e.target.value as any)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all cursor-pointer"
              >
                <option value="Mingguan">Minggu Ini</option>
                <option value="Bulanan">Bulan Ini</option>
                <option value="Semester">Satu Semester</option>
                <option value="Tahunan">Tahun Ini</option>
                <option value="Seluruh">Seluruh Waktu</option>
                <option value="Kustom">Kustom Rentang Waktu</option>
              </select>
              {filterWaktu === 'Kustom' && (
                <div className="flex items-center gap-2">
                  <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 [color-scheme:dark] transition-all" />
                  <span className="text-slate-500">-</span>
                  <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 [color-scheme:dark] transition-all" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'Rekap' || activeTab === 'Akhir' ? (
            <div className="relative">
              <button 
                onClick={() => setIsMapelDropdownOpen(!isMapelDropdownOpen)}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all cursor-pointer flex items-center gap-2"
              >
                <span>Mata Pelajaran ({filterMapels.length})</span>
                <svg className={`w-4 h-4 text-slate-400 transition-transform ${isMapelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {isMapelDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsMapelDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-64 bg-slate-800/95 border border-slate-700 rounded-2xl p-4 shadow-2xl backdrop-blur-xl z-30 max-h-64 overflow-y-auto custom-scrollbar space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-700">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pilih Mapel</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setFilterMapels(settings?.mata_pelajaran || [])}
                          className="text-[10px] text-indigo-400 font-bold hover:underline"
                        >
                          Semua
                        </button>
                        <span className="text-slate-600">|</span>
                        <button 
                          onClick={() => setFilterMapels([])}
                          className="text-[10px] text-rose-400 font-bold hover:underline"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>
                    {settings?.mata_pelajaran?.map(m => {
                      const isChecked = filterMapels.includes(m);
                      return (
                        <label key={m} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-700/50 cursor-pointer text-sm text-slate-200 transition-colors">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setFilterMapels(filterMapels.filter(x => x !== m));
                              } else {
                                setFilterMapels([...filterMapels, m]);
                              }
                            }}
                            className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                          />
                          <span>{m}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          ) : (
            <select 
              value={filterMapel}
              onChange={e => setFilterMapel(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all cursor-pointer"
            >
              <option value="" disabled>Pilih Mata Pelajaran</option>
              {settings?.mata_pelajaran?.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          )}

          <select 
            value={filterClass}
            onChange={e => setFilterClass(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all cursor-pointer"
          >
            <option value="">Semua Kelas</option>
            {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex gap-3">
          {activeTab !== 'Rekap' && activeTab !== 'Akhir' && role === 'guru' && (
            <>
              <button onClick={saveAllGrades} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20 font-medium transition-colors">
                <Save size={16} /> {isSaving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={addColumn} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-indigo-500/20 font-medium transition-colors">
                <Plus size={16} /> Kolom Baru
              </button>
            </>
          )}
          <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-emerald-500/20 font-medium transition-colors">
            <Download size={16} /> Excel
          </button>
          <button onClick={exportPDF} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-rose-500/20 font-medium transition-colors">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase bg-slate-800/80 sticky top-0 z-10 backdrop-blur-sm text-slate-400">
            <tr>
              <th className="px-6 py-4 border-b border-slate-700/50 w-16 font-medium">No</th>
              <th className="px-6 py-4 border-b border-r border-slate-700/50 sticky left-0 bg-slate-800/90 backdrop-blur-md shadow-[1px_0_0_0_rgba(51,65,85,0.5)] font-medium z-20">Nama Siswa</th>
              
              {activeTab === 'Akhir' ? (
                <>
                  <th className="px-6 py-4 border-b border-slate-700/50 text-center font-medium">Rata Harian ({settings?.bobot_harian}%)</th>
                  <th className="px-6 py-4 border-b border-slate-700/50 text-center font-medium">Rata Tugas ({settings?.bobot_tugas}%)</th>
                  <th className="px-6 py-4 border-b border-slate-700/50 text-center font-medium">Rata Ujian ({settings?.bobot_ujian}%)</th>
                  <th className="px-6 py-4 border-b border-slate-700/50 text-center font-bold text-indigo-400">NILAI AKHIR</th>
                  <th className="px-6 py-4 border-b border-slate-700/50 text-center font-bold text-indigo-400">PREDIKAT</th>
                </>
              ) : activeTab === 'Rekap' ? (
                <>
                  {getCols('Harian').map(col => <th key={`h_${col}`} className="px-6 py-4 border-b border-slate-700/50 text-center font-medium">{col} (H)</th>)}
                  {getCols('Tugas').map(col => <th key={`t_${col}`} className="px-6 py-4 border-b border-slate-700/50 text-center font-medium">{col} (T)</th>)}
                  {getCols('Ujian').map(col => <th key={`u_${col}`} className="px-6 py-4 border-b border-slate-700/50 text-center font-medium">{col} (U)</th>)}
                  <th className="px-6 py-4 border-b border-slate-700/50 text-center font-bold text-indigo-400">NILAI AKHIR</th>
                  <th className="px-6 py-4 border-b border-slate-700/50 text-center font-bold text-indigo-400">PREDIKAT</th>
                </>
              ) : (
                columns.map(col => (
                  <th key={col} className="px-6 py-4 border-b border-slate-700/50 text-center min-w-[120px] font-medium group relative">
                    {col}
                    {role === 'guru' && (
                      <button 
                        onClick={() => handleDeleteColumn(col)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Hapus Kolom"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </th>
                ))
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredStudents.length === 0 ? (
              <tr><td colSpan={10} className="px-6 py-12 text-center text-slate-500">Belum ada data siswa.</td></tr>
            ) : (
              filteredStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 text-slate-400">{index + 1}</td>
                  <td className="px-6 py-4 border-r border-slate-700/50 font-medium text-slate-200 sticky left-0 bg-slate-800/40 backdrop-blur-md shadow-[1px_0_0_0_rgba(51,65,85,0.5)] z-10 group-hover:bg-slate-700/50">
                    {student.nama}
                  </td>
                  
                  {activeTab === 'Akhir' ? (
                    <>
                      {(() => {
                        const fg = finalGrades.find(f => f.id === student.id);
                        if (!fg) return null;
                        const isRemedial = fg.final < 75;
                        return (
                          <>
                            <td className="px-6 py-4 text-center text-slate-300 font-mono">{fg.avgHarian.toFixed(1)}</td>
                            <td className="px-6 py-4 text-center text-slate-300 font-mono">{fg.avgTugas.toFixed(1)}</td>
                            <td className="px-6 py-4 text-center text-slate-300 font-mono">{fg.avgUjian.toFixed(1)}</td>
                            <td className={`px-6 py-4 text-center font-bold font-mono ${isRemedial ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                              {fg.final.toFixed(1)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${isRemedial ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                {fg.predikat}
                              </span>
                            </td>
                          </>
                        )
                      })()}
                    </>
                  ) : activeTab === 'Rekap' ? (
                    <>
                      {(() => {
                        const fg = finalGrades.find(f => f.id === student.id);
                        if (!fg) return null;
                        const isRemedial = fg.final < 75;
                        return (
                          <>
                            {getCols('Harian').map(col => <td className="px-6 py-4 text-center text-slate-300 font-mono" key={`h_${col}`}>{getGradeVal(student.id, col, 'Harian')}</td>)}
                            {getCols('Tugas').map(col => <td className="px-6 py-4 text-center text-slate-300 font-mono" key={`t_${col}`}>{getGradeVal(student.id, col, 'Tugas')}</td>)}
                            {getCols('Ujian').map(col => <td className="px-6 py-4 text-center text-slate-300 font-mono" key={`u_${col}`}>{getGradeVal(student.id, col, 'Ujian')}</td>)}
                            <td className={`px-6 py-4 text-center font-bold font-mono ${isRemedial ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                              {fg.final.toFixed(1)}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${isRemedial ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                                {fg.predikat}
                              </span>
                            </td>
                          </>
                        )
                      })()}
                    </>
                  ) : (
                    columns.length === 0 ? (
                      <td className="px-6 py-4 text-center text-slate-500 italic">Belum ada kolom nilai. Silakan klik "Kolom Baru".</td>
                    ) : (
                      columns.map(col => {
                        const key = `${student.id}::${col}::${activeTab}`;
                        const val = localGrades[key] !== undefined ? localGrades[key] : '';
                        return (
                          <td key={col} className="px-4 py-2">
                            <input 
                              type="number" 
                              min="0"
                              max="100"
                              disabled={role === 'kepsek' || student.kelas === 'Alumni'}
                              className="w-full text-center px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                              value={val}
                              onChange={(e) => {
                                if (student.kelas === 'Alumni') return;
                                let v = parseFloat(e.target.value);
                                if (v > 100) v = 100;
                                if (v < 0) v = 0;
                                handleLocalChange(student.id, col, isNaN(v) ? '' : v.toString());
                              }}
                            />
                          </td>
                        )
                      })
                    )
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add Column */}
      {isAddingColumn && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Tambah Kolom Baru</h3>
            <p className="text-sm text-slate-400 mb-4">Masukkan nama kolom untuk nilai {activeTab}:</p>
            <input 
              type="text"
              autoFocus
              value={newColumnName}
              onChange={e => setNewColumnName(e.target.value)}
              placeholder="Contoh: UH 1, Tugas 2"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all mb-6"
            />
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setIsAddingColumn(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmAddColumn}
                disabled={!newColumnName}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-500/20 transition-colors disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Column */}
      {columnToDelete && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-medium text-slate-200 mb-4">Hapus Kolom Nilai</h3>
            <p className="text-sm text-slate-300 mb-4">
              Apakah Anda yakin ingin menghapus kolom <span className="font-bold text-rose-400">{columnToDelete}</span>? 
              Semua nilai dalam kolom ini akan hilang secara permanen.
            </p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setColumnToDelete(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmDeleteColumn}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-rose-500/20 transition-colors"
              >
                Hapus Kolom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
