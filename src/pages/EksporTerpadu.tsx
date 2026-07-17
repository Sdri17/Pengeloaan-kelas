import React, { useState, useEffect } from 'react';
import { store, Student, Grade, Attendance, Settings } from '../lib/store';
import { Download, FileText, CheckSquare, Users, FileSpreadsheet, Calendar, BookOpen, Layers } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';

export default function EksporTerpadu({ settings }: { settings: Settings | null }) {
  const [exportType, setExportType] = useState<'siswa' | 'nilai' | 'absensi' | 'gabungan'>('siswa');
  
  // Filters
  const [selectedSemester, setSelectedSemester] = useState(settings?.semester_aktif || 'Ganjil 2026');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  
  // Data lists
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [semestersList, setSemestersList] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
      if (settings.semester_aktif) setSelectedSemester(settings.semester_aktif);
      if (settings.daftar_semester) setSemestersList(settings.daftar_semester);
    }
    loadAllData();
  }, [settings]);

  const loadAllData = async () => {
    try {
      const sList: Student[] = [];
      await store.students.iterate<Student, void>((v) => { sList.push(v); });
      setStudents(sList.sort((a, b) => a.no - b.no));

      const uClasses = Array.from(new Set(sList.map(s => s.kelas))).filter(Boolean);
      setClasses(uClasses);

      const gList: Grade[] = [];
      await store.grades.iterate<Grade, void>((v) => { gList.push(v); });
      setGrades(gList);

      const aList: Attendance[] = [];
      await store.attendance.iterate<Attendance, void>((v) => { aList.push(v); });
      setAttendance(aList);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat data referensi');
    }
  };

  // Filter helpers
  const getFilteredStudents = () => {
    return students.filter(s => {
      const matchClass = selectedClass ? s.kelas === selectedClass : true;
      const matchSemester = !s.semester || s.semester === selectedSemester;
      return matchClass && matchSemester;
    });
  };

  const getFilteredGrades = (studentIds: string[]) => {
    return grades.filter(g => {
      const matchStudent = studentIds.includes(g.id_siswa);
      const matchSemester = g.semester === selectedSemester;
      const matchMapel = selectedMapel ? g.mata_pelajaran === selectedMapel : true;
      return matchStudent && matchSemester && matchMapel;
    });
  };

  const getFilteredAttendance = (studentIds: string[]) => {
    return attendance.filter(a => {
      const matchStudent = studentIds.includes(a.id_siswa);
      const matchSemester = a.semester === selectedSemester;
      const matchMapel = selectedMapel ? a.mata_pelajaran === selectedMapel : true;
      
      let matchDate = true;
      if (startDate && endDate) {
        const itemDate = parseISO(a.tanggal);
        matchDate = isWithinInterval(itemDate, {
          start: parseISO(startDate),
          end: parseISO(endDate)
        });
      }
      return matchStudent && matchSemester && matchMapel && matchDate;
    });
  };

  // Export functions
  const handleExportExcel = () => {
    const sFiltered = getFilteredStudents();
    const sIds = sFiltered.map(s => s.id);

    try {
      const wb = XLSX.utils.book_new();

      if (exportType === 'siswa' || exportType === 'gabungan') {
        const studentRows = sFiltered.map((s, idx) => ({
          'No Urut': s.no || idx + 1,
          'Nama Siswa': s.nama,
          'NISN': s.nisn,
          'NIPD': s.nipd,
          'Tempat Lahir': s.tempat_lahir,
          'Tanggal Lahir': s.tanggal_lahir,
          'Kelas': s.kelas,
          'Nama Ayah': s.nama_ayah,
          'Nama Ibu': s.nama_ibu,
          'No Telp Ortu': s.no_telp_ortu
        }));
        const wsSiswa = XLSX.utils.json_to_sheet(studentRows);
        XLSX.utils.book_append_sheet(wb, wsSiswa, "Daftar Siswa");
      }

      if (exportType === 'nilai' || exportType === 'gabungan') {
        const gFiltered = getFilteredGrades(sIds);
        
        const mapels = Array.from(new Set(gFiltered.map(g => g.mata_pelajaran || 'Umum'))).sort();
        
        let gradeRows: any[] = [];
        let index = 1;
        
        const bh = (settings?.bobot_harian || 30) / 100;
        const bt = (settings?.bobot_tugas || 30) / 100;
        const bu = (settings?.bobot_ujian || 40) / 100;

        mapels.forEach(mapel => {
          const gMapel = gFiltered.filter(g => (g.mata_pelajaran || 'Umum') === mapel);
          
          const harianCols = Array.from(new Set(gMapel.filter(g => g.jenis_nilai === 'Harian').map(g => g.nama_kolom))).sort();
          const tugasCols = Array.from(new Set(gMapel.filter(g => g.jenis_nilai === 'Tugas').map(g => g.nama_kolom))).sort();
          const ujianCols = Array.from(new Set(gMapel.filter(g => g.jenis_nilai === 'Ujian').map(g => g.nama_kolom))).sort();
          
          sFiltered.forEach(student => {
             const sg = gMapel.filter(g => g.id_siswa === student.id);
             if (sg.length === 0) return;
             
             let sumH = 0, countH = 0;
             let sumT = 0, countT = 0;
             let sumU = 0, countU = 0;
             
             const row: any = {
               'No': index++,
               'Nama Siswa': student.nama,
               'NISN': student.nisn || '-',
               'NIPD': student.nipd || '-',
               'Mata Pelajaran': mapel
             };
             
             harianCols.forEach(col => {
               const g = sg.find(g => g.jenis_nilai === 'Harian' && g.nama_kolom === col);
               row[`Harian_${col}`] = g ? g.nilai : '';
               if (g) { sumH += g.nilai; countH++; }
             });
             tugasCols.forEach(col => {
               const g = sg.find(g => g.jenis_nilai === 'Tugas' && g.nama_kolom === col);
               row[`Tugas_${col}`] = g ? g.nilai : '';
               if (g) { sumT += g.nilai; countT++; }
             });
             ujianCols.forEach(col => {
               const g = sg.find(g => g.jenis_nilai === 'Ujian' && g.nama_kolom === col);
               row[`Ujian_${col}`] = g ? g.nilai : '';
               if (g) { sumU += g.nilai; countU++; }
             });
             
             const avgH = countH > 0 ? sumH / countH : 0;
             const avgT = countT > 0 ? sumT / countT : 0;
             const avgU = countU > 0 ? sumU / countU : 0;
             const final = (avgH * bh) + (avgT * bt) + (avgU * bu);
             row['Nilai Akhir'] = sg.length > 0 ? final.toFixed(1) : '-';
             
             gradeRows.push(row);
          });
        });
        
        const wsNilai = XLSX.utils.json_to_sheet(gradeRows);
        XLSX.utils.book_append_sheet(wb, wsNilai, "Penilaian");
      }

      if (exportType === 'absensi' || exportType === 'gabungan') {
        const aFiltered = getFilteredAttendance(sIds);
        const attendanceRows = aFiltered.map(a => {
          const student = students.find(s => s.id === a.id_siswa);
          return {
            'Nama Siswa': student?.nama || 'Tidak Dikenal',
            'Kelas': student?.kelas || '',
            'Mata Pelajaran': a.mata_pelajaran || 'Semua Mapel',
            'Tanggal': a.tanggal,
            'Status': a.status,
            'Semester': a.semester
          };
        });
        const wsAbsen = XLSX.utils.json_to_sheet(attendanceRows);
        XLSX.utils.book_append_sheet(wb, wsAbsen, "Absensi");
      }

      const filename = `Laporan_EduSync_${exportType}_${selectedSemester}_${selectedClass || 'Semua_Kelas'}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success('Excel berhasil dibuat dan diunduh!');
    } catch (e) {
      console.error(e);
      toast.error('Gagal mengekspor Excel');
    }
  };

  const handleExportPDF = () => {
    const sFiltered = getFilteredStudents();
    const sIds = sFiltered.map(s => s.id);
    const doc = new jsPDF();

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
    
    let title = '';
    let tableHead: string[][] = [];
    let tableBody: any[][] = [];

    if (exportType === 'siswa') {
      title = 'LAPORAN DATA PROFIL SISWA';
      tableHead = [['No', 'Nama Siswa', 'NISN', 'Kelas', 'No Telp Ortu', 'Nama Ibu']];
      tableBody = sFiltered.map((s, idx) => [
        s.no || idx + 1,
        s.nama,
        s.nisn || '-',
        s.kelas || '-',
        s.no_telp_ortu || '-',
        s.nama_ibu || '-'
      ]);
    } else if (exportType === 'nilai') {
      title = 'LAPORAN REKAPITULASI NILAI';
      if (selectedMapel) {
        title += ` - ${selectedMapel.toUpperCase()}`;
      }
      
      const gFiltered = getFilteredGrades(sIds);
      const harianCols: string[] = Array.from(new Set<string>(gFiltered.filter(g => g.jenis_nilai === 'Harian').map(g => g.nama_kolom))).sort();
      const tugasCols: string[] = Array.from(new Set<string>(gFiltered.filter(g => g.jenis_nilai === 'Tugas').map(g => g.nama_kolom))).sort();
      const ujianCols: string[] = Array.from(new Set<string>(gFiltered.filter(g => g.jenis_nilai === 'Ujian').map(g => g.nama_kolom))).sort();
      
      tableHead = [['No', 'Nama Siswa', 'NISN', 'NIPD', 'Mapel', ...harianCols, ...tugasCols, ...ujianCols, 'Nilai Akhir']];
      
      const bh = (settings?.bobot_harian || 30) / 100;
      const bt = (settings?.bobot_tugas || 30) / 100;
      const bu = (settings?.bobot_ujian || 40) / 100;
      
      let index = 1;
      const mapels = selectedMapel ? [selectedMapel] : Array.from(new Set(gFiltered.map(g => g.mata_pelajaran || 'Umum'))).sort();
      
      mapels.forEach(mapel => {
        sFiltered.forEach(student => {
           const sg = gFiltered.filter(g => g.id_siswa === student.id && (g.mata_pelajaran || 'Umum') === mapel);
           if (sg.length === 0) return;
           
           let sumH = 0, countH = 0;
           let sumT = 0, countT = 0;
           let sumU = 0, countU = 0;
           
           const row: any[] = [
             index++,
             student.nama,
             student.nisn || '-',
             student.nipd || '-',
             mapel
           ];
           
           harianCols.forEach(col => {
             const g = sg.find(g => g.jenis_nilai === 'Harian' && g.nama_kolom === col);
             row.push(g ? g.nilai : '');
             if (g) { sumH += g.nilai; countH++; }
           });
           tugasCols.forEach(col => {
             const g = sg.find(g => g.jenis_nilai === 'Tugas' && g.nama_kolom === col);
             row.push(g ? g.nilai : '');
             if (g) { sumT += g.nilai; countT++; }
           });
           ujianCols.forEach(col => {
             const g = sg.find(g => g.jenis_nilai === 'Ujian' && g.nama_kolom === col);
             row.push(g ? g.nilai : '');
             if (g) { sumU += g.nilai; countU++; }
           });
           
           const avgH = countH > 0 ? sumH / countH : 0;
           const avgT = countT > 0 ? sumT / countT : 0;
           const avgU = countU > 0 ? sumU / countU : 0;
           const final = (avgH * bh) + (avgT * bt) + (avgU * bu);
           
           row.push(sg.length > 0 ? final.toFixed(1) : '-');
           tableBody.push(row);
        });
      });
    } else if (exportType === 'absensi') {
      title = 'LAPORAN REKAPITULASI KEHADIRAN';
      const aFiltered = getFilteredAttendance(sIds);
      tableHead = [['No', 'Nama Siswa', 'Kelas', 'Mata Pelajaran', 'Tanggal', 'Status Kehadiran']];
      tableBody = aFiltered.map((a, idx) => {
        const student = students.find(s => s.id === a.id_siswa);
        return [
          idx + 1,
          student?.nama || 'Tidak Dikenal',
          student?.kelas || '-',
          a.mata_pelajaran || 'Umum',
          a.tanggal,
          a.status
        ];
      });
    } else {
      title = 'RINGKASAN LAPORAN KELAS TERPADU';
      const aFiltered = getFilteredAttendance(sIds);
      const gFiltered = getFilteredGrades(sIds);
      
      tableHead = [['No', 'Nama Siswa', 'NISN', 'Kelas', 'Sakit', 'Izin', 'Alpa', 'Nilai Rata-rata']];
      tableBody = sFiltered.map((s, idx) => {
        const sAtt = aFiltered.filter(a => a.id_siswa === s.id);
        const sGrades = gFiltered.filter(g => g.id_siswa === s.id);
        const avg = sGrades.length > 0 ? (sGrades.reduce((acc, curr) => acc + curr.nilai, 0) / sGrades.length).toFixed(1) : '-';
        
        return [
          s.no || idx + 1,
          s.nama,
          s.nisn || '-',
          s.kelas || '-',
          sAtt.filter(a => a.status === 'Sakit').length,
          sAtt.filter(a => a.status === 'Izin').length,
          sAtt.filter(a => a.status === 'Alpa').length,
          avg
        ];
      });
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(title, 14, 34);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Semester: ${selectedSemester} | Kelas: ${selectedClass || 'Semua Kelas'} | Dicetak pada: ${new Date().toLocaleDateString('id-ID')}`, 14, 39);

    autoTable(doc, {
      head: tableHead,
      body: tableBody,
      startY: 44,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 8 },
      margin: { top: 44 },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 44;
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Signatures
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

    const filename = `Laporan_EduSync_${exportType}_${selectedSemester}_${selectedClass || 'Semua'}.pdf`;
    doc.save(filename);
    toast.success('PDF berhasil dibuat dan diunduh!');
  };

  return (
    <div className="p-8 text-slate-200 h-full overflow-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Download className="w-7 h-7 text-indigo-400" />
            Ekspor Laporan & Cetak Terpadu
          </h2>
          <p className="text-slate-400 text-sm mt-1">Dapatkan data lengkap siswa, nilai, dan absensi yang siap cetak untuk dokumen wali kelas atau laporan sekolah.</p>
        </div>

        {/* Bento Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={() => setExportType('siswa')}
            className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${exportType === 'siswa' ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'}`}
          >
            <Users className={`w-8 h-8 mb-4 ${exportType === 'siswa' ? 'text-indigo-400' : 'text-slate-500'}`} />
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Data Siswa</h4>
              <p className="text-slate-400 text-[11px] mt-1">Profil lengkap, NISN, wali murid, & info kontak</p>
            </div>
            {exportType === 'siswa' && <div className="absolute right-3 top-3 w-2 h-2 bg-indigo-400 rounded-full"></div>}
          </button>

          <button 
            onClick={() => setExportType('nilai')}
            className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${exportType === 'nilai' ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'}`}
          >
            <FileSpreadsheet className={`w-8 h-8 mb-4 ${exportType === 'nilai' ? 'text-indigo-400' : 'text-slate-500'}`} />
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Laporan Nilai</h4>
              <p className="text-slate-400 text-[11px] mt-1">Harian, tugas, ujian beserta rata-rata akhir</p>
            </div>
            {exportType === 'nilai' && <div className="absolute right-3 top-3 w-2 h-2 bg-indigo-400 rounded-full"></div>}
          </button>

          <button 
            onClick={() => setExportType('absensi')}
            className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${exportType === 'absensi' ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'}`}
          >
            <CheckSquare className={`w-8 h-8 mb-4 ${exportType === 'absensi' ? 'text-indigo-400' : 'text-slate-500'}`} />
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Kehadiran (Absen)</h4>
              <p className="text-slate-400 text-[11px] mt-1">Sakit, izin, alpa, dipilah rentang waktu</p>
            </div>
            {exportType === 'absensi' && <div className="absolute right-3 top-3 w-2 h-2 bg-indigo-400 rounded-full"></div>}
          </button>

          <button 
            onClick={() => setExportType('gabungan')}
            className={`p-5 rounded-2xl border text-left flex flex-col justify-between transition-all relative overflow-hidden group ${exportType === 'gabungan' ? 'bg-indigo-500/20 border-indigo-500/50 shadow-lg' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/80'}`}
          >
            <Layers className={`w-8 h-8 mb-4 ${exportType === 'gabungan' ? 'text-indigo-400' : 'text-slate-500'}`} />
            <div>
              <h4 className="font-semibold text-slate-200 text-sm">Laporan Gabungan</h4>
              <p className="text-slate-400 text-[11px] mt-1">Siswa + Nilai + Absensi terpadu 1 lembar</p>
            </div>
            {exportType === 'gabungan' && <div className="absolute right-3 top-3 w-2 h-2 bg-indigo-400 rounded-full"></div>}
          </button>
        </div>

        {/* Filter Controls Card */}
        <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-6">
          <h3 className="text-base font-semibold text-slate-200 border-b border-slate-700/40 pb-3 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            Konfigurasi Filter Ekspor
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Semester</label>
              <select 
                value={selectedSemester} 
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all"
              >
                {semestersList.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Pilih Kelas</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all"
              >
                <option value="">Semua Kelas</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {(exportType === 'nilai' || exportType === 'absensi') && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Mata Pelajaran</label>
                <select 
                  value={selectedMapel} 
                  onChange={(e) => setSelectedMapel(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all"
                >
                  <option value="">Semua Mapel</option>
                  {settings?.mata_pelajaran?.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            )}
          </div>

          {exportType === 'absensi' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Tanggal Mulai
                </label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Tanggal Akhir
                </label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all [color-scheme:dark]"
                />
              </div>
            </div>
          )}

          {/* Action trigger group */}
          <div className="pt-6 border-t border-slate-700/50 flex flex-wrap gap-4 justify-end">
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <FileSpreadsheet size={18} />
              Unduh File Excel (.xlsx)
            </button>
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium shadow-lg shadow-rose-500/20 transition-all cursor-pointer"
            >
              <FileText size={18} />
              Unduh File PDF (.pdf)
            </button>
          </div>
        </div>

        {/* Live Preview Card */}
        <div className="bg-slate-800/20 p-6 rounded-2xl border border-slate-700/30">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Estimasi Data Ekspor</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
              <span className="block text-2xl font-bold text-slate-200">{getFilteredStudents().length}</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Siswa Terpilih</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
              <span className="block text-2xl font-bold text-slate-200">
                {getFilteredGrades(getFilteredStudents().map(s => s.id)).length}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Data Nilai</span>
            </div>
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-700/30">
              <span className="block text-2xl font-bold text-slate-200">
                {getFilteredAttendance(getFilteredStudents().map(s => s.id)).length}
              </span>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Data Presensi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
