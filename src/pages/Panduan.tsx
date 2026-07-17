import React from 'react';
import { BookOpen, Users, FileSpreadsheet, Settings } from 'lucide-react';

export default function Panduan() {
  return (
    <div className="p-8 text-slate-200 h-full overflow-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Panduan Penggunaan Aplikasi</h2>
          <p className="text-slate-400">Selamat datang di EduSync Pro. Berikut adalah panduan singkat untuk membantu Anda menggunakan aplikasi ini.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-3">
            <h3 className="text-lg font-medium text-indigo-400 flex items-center gap-2">
              <Users size={20} /> Data Siswa
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Modul ini digunakan untuk mengelola data induk siswa.
            </p>
            <ul className="list-disc list-inside text-sm text-slate-400 space-y-1 ml-2">
              <li>Untuk menambahkan siswa baru, isi formulir di sebelah kiri dan klik <strong>Tambah Siswa</strong>.</li>
              <li>Untuk mengedit siswa, klik tombol edit (ikon pensil) pada baris data siswa, ubah data pada formulir, lalu klik <strong>Update Siswa</strong>.</li>
              <li>Data yang ditambahkan akan otomatis tersimpan di penyimpanan lokal perangkat Anda.</li>
            </ul>
          </div>

          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-3">
            <h3 className="text-lg font-medium text-emerald-400 flex items-center gap-2">
              <FileSpreadsheet size={20} /> Nilai
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Modul ini digunakan untuk mencatat dan merekap nilai siswa (Harian, Tugas, Ujian).
            </p>
            <ul className="list-disc list-inside text-sm text-slate-400 space-y-1 ml-2">
              <li>Pastikan Anda telah memilih <strong>Mata Pelajaran</strong>.</li>
              <li>Klik <strong>Kolom Baru</strong> untuk menambah kolom penilaian (Misal: "UH 1").</li>
              <li>Masukkan nilai langsung pada tabel. Nilai akan otomatis tersimpan saat Anda berpindah sel.</li>
              <li>Tab <strong>Nilai Akhir</strong> akan mengkalkulasi rata-rata dan nilai akhir berdasarkan bobot di menu Pengaturan.</li>
              <li>Gunakan tombol <strong>Excel</strong> atau <strong>PDF</strong> untuk mengunduh rekapitulasi.</li>
            </ul>
          </div>

          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-3">
            <h3 className="text-lg font-medium text-rose-400 flex items-center gap-2">
              <BookOpen size={20} /> Absensi
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Gunakan modul ini untuk mencatat kehadiran harian.
            </p>
            <ul className="list-disc list-inside text-sm text-slate-400 space-y-1 ml-2">
              <li>Pada tab <strong>Harian</strong>, pilih tanggal dan mata pelajaran, lalu tandai kehadiran (Hadir, Sakit, Izin, Alpa).</li>
              <li>Klik <strong>Simpan</strong> untuk merekam data kehadiran.</li>
              <li>Pada tab <strong>Rekap</strong>, Anda dapat melihat akumulasi kehadiran berdasarkan filter (Hari Ini, Bulan Ini, Semester, Kustom).</li>
            </ul>
          </div>

          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-3">
            <h3 className="text-lg font-medium text-amber-400 flex items-center gap-2">
              <Settings size={20} /> Identitas Sekolah & Pengaturan
            </h3>
            <ul className="list-disc list-inside text-sm text-slate-400 space-y-1 ml-2">
              <li><strong>Identitas Sekolah:</strong> Lengkapi data sekolah (NPSN, alamat, kepala sekolah) agar tercetak dengan benar pada laporan (PDF/Excel).</li>
              <li><strong>Pengaturan:</strong> Tambahkan mata pelajaran yang diampu, atur bobot persentase nilai akhir, dan (jika Anda admin) buat akun untuk Kepala Sekolah.</li>
            </ul>
          </div>

          <div className="bg-slate-800/40 p-6 rounded-2xl border border-slate-700/50 backdrop-blur-sm space-y-3">
            <h3 className="text-lg font-medium text-cyan-400 flex items-center gap-2">
              <BookOpen size={20} /> Panduan Google Apps Script (Sinkronisasi Database)
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Untuk melakukan sinkronisasi database ke Google Sheet tanpa harus melakukan login OAuth, Anda bisa menggunakan Google Apps Script. Berikut langkah-langkahnya:
            </p>
            <ol className="list-decimal list-inside text-sm text-slate-400 space-y-2 ml-2">
              <li>Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google Sheet Baru</a> dan beri nama bebas.</li>
              <li>Klik menu <strong>Ekstensi &gt; Apps Script</strong>.</li>
              <li>Hapus semua kode di dalam editor yang terbuka, lalu tempelkan (paste) kode di bawah ini.</li>
              <li>Klik logo <strong>Simpan</strong> (ikon disket) atau tekan Ctrl+S.</li>
              <li>Klik tombol <strong>Terapkan (Deploy) &gt; Deployment baru</strong>.</li>
              <li>Pilih jenis deployment: <strong>Aplikasi Web (Web App)</strong>.</li>
              <li>Pada bagian <em>Akses:</em> pilih <strong>Siapa saja (Anyone)</strong>.</li>
              <li>Klik tombol <strong>Terapkan</strong> (Mungkin Anda akan diminta untuk <em>Izinkan Akses</em> / <em>Review Permissions</em>, ikuti saja langkahnya dan abaikan peringatan keamanan dengan klik Advanced &gt; Go to ...).</li>
              <li>Setelah berhasil, Anda akan mendapatkan <strong>URL Aplikasi Web (Web App URL)</strong>. Salin URL tersebut.</li>
              <li>Buka aplikasi ini, masuk ke menu <strong>Pengaturan</strong>, paste URL tersebut pada kolom "URL Web App Google Apps Script", dan klik Simpan.</li>
            </ol>
            
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Kode Google Apps Script:</p>
              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto border border-slate-700 text-xs text-slate-300 font-mono">
                 <pre>{`function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. DELTA SYNC ACTION (Super fast, incremental changes only)
    if (payload.action === 'delta') {
      const changes = payload.changes;
      if (changes && Array.isArray(changes)) {
        changes.forEach(change => {
          const { store: storeName, id, action, data } = change;
          
          if (storeName === 'students') {
            const isAlumni = data && data.kelas && data.kelas.toLowerCase() === 'alumni';
            const activeSheet = ss.getSheetByName('Siswa') || ensureSheet(ss, 'Siswa');
            const alumniSheet = ss.getSheetByName('Alumni') || ensureSheet(ss, 'Alumni');
            
            // Delete from both first to prevent duplicate entries
            const rowInActive = findRowById(activeSheet, id);
            if (rowInActive !== -1) activeSheet.deleteRow(rowInActive);
            
            const rowInAlumni = findRowById(alumniSheet, id);
            if (rowInAlumni !== -1) alumniSheet.deleteRow(rowInAlumni);
            
            if (action === 'update' && data) {
              const targetSheet = isAlumni ? alumniSheet : activeSheet;
              
              // Ensure we have standard headers
              const baseHeaders = ['ID', 'No', 'Nama', 'NISN', 'NIPD', 'Tempat Lahir', 'Tanggal Lahir', 'Kelas', 'Nama Ayah', 'Nama Ibu', 'No Telp Ortu'];
              if (targetSheet.getLastRow() === 0) {
                targetSheet.appendRow(baseHeaders);
              }
              
              const rowValues = [
                data.id || '',
                data.no || '',
                data.nama || '',
                data.nisn || '',
                data.nipd || '',
                data.tempat_lahir || '',
                data.tanggal_lahir || '',
                data.kelas || '',
                data.nama_ayah || '',
                data.nama_ibu || '',
                data.no_telp_ortu || ''
              ];
              
              // Handle custom dynamic columns automatically
              const knownKeys = ['id', 'no', 'nama', 'nisn', 'nipd', 'tempat_lahir', 'tanggal_lahir', 'kelas', 'nama_ayah', 'nama_ibu', 'no_telp_ortu', 'semester', 'tanggal_lulus', 'tahun_ajaran_lulus'];
              Object.keys(data).forEach(key => {
                if (!knownKeys.includes(key) && key.trim() !== '') {
                  const colIdx = ensureHeader(targetSheet, key);
                  rowValues[colIdx - 1] = data[key] || '';
                }
              });
              
              targetSheet.appendRow(rowValues);
            }
          } 
          
          else if (storeName === 'grades') {
            if (action === 'delete') {
              const sheets = ss.getSheets();
              sheets.forEach(sheet => {
                if (sheet.getName().indexOf('Nilai - ') === 0) {
                  const rowIdx = findRowById(sheet, id);
                  if (rowIdx !== -1) sheet.deleteRow(rowIdx);
                }
              });
            } else if (action === 'update' && data) {
              const mapel = data.mata_pelajaran || 'Umum';
              const sheetName = 'Nilai - ' + mapel;
              const sheet = ss.getSheetByName(sheetName) || ensureSheet(ss, sheetName);
              
              if (sheet.getLastRow() === 0) {
                sheet.appendRow(['ID', 'ID Siswa', 'Jenis Nilai', 'Nama Kolom', 'Nilai', 'Semester', 'Mata Pelajaran']);
              }
              
              const rowIdx = findRowById(sheet, id);
              const rowValues = [
                data.id || '',
                data.id_siswa || '',
                data.jenis_nilai || '',
                data.nama_kolom || '',
                data.nilai || 0,
                data.semester || '',
                data.mata_pelajaran || ''
              ];
              
              if (rowIdx !== -1) {
                sheet.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
              } else {
                sheet.appendRow(rowValues);
              }
            }
          } 
          
          else if (storeName === 'attendance') {
            const sheet = ss.getSheetByName('Absensi') || ensureSheet(ss, 'Absensi');
            if (sheet.getLastRow() === 0) {
              sheet.appendRow(['ID', 'ID Siswa', 'Tanggal', 'Status', 'Semester', 'Mata Pelajaran']);
            }
            
            const rowIdx = findRowById(sheet, id);
            if (action === 'delete') {
              if (rowIdx !== -1) sheet.deleteRow(rowIdx);
            } else if (action === 'update' && data) {
              const rowValues = [
                data.id || '',
                data.id_siswa || '',
                data.tanggal || '',
                data.status || '',
                data.semester || '',
                data.mata_pelajaran || ''
              ];
              if (rowIdx !== -1) {
                sheet.getRange(rowIdx, 1, 1, rowValues.length).setValues([rowValues]);
              } else {
                sheet.appendRow(rowValues);
              }
            }
          }
        });
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    } 

    // 2. FULL PUSH ACTION (Standard backup overwrite)
    else if (payload.action === 'push') {
      const { students, grades, attendance, users, settings } = payload.data;
      
      ensureSheet(ss, 'Siswa');
      ensureSheet(ss, 'Absensi');
      ensureSheet(ss, 'Pengguna');
      ensureSheet(ss, 'Settings');
      ensureSheet(ss, 'Alumni');

      // Siswa
      if (students) {
        const siswaSheet = ss.getSheetByName('Siswa');
        const alumniSheet = ss.getSheetByName('Alumni');
        
        siswaSheet.clear();
        alumniSheet.clear();
        
        const baseHeaders = ['ID', 'No', 'Nama', 'NISN', 'NIPD', 'Tempat Lahir', 'Tanggal Lahir', 'Kelas', 'Nama Ayah', 'Nama Ibu', 'No Telp Ortu'];
        siswaSheet.appendRow(baseHeaders);
        alumniSheet.appendRow(baseHeaders);
        
        students.forEach(s => {
          if (s.kelas && s.kelas.toLowerCase() === 'alumni') {
            alumniSheet.appendRow([s.id, s.no, s.nama, s.nisn, s.nipd, s.tempat_lahir, s.tanggal_lahir, s.kelas, s.nama_ayah, s.nama_ibu, s.no_telp_ortu]);
          } else {
            siswaSheet.appendRow([s.id, s.no, s.nama, s.nisn, s.nipd, s.tempat_lahir, s.tanggal_lahir, s.kelas, s.nama_ayah, s.nama_ibu, s.no_telp_ortu]);
          }
        });
      }

      // Absensi
      if (attendance) {
        const attSheet = ss.getSheetByName('Absensi');
        attSheet.clear();
        attSheet.appendRow(['ID', 'ID Siswa', 'Tanggal', 'Status', 'Semester', 'Mata Pelajaran']);
        attendance.forEach(a => {
          attSheet.appendRow([a.id, a.id_siswa, a.tanggal, a.status, a.semester, a.mata_pelajaran || '']);
        });
      }

      // Pengguna
      if (users) {
        const userSheet = ss.getSheetByName('Pengguna');
        userSheet.clear();
        userSheet.appendRow(['ID', 'Username', 'Nama', 'Role']);
        users.forEach(u => {
          userSheet.appendRow([u.id, u.username, u.name, u.role]);
        });
      }

      // Settings & Grades
      if (settings) {
        const setSheet = ss.getSheetByName('Settings');
        setSheet.clear();
        setSheet.appendRow(['Key', 'Value']);
        Object.keys(settings).forEach(key => {
          const val = settings[key];
          setSheet.appendRow([key, Array.isArray(val) ? JSON.stringify(val) : val]);
        });
        
        if (settings.mata_pelajaran && Array.isArray(settings.mata_pelajaran)) {
          settings.mata_pelajaran.forEach(mapel => {
            const sheetName = 'Nilai - ' + mapel;
            ensureSheet(ss, sheetName);
            const sheet = ss.getSheetByName(sheetName);
            sheet.clear();
            sheet.appendRow(['ID', 'ID Siswa', 'Jenis Nilai', 'Nama Kolom', 'Nilai', 'Semester', 'Mata Pelajaran']);
            
            if (grades) {
              const mapelGrades = grades.filter(g => (g.mata_pelajaran || 'Umum') === mapel);
              mapelGrades.forEach(g => {
                sheet.appendRow([g.id, g.id_siswa, g.jenis_nilai, g.nama_kolom, g.nilai, g.semester, g.mata_pelajaran || '']);
              });
            }
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    } 
    
    // 3. FULL PULL ACTION (Load everything to local)
    else if (payload.action === 'pull') {
      const data = {
        students: readSheetAsObjects(ss, 'Siswa'),
        alumni: readSheetAsObjects(ss, 'Alumni'),
        attendance: readSheetAsObjects(ss, 'Absensi'),
        users: readSheetAsObjects(ss, 'Pengguna'),
        settings: readSettings(ss),
        grades: []
      };
      
      data.students = data.students.concat(data.alumni);
      delete data.alumni;
      
      if (data.settings && data.settings.mata_pelajaran) {
        let mapels = data.settings.mata_pelajaran;
        if (typeof mapels === 'string') {
          try { mapels = JSON.parse(mapels); } catch(e) {}
        }
        if (Array.isArray(mapels)) {
          mapels.forEach(m => {
            const sheetName = 'Nilai - ' + m;
            const grades = readSheetAsObjects(ss, sheetName);
            data.grades = data.grades.concat(grades);
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: data })).setMimeType(ContentService.MimeType.JSON);
    }
    
    throw new Error('Action tidak dikenal');
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ensureSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function findRowById(sheet, id) {
  if (!sheet || sheet.getLastRow() < 2) return -1;
  const data = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return i + 1;
    }
  }
  return -1;
}

function ensureHeader(sheet, keyName) {
  const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0] || [];
  const index = headers.map(h => h.toLowerCase().replace(/\s+/g, '_')).indexOf(keyName.toLowerCase());
  if (index !== -1) {
    return index + 1;
  }
  const colNum = sheet.getLastColumn() + 1;
  sheet.getRange(1, colNum).setValue(keyName);
  return colNum;
}

function readSheetAsObjects(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const results = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const obj = {};
    headers.forEach((h, idx) => {
      let key = h.toLowerCase().replace(/\s+/g, '_');
      obj[key] = row[idx];
    });
    results.push(obj);
  }
  return results;
}

function readSettings(ss) {
  const sheet = ss.getSheetByName('Settings');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return {};
  
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    const key = data[i][0];
    let val = data[i][1];
    
    if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
      try { val = JSON.parse(val); } catch(e) {}
    }
    
    if (['bobot_harian', 'bobot_tugas', 'bobot_ujian'].includes(key)) {
      val = Number(val);
    }
    
    settings[key] = val;
  }
  return settings;
}
`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
