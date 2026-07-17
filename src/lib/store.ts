import localforage from 'localforage';
import { v4 as uuidv4 } from 'uuid';

export interface Student {
  id: string;
  no: number;
  nama: string;
  nisn: string;
  nipd: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  kelas: string;
  nama_ayah: string;
  nama_ibu: string;
  no_telp_ortu: string;
  semester?: string; // Filterable by selected semester ID
  tanggal_lulus?: string; // Graduation date
  tahun_ajaran_lulus?: string; // School year graduated
  [key: string]: any; // Support custom columns dynamically
}

export interface Grade {
  id: string;
  id_siswa: string;
  jenis_nilai: 'Harian' | 'Tugas' | 'Ujian';
  nama_kolom: string; // e.g., "Tugas 1", "UH 1"
  nilai: number;
  semester: string;
  mata_pelajaran?: string;
  tanggal?: string; // YYYY-MM-DD
}

export interface Attendance {
  id: string;
  id_siswa: string;
  tanggal: string; // YYYY-MM-DD
  status: 'Hadir' | 'Sakit' | 'Izin' | 'Alpa';
  semester: string;
  mata_pelajaran?: string;
}

export interface AppUser {
  id: string;
  username: string;
  password?: string;
  role: 'guru' | 'kepsek';
  name: string;
  pertanyaan_keamanan?: string;
  jawaban_keamanan?: string;
  email_pemulihan?: string;
}

export interface CustomHoliday {
  id: string;
  nama: string;
  tanggal_mulai: string; // YYYY-MM-DD
  tanggal_selesai: string; // YYYY-MM-DD
  jenis: 'kolektif' | 'perhari';
}

export interface Settings {
  nama_sekolah: string;
  npsn?: string;
  alamat?: string;
  email?: string;
  nama_kepala_sekolah?: string;
  nip_kepala_sekolah?: string;
  nama_kelas: string;
  nama_wali_kelas?: string;
  nip_wali_kelas?: string;
  semester_aktif: string;
  daftar_semester?: string[];
  mata_pelajaran: string[];
  bobot_harian: number;
  bobot_tugas: number;
  bobot_ujian: number;
  spreadsheetId?: string;
  appsScriptUrl?: string;
  custom_student_columns?: string[]; // Dynamic custom columns
  holidays?: CustomHoliday[];
}

export const defaultSettings: Settings = {
  nama_sekolah: '',
  npsn: '',
  alamat: '',
  email: '',
  nama_kepala_sekolah: '',
  nip_kepala_sekolah: '',
  nama_kelas: '',
  nama_wali_kelas: '',
  nip_wali_kelas: '',
  semester_aktif: 'Ganjil 2026',
  daftar_semester: ['Ganjil 2026', 'Genap 2026'],
  mata_pelajaran: ['Tematik', 'Matematika', 'Bahasa Indonesia'],
  bobot_harian: 30,
  bobot_tugas: 30,
  bobot_ujian: 40,
  custom_student_columns: [],
  holidays: [],
};

let isNotificationPaused = false;
let isSyncQueuePaused = false;

export const pauseNotifications = () => {
  isNotificationPaused = true;
};

export const resumeNotifications = (triggerNow = true) => {
  isNotificationPaused = false;
  if (triggerNow && typeof window !== 'undefined') {
    window.dispatchEvent(new Event('data-changed'));
    window.dispatchEvent(new Event('sync-status-changed'));
  }
};

export const pauseSyncQueue = () => {
  isSyncQueuePaused = true;
};

export const resumeSyncQueue = () => {
  isSyncQueuePaused = false;
};

const wrapInstance = (instance: LocalForage, storeName: string) => {
  const notify = () => {
    if (!isNotificationPaused && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('data-changed'));
      window.dispatchEvent(new Event('sync-status-changed'));
    }
  };
  return {
    getItem: instance.getItem.bind(instance),
    setItem: async <T>(key: string, value: T) => {
      const res = await instance.setItem(key, value);
      if (!isSyncQueuePaused && ['students', 'grades', 'attendance'].includes(storeName)) {
        await store.syncQueue.setItem(`${storeName}::${key}`, true).catch(() => {});
      }
      notify();
      return res;
    },
    removeItem: async (key: string) => {
      await instance.removeItem(key);
      if (!isSyncQueuePaused && ['students', 'grades', 'attendance'].includes(storeName)) {
        await store.syncQueue.setItem(`${storeName}::${key}`, 'deleted').catch(() => {});
      }
      notify();
    },
    clear: async () => {
      await instance.clear();
      if (!isSyncQueuePaused && ['students', 'grades', 'attendance'].includes(storeName)) {
        try {
          const keys = await store.syncQueue.keys();
          for (const k of keys) {
            if (k.startsWith(`${storeName}::`)) {
              await store.syncQueue.removeItem(k);
            }
          }
        } catch (e) {}
      }
      notify();
    },
    iterate: instance.iterate.bind(instance),
    length: instance.length.bind(instance),
    key: instance.key.bind(instance),
    keys: instance.keys.bind(instance),
    dropInstance: instance.dropInstance.bind(instance),
  } as LocalForage;
};

export const store = {
  students: wrapInstance(localforage.createInstance({ name: 'ClassApp', storeName: 'students' }), 'students'),
  grades: wrapInstance(localforage.createInstance({ name: 'ClassApp', storeName: 'grades' }), 'grades'),
  attendance: wrapInstance(localforage.createInstance({ name: 'ClassApp', storeName: 'attendance' }), 'attendance'),
  settings: wrapInstance(localforage.createInstance({ name: 'ClassApp', storeName: 'settings' }), 'settings'),
  users: wrapInstance(localforage.createInstance({ name: 'ClassApp', storeName: 'users' }), 'users'),
  syncQueue: localforage.createInstance({ name: 'ClassApp', storeName: 'syncQueue' }),
};

// Initializer
export const initializeStore = async () => {
  const currentSettings = await store.settings.getItem<Settings>('app_settings');
  if (!currentSettings) {
    await store.settings.setItem('app_settings', defaultSettings);
  }
};
