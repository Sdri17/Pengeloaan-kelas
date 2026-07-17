import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { store, Student, Settings } from '../lib/store';
import { v4 as uuidv4 } from 'uuid';
import { Download, Upload, Plus, Edit2, Trash2, Settings as SettingsIcon, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function DataSiswa({ semester, role, settings, setSettings }: { semester: string, role: 'guru' | 'kepsek', settings: Settings | null, setSettings?: (s: Settings | null) => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({});
  
  const [searchName, setSearchName] = useState('');
  const [filterClass, setFilterClass] = useState('');

  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [targetClassName, setTargetClassName] = useState('');
  const [isGraduating, setIsGraduating] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [dbClasses, setDbClasses] = useState<string[]>([]);
  const [selectedTargetClass, setSelectedTargetClass] = useState('');
  const [customTargetClass, setCustomTargetClass] = useState('');
  const [isCustomClass, setIsCustomClass] = useState(false);

  // Dynamic columns state
  const [isManagingColumns, setIsManagingColumns] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');

  useEffect(() => {
    loadStudents();
    cleanDummyData();
    loadDbClasses();
  }, [semester]);

  useEffect(() => {
    if (isPromoting) {
      loadDbClasses();
      setSelectedTargetClass('');
      setCustomTargetClass('');
      setIsCustomClass(false);
      setTargetClassName('');
    }
  }, [isPromoting]);

  const handleAddCustomColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    const colName = newColumnName.trim().toLowerCase();
    if (!colName) return;
    
    const standardProps = ['id', 'no', 'nama', 'nisn', 'nipd', 'tempat_lahir', 'tanggal_lahir', 'kelas', 'nama_ayah', 'nama_ibu', 'no_telp_ortu', 'semester', 'tanggal_lulus', 'tahun_ajaran_lulus'];
    if (standardProps.includes(colName)) {
      toast.error('Nama kolom bertabrakan dengan kolom standar bawaan!');
      return;
    }

    const currentCols = settings?.custom_student_columns || [];
    if (currentCols.includes(colName)) {
      toast.error('Kolom ini sudah ada!');
      return;
    }

    const updatedCols = [...currentCols, colName];
    const updatedSettings = {
      ...(settings || {}),
      custom_student_columns: updatedCols
    } as Settings;

    await store.settings.setItem('app_settings', updatedSettings);
    if (setSettings) {
      setSettings(updatedSettings);
    }
    setNewColumnName('');
    toast.success(`Kolom tambahan "${colName}" berhasil dibuat!`);
  };

  const handleDeleteCustomColumn = async (colName: string) => {
    const currentCols = settings?.custom_student_columns || [];
    const updatedCols = currentCols.filter(c => c !== colName);
    const updatedSettings = {
      ...(settings || {}),
      custom_student_columns: updatedCols
    } as Settings;

    await store.settings.setItem('app_settings', updatedSettings);
    if (setSettings) {
      setSettings(updatedSettings);
    }
    toast.success(`Kolom tambahan "${colName}" telah dihapus!`);
  };

  const loadDbClasses = async () => {
    const list: string[] = [];
    await store.students.iterate<Student, void>((val) => {
      if (val.kelas && !list.includes(val.kelas)) {
        list.push(val.kelas);
      }
    });
    setDbClasses(list.sort());
  };

  const cleanDummyData = async () => {
    const dummyNames = [
      'Budi Santoso', 'Siti Aminah', 'Andi Pratama', 'Rina Wijaya', 
      'Fajar Nugroho', 'Dewi Lestari', 'Eko Saputro', 'Ayu Maharani', 
      'Dedi Kurniawan', 'Sri Rahayu'
    ];
    let deletedCount = 0;
    const idsToDelete: string[] = [];
    await store.students.iterate<Student, void>((val) => {
      if (dummyNames.includes(val.nama)) {
        idsToDelete.push(val.id);
      }
    });
    for (const id of idsToDelete) {
      await store.students.removeItem(id);
      deletedCount++;
    }
    if (deletedCount > 0) {
      toast.success(`Berhasil membersihkan ${deletedCount} data siswa dummy dari sistem!`);
      loadStudents();
    }
  };

  const loadStudents = async () => {
    const list: Student[] = [];
    await store.students.iterate<Student, void>((val) => {
      if (!val.semester || val.semester === semester) {
        list.push(val);
      }
    });
    setStudents(list.sort((a, b) => a.no - b.no));
  };

  const filteredStudents = students.filter(s => {
    const matchName = s.nama.toLowerCase().includes(searchName.toLowerCase());
    const matchClass = filterClass 
      ? s.kelas === filterClass 
      : (!s.kelas || s.kelas.toLowerCase() !== 'alumni');
    return matchName && matchClass;
  });

  const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).filter(Boolean);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing === 'new') {
      const newStudent: Student = {
        ...(formData as Student),
        id: uuidv4(),
        semester: semester
      };
      await store.students.setItem(newStudent.id, newStudent);
      toast.success('Data siswa berhasil ditambahkan', { duration: 3000 });
    } else if (isEditing) {
      const updatedStudent: Student = {
        ...(formData as Student),
        semester: formData.semester || semester
      } as Student;
      await store.students.setItem(isEditing, updatedStudent);
      toast.success('Data siswa berhasil diedit', { duration: 3000 });
    }
    setIsEditing(null);
    setFormData({});
    loadStudents();
  };

  const handleDelete = async (id: string) => {
    await store.students.removeItem(id);
    loadStudents();
    toast.success('Data siswa berhasil dihapus', { duration: 3000 });
    setStudentToDelete(null);
  };

  const handleDeleteSelected = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Silakan pilih siswa yang ingin dihapus terlebih dahulu');
      return;
    }
    
    try {
      for (const id of selectedStudents) {
        await store.students.removeItem(id);
      }
      toast.success(`Berhasil menghapus ${selectedStudents.length} siswa`);
      setSelectedStudents([]);
      loadStudents();
      setIsDeletingSelected(false);
    } catch (e) {
      toast.error('Gagal menghapus siswa terpilih');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await store.students.clear();
      toast.success('Seluruh data siswa berhasil dihapus');
      setSelectedStudents([]);
      loadStudents();
      setIsDeletingAll(false);
    } catch (e) {
      toast.error('Gagal menghapus seluruh data siswa');
    }
  };

  const formatGraduationDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return format(d, 'dd MMMM yyyy', { locale: id });
    } catch (e) {
      return dateStr;
    }
  };

  const exportExcel = () => {
    const customCols = settings?.custom_student_columns || [];
    const dataForExport = filteredStudents.map((s, idx) => {
      const row: any = {
        'No': idx + 1,
        'Nama': s.nama,
        'NISN': s.nisn,
        'NIPD': s.nipd,
        'Kelas': s.kelas,
        'Tempat Lahir': s.tempat_lahir,
        'Tanggal Lahir': s.tanggal_lahir,
        'Nama Ayah': s.nama_ayah,
        'Nama Ibu': s.nama_ibu,
        'No Telp Ortu': s.no_telp_ortu,
      };
      if (filterClass === 'Alumni') {
        row['Tanggal Lulus'] = formatGraduationDate(s.tanggal_lulus);
        row['Tahun Ajaran Lulus'] = s.tahun_ajaran_lulus || '';
      }
      customCols.forEach(col => {
        row[col.replace(/_/g, ' ').toUpperCase()] = s[col] || '';
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataForExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");
    XLSX.writeFile(wb, `Data_Siswa_${semester}_${filterClass || 'Semua'}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text(`Data Siswa - Semester ${semester}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Kelas: ${filterClass || 'Semua Kelas'}`, 14, 22);
    
    const customCols = settings?.custom_student_columns || [];
    const headers = ['No', 'Nama', 'NISN', 'Kelas', 'No Telp'];
    if (filterClass === 'Alumni') {
      headers.push('Tgl Lulus', 'TA Lulus');
    }
    customCols.forEach(col => {
      headers.push(col.replace(/_/g, ' '));
    });

    const body = filteredStudents.map((s, idx) => {
      const row: any[] = [idx + 1, s.nama, s.nisn, s.kelas, s.no_telp_ortu];
      if (filterClass === 'Alumni') {
        row.push(formatGraduationDate(s.tanggal_lulus), s.tahun_ajaran_lulus || '');
      }
      customCols.forEach(col => {
        row.push(s[col] || '-');
      });
      return row;
    });

    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 28
    });
    doc.save(`Data_Siswa_${semester}_${filterClass || 'Semua'}.pdf`);
  };

  const downloadTemplate = () => {
    const template = [{ no: 1, nama: 'Nama Siswa', nisn: '12345', nipd: '123', tempat_lahir: 'Jakarta', tanggal_lahir: '2010-01-01', kelas: '7A', nama_ayah: 'Ayah', nama_ibu: 'Ibu', no_telp_ortu: '0812345' }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);
        
        for (const row of data) {
          const student: Student = {
            id: uuidv4(),
            no: row.no || 0,
            nama: row.nama || '',
            nisn: String(row.nisn || ''),
            nipd: String(row.nipd || ''),
            tempat_lahir: row.tempat_lahir || '',
            tanggal_lahir: row.tanggal_lahir || '',
            kelas: row.kelas || '',
            nama_ayah: row.nama_ayah || '',
            nama_ibu: row.nama_ibu || '',
            no_telp_ortu: String(row.no_telp_ortu || ''),
            semester: semester
          };
          await store.students.setItem(student.id, student);
        }
        loadStudents();
        toast.success('Import data siswa berhasil!');
      };
      reader.readAsBinaryString(file);
    }
  };

  return (
    <div className="flex flex-col h-full text-slate-200">
      <div className="p-4 border-b border-slate-700/50 flex flex-wrap justify-between items-center bg-slate-900/40 gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {role === 'guru' && (
            <>
              <button onClick={() => { setIsEditing('new'); setFormData({ no: students.length + 1 }); }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm shadow-lg shadow-indigo-500/20 font-medium transition-colors">
                <Plus size={16} /> Tambah Siswa
              </button>
              <button onClick={() => setIsManagingColumns(true)} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors">
                <SettingsIcon size={16} /> Kelola Kolom Tambahan
              </button>
              {selectedStudents.length > 0 && (
                <button 
                  onClick={() => setIsDeletingSelected(true)} 
                  className="bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors animate-fade-in"
                  title="Hapus beberapa siswa terpilih"
                >
                  <Trash2 size={16} /> Hapus Terpilih ({selectedStudents.length})
                </button>
              )}
              {students.length > 0 && (
                <button 
                  onClick={() => setIsDeletingAll(true)} 
                  className="bg-rose-600/10 text-rose-500 border border-rose-500/20 hover:bg-rose-600/20 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors"
                  title="Hapus seluruh data siswa di database"
                >
                  <Trash2 size={16} /> Hapus Semua Siswa
                </button>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Cari nama siswa..." 
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all w-48"
          />
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
          {role === 'guru' && (
            <>
              <button onClick={downloadTemplate} className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 text-sm hover:bg-slate-700 text-slate-300 font-medium transition-colors">
                <Download size={16} /> Template
              </button>
              <label className="bg-slate-800 border border-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 text-sm hover:bg-slate-700 cursor-pointer text-slate-300 font-medium transition-colors">
                <Upload size={16} /> Import
                <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleImport} />
              </label>
              <div className="border-l border-slate-700 mx-1"></div>
              <button 
                onClick={() => {
                  const targetStudents = selectedStudents.length > 0 
                    ? filteredStudents.filter(s => selectedStudents.includes(s.id))
                    : filteredStudents;

                  if (targetStudents.length === 0) {
                    toast.error('Tidak ada siswa untuk dinaikkan kelas');
                    return;
                  }
                  setTargetClassName('');
                  setIsPromoting(true);
                }}
                className="bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 px-3 py-2 rounded-xl text-sm hover:bg-indigo-600/30 font-medium transition-colors"
                title="Naikkan kelas untuk siswa terpilih"
              >
                Naik Kelas {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
              </button>
              <button 
                onClick={() => {
                  const targetStudents = selectedStudents.length > 0 
                    ? filteredStudents.filter(s => selectedStudents.includes(s.id))
                    : filteredStudents;

                  if (targetStudents.length === 0) {
                    toast.error('Tidak ada siswa untuk diluluskan');
                    return;
                  }
                  setIsGraduating(true);
                }}
                className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-3 py-2 rounded-xl text-sm hover:bg-emerald-600/30 font-medium transition-colors"
                title="Jadikan Alumni untuk siswa terpilih"
              >
                Luluskan {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''}
              </button>
            </>
          )}
          <button onClick={exportExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium shadow-lg shadow-emerald-500/20 transition-colors">
            <Download size={16} /> Excel
          </button>
          <button onClick={exportPDF} className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium shadow-lg shadow-rose-500/20 transition-colors">
            <Download size={16} /> PDF
          </button>
        </div>
      </div>

      <div className="overflow-auto flex-1 custom-scrollbar">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-400 uppercase bg-slate-800/80 sticky top-0 backdrop-blur-sm z-10">
            <tr>
              {role === 'guru' && (
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                    checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedStudents(filteredStudents.map(s => s.id));
                      } else {
                        setSelectedStudents([]);
                      }
                    }}
                  />
                </th>
              )}
              <th className="px-6 py-4 font-medium">No</th>
              <th className="px-6 py-4 font-medium">Nama</th>
              <th className="px-6 py-4 font-medium">NISN</th>
              <th className="px-6 py-4 font-medium">Kelas</th>
              {filterClass === 'Alumni' && (
                <>
                  <th className="px-6 py-4 font-medium">Tanggal Lulus</th>
                  <th className="px-6 py-4 font-medium">Tahun Ajaran Lulus</th>
                </>
              )}
              <th className="px-6 py-4 font-medium">No Telp Ortu</th>
              {(settings?.custom_student_columns || []).map(col => (
                <th key={col} className="px-6 py-4 font-medium capitalize">{col.replace(/_/g, ' ')}</th>
              ))}
              {role === 'guru' && <th className="px-6 py-4 font-medium text-right">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={(role === 'guru' ? (filterClass === 'Alumni' ? 8 : 6) : (filterClass === 'Alumni' ? 7 : 5)) + (settings?.custom_student_columns || []).length} className="px-6 py-12 text-center text-slate-500">Belum ada data siswa. Silakan tambah atau import data.</td>
              </tr>
            ) : (
              filteredStudents.map((student, index) => (
                <tr key={student.id} className={`transition-colors ${selectedStudents.includes(student.id) ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'hover:bg-slate-700/30'}`}>
                  {role === 'guru' && (
                    <td className="px-6 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 text-slate-400">{index + 1}</td>
                  <td className="px-6 py-4 font-medium text-slate-200">{student.nama}</td>
                  <td className="px-6 py-4 text-slate-400">{student.nisn}</td>
                  <td className="px-6 py-4 text-slate-400">
                    <span className="px-2.5 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs">{student.kelas}</span>
                  </td>
                  {filterClass === 'Alumni' && (
                    <>
                      <td className="px-6 py-4 text-emerald-400 font-medium">
                        {formatGraduationDate(student.tanggal_lulus)}
                      </td>
                      <td className="px-6 py-4 text-indigo-400 font-mono">
                        {student.tahun_ajaran_lulus || '-'}
                      </td>
                    </>
                  )}
                  <td className="px-6 py-4 text-slate-400">{student.no_telp_ortu}</td>
                  {(settings?.custom_student_columns || []).map(col => (
                    <td key={col} className="px-6 py-4 text-slate-300">{student[col] || '-'}</td>
                  ))}
                  {role === 'guru' && (
                    <td className="px-6 py-4 text-right">
                      {student.kelas !== 'Alumni' ? (
                        <>
                          <button onClick={() => { setIsEditing(student.id); setFormData(student); }} className="text-indigo-400 hover:text-indigo-300 p-1.5 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Edit Siswa">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => setStudentToDelete(student.id)} className="text-rose-400 hover:text-rose-300 p-1.5 ml-1 hover:bg-rose-500/10 rounded-lg transition-colors" title="Hapus Siswa">
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex justify-end gap-1 items-center">
                          <span className="text-xs text-slate-500 italic bg-slate-900/50 px-2.5 py-1 rounded-lg border border-slate-700/50">Alumni (Kunci)</span>
                          <button onClick={() => setStudentToDelete(student.id)} className="text-rose-400 hover:text-rose-300 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors" title="Hapus Siswa">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Hapus Siswa */}
      {studentToDelete && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
              <h3 className="font-semibold text-lg text-slate-100">Hapus Data</h3>
              <button onClick={() => setStudentToDelete(null)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            <div className="p-6">
              <p className="text-slate-300 text-sm">Apakah Anda yakin ingin menghapus data siswa ini?</p>
            </div>
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/80 flex justify-end gap-3">
              <button onClick={() => setStudentToDelete(null)} className="px-5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-xl transition-colors">Batal</button>
              <button onClick={() => handleDelete(studentToDelete)} className="px-5 py-2 text-sm font-medium bg-rose-500 text-white rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-colors">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit / Tambah Siswa */}
      {isEditing && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
              <h3 className="font-semibold text-lg text-slate-100">{isEditing === 'new' ? 'Tambah Siswa' : 'Edit Siswa'}</h3>
              <button onClick={() => setIsEditing(null)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <form id="student-form" onSubmit={handleSave} className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">No Urut</label>
                  <input type="number" required value={formData.no ?? ''} onChange={e => setFormData({...formData, no: parseInt(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">NISN</label>
                  <input type="text" value={formData.nisn ?? ''} onChange={e => setFormData({...formData, nisn: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nama Lengkap</label>
                  <input type="text" required value={formData.nama ?? ''} onChange={e => setFormData({...formData, nama: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">NIPD</label>
                  <input type="text" value={formData.nipd ?? ''} onChange={e => setFormData({...formData, nipd: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Kelas</label>
                  <input type="text" required value={formData.kelas ?? ''} onChange={e => setFormData({...formData, kelas: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Tempat Lahir</label>
                  <input type="text" value={formData.tempat_lahir ?? ''} onChange={e => setFormData({...formData, tempat_lahir: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Tanggal Lahir</label>
                  <input type="date" value={formData.tanggal_lahir ?? ''} onChange={e => setFormData({...formData, tanggal_lahir: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all [color-scheme:dark]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nama Ayah</label>
                  <input type="text" value={formData.nama_ayah ?? ''} onChange={e => setFormData({...formData, nama_ayah: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nama Ibu</label>
                  <input type="text" value={formData.nama_ibu ?? ''} onChange={e => setFormData({...formData, nama_ibu: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">No Telepon Ortu</label>
                  <input type="text" value={formData.no_telp_ortu ?? ''} onChange={e => setFormData({...formData, no_telp_ortu: e.target.value})} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" />
                </div>
                {(settings?.custom_student_columns || []).map(col => (
                  <div key={col} className="col-span-2">
                    <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider capitalize">{col.replace(/_/g, ' ')}</label>
                    <input 
                      type="text" 
                      value={formData[col] ?? ''} 
                      onChange={e => setFormData({...formData, [col]: e.target.value})} 
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" 
                    />
                  </div>
                ))}
              </form>
            </div>
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/80 flex justify-end gap-3">
              <button onClick={() => setIsEditing(null)} className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-xl transition-colors">Batal</button>
              <button form="student-form" type="submit" className="px-5 py-2.5 text-sm font-medium bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-colors">Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Naik Kelas Massal / Kolektif */}
      {isPromoting && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
              <h3 className="font-semibold text-lg text-slate-100">Kolektif Naik Kelas</h3>
              <button onClick={() => setIsPromoting(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-300 text-sm">
                Anda akan menaikkan kelas untuk{' '}
                <span className="font-bold text-indigo-400">
                  {selectedStudents.length > 0 
                    ? `${selectedStudents.length} siswa terpilih` 
                    : `${filteredStudents.length} siswa yang sedang ditampilkan`}
                </span>.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Nama Kelas Tujuan</label>
                {dbClasses.length > 0 ? (
                  <div className="space-y-3">
                    <select
                      value={isCustomClass ? 'CUSTOM' : selectedTargetClass}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'CUSTOM') {
                          setIsCustomClass(true);
                          setSelectedTargetClass('CUSTOM');
                          setTargetClassName('');
                        } else {
                          setIsCustomClass(false);
                          setSelectedTargetClass(val);
                          setTargetClassName(val);
                        }
                      }}
                      className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all cursor-pointer"
                    >
                      <option value="" disabled>-- Pilih Kelas Tujuan --</option>
                      {dbClasses.map(c => (
                        <option key={c} value={c}>Kelas {c}</option>
                      ))}
                      <option value="CUSTOM">➕ Buat/Ketik Kelas Baru...</option>
                    </select>

                    {isCustomClass && (
                      <input 
                        type="text" 
                        value={customTargetClass} 
                        onChange={e => {
                          setCustomTargetClass(e.target.value);
                          setTargetClassName(e.target.value);
                        }} 
                        placeholder="Ketik nama kelas baru (misal: 4, 8B, 9A, dll.)" 
                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" 
                        required
                        autoFocus
                      />
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={targetClassName} 
                    onChange={e => setTargetClassName(e.target.value)} 
                    placeholder="Contoh: kelas 4, 8B, 9A, dll." 
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-200 text-sm transition-all" 
                    required
                  />
                )}
              </div>
            </div>
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/80 flex justify-end gap-3">
              <button onClick={() => setIsPromoting(false)} className="px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-xl transition-colors">Batal</button>
              <button 
                onClick={async () => {
                  if (!targetClassName.trim()) {
                    toast.error('Masukkan nama kelas tujuan');
                    return;
                  }
                  const targetStudents = selectedStudents.length > 0 
                    ? filteredStudents.filter(s => selectedStudents.includes(s.id))
                    : filteredStudents;

                  for (const s of targetStudents) {
                    const updated = { ...s, kelas: targetClassName.trim() };
                    await store.students.setItem(updated.id, updated);
                  }
                  loadStudents();
                  setSelectedStudents([]);
                  setIsPromoting(false);
                  toast.success(`Berhasil menaikkan kelas ${targetStudents.length} siswa ke ${targetClassName.trim()}`);
                }}
                className="px-5 py-2.5 text-sm font-medium bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-colors"
              >
                Proses Naik Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Luluskan Massal / Kolektif */}
      {isGraduating && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
              <h3 className="font-semibold text-lg text-slate-100">Kolektif Kelulusan</h3>
              <button onClick={() => setIsGraduating(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            <div className="p-6">
              <p className="text-slate-300 text-sm">
                Apakah Anda yakin ingin meluluskan{' '}
                <span className="font-bold text-emerald-400">
                  {selectedStudents.length > 0 
                    ? `${selectedStudents.length} siswa terpilih` 
                    : `${filteredStudents.length} siswa yang ditampilkan`}
                </span>{' '}
                ke daftar Alumni?
              </p>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Aksi ini akan mengubah status kelas mereka menjadi <span className="font-semibold text-slate-300">"Alumni"</span> dan memindahkannya dari kelas aktif.
              </p>
            </div>
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/80 flex justify-end gap-3">
              <button onClick={() => setIsGraduating(false)} className="px-5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-xl transition-colors">Batal</button>
              <button 
                onClick={async () => {
                  const targetStudents = selectedStudents.length > 0 
                    ? filteredStudents.filter(s => selectedStudents.includes(s.id))
                    : filteredStudents;

                  for (const s of targetStudents) {
                    const updated = { 
                      ...s, 
                      kelas: 'Alumni',
                      tanggal_lulus: new Date().toISOString().split('T')[0],
                      tahun_ajaran_lulus: semester
                    };
                    await store.students.setItem(updated.id, updated);
                  }
                  loadStudents();
                  setSelectedStudents([]);
                  setIsGraduating(false);
                  toast.success(`Berhasil meluluskan ${targetStudents.length} siswa ke Alumni`);
                }}
                className="px-5 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-colors"
              >
                Luluskan Siswa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Beberapa Siswa Terpilih */}
      {isDeletingSelected && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
              <h3 className="font-semibold text-lg text-slate-100">Hapus Siswa Terpilih</h3>
              <button onClick={() => setIsDeletingSelected(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            <div className="p-6">
              <p className="text-slate-300 text-sm">Apakah Anda yakin ingin menghapus <span className="font-bold text-rose-400">{selectedStudents.length} siswa</span> yang terpilih?</p>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">Aksi ini bersifat permanen dan tidak dapat dibatalkan.</p>
            </div>
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/80 flex justify-end gap-3">
              <button onClick={() => setIsDeletingSelected(false)} className="px-5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-xl transition-colors">Batal</button>
              <button onClick={handleDeleteSelected} className="px-5 py-2 text-sm font-medium bg-rose-500 text-white rounded-xl hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-colors">Hapus Terpilih</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus Seluruh Data Siswa */}
      {isDeletingAll && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-sm w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
              <h3 className="font-semibold text-lg text-rose-400">Peringatan Kritis!</h3>
              <button onClick={() => setIsDeletingAll(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            <div className="p-6">
              <p className="text-slate-300 text-sm">Apakah Anda benar-benar yakin ingin menghapus <span className="font-bold text-rose-400">SELURUH DATA SISWA ({students.length} siswa)</span> dari database?</p>
              <p className="text-rose-400/80 text-xs mt-3 leading-relaxed bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 font-medium">
                Peringatan: Seluruh data siswa akan terhapus secara permanen dari sistem. Pastikan Anda telah melakukan ekspor data (Excel/PDF) terlebih dahulu jika diperlukan.
              </p>
            </div>
            <div className="p-5 border-t border-slate-700/50 bg-slate-800/80 flex justify-end gap-3">
              <button onClick={() => setIsDeletingAll(false)} className="px-5 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-xl transition-colors">Batal</button>
              <button onClick={handleDeleteAll} className="px-5 py-2 text-sm font-medium bg-rose-600 text-white rounded-xl hover:bg-rose-500 shadow-lg shadow-rose-500/20 transition-colors">Hapus Semua Data</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kelola Kolom Tambahan */}
      {isManagingColumns && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
              <h3 className="font-semibold text-lg text-slate-100 flex items-center gap-2">
                <SettingsIcon size={18} className="text-indigo-400" />
                Kelola Kolom Tambahan
              </h3>
              <button onClick={() => setIsManagingColumns(false)} className="text-slate-400 hover:text-slate-200 hover:bg-slate-700 p-1.5 rounded-lg transition-colors">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              <form onSubmit={handleAddCustomColumn} className="space-y-3">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Tambah Kolom Baru</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Contoh: hobi, catatan, dll." 
                    value={newColumnName}
                    onChange={e => setNewColumnName(e.target.value)}
                    className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 transition-all"
                    required
                  />
                  <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer">
                    Tambah
                  </button>
                </div>
              </form>

              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Daftar Kolom Aktif</h4>
                <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl divide-y divide-slate-700/50 max-h-48 overflow-y-auto custom-scrollbar">
                  {(settings?.custom_student_columns || []).map(col => (
                    <div key={col} className="flex justify-between items-center p-3 text-sm">
                      <span className="text-slate-300 font-medium capitalize">{col.replace(/_/g, ' ')}</span>
                      <button 
                        type="button" 
                        onClick={() => handleDeleteCustomColumn(col)}
                        className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Kolom"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {(settings?.custom_student_columns || []).length === 0 && (
                    <p className="text-xs text-slate-500 italic p-4 text-center">Belum ada kolom tambahan.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-700/50 bg-slate-800/80 flex justify-end">
              <button onClick={() => setIsManagingColumns(false)} className="px-5 py-2 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl transition-colors cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
