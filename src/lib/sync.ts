import { store, Student, Grade, Attendance, Settings, AppUser, pauseNotifications, resumeNotifications, pauseSyncQueue, resumeSyncQueue } from './store';

export async function getSyncStats() {
  try {
    const studentCount = await store.students.length();
    const gradeCount = await store.grades.length();
    const attendanceCount = await store.attendance.length();
    const totalItems = studentCount + gradeCount + attendanceCount;

    const unsyncedCount = await store.syncQueue.length();
    
    // Get list of queue items for details
    const queueKeys = await store.syncQueue.keys();
    const queueItems: { store: string; id: string; action: string }[] = [];
    for (const key of queueKeys) {
      const parts = key.split('::');
      const val = await store.syncQueue.getItem(key);
      queueItems.push({
        store: parts[0] || 'Unknown',
        id: parts[1] || 'Unknown',
        action: typeof val === 'string' ? val : 'updated'
      });
    }

    const syncedCount = Math.max(0, totalItems - unsyncedCount);
    const percentage = totalItems === 0 ? 100 : Math.round((syncedCount / totalItems) * 100);

    return {
      totalItems,
      unsyncedCount,
      syncedCount,
      percentage,
      queueItems
    };
  } catch (e) {
    return {
      totalItems: 0,
      unsyncedCount: 0,
      syncedCount: 0,
      percentage: 100,
      queueItems: []
    };
  }
}

export async function pushDataToSheets(appsScriptUrl: string, forceFull = false) {
  const queueKeys = await store.syncQueue.keys();

  if (!forceFull && queueKeys.length > 0) {
    // Perform Delta Sync (super fast, only changed items)
    const changes: any[] = [];
    for (const key of queueKeys) {
      const parts = key.split('::');
      const storeName = parts[0];
      const recordId = parts[1];
      const action = await store.syncQueue.getItem(key);

      if (storeName && recordId) {
        let data: any = null;
        if (action !== 'deleted') {
          if (storeName === 'students') {
            data = await store.students.getItem(recordId);
          } else if (storeName === 'grades') {
            data = await store.grades.getItem(recordId);
          } else if (storeName === 'attendance') {
            data = await store.attendance.getItem(recordId);
          }
        }
        changes.push({
          store: storeName,
          id: recordId,
          action: action === 'deleted' ? 'delete' : 'update',
          data
        });
      }
    }

    const payload = {
      action: 'delta',
      changes
    };

    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });

    if (!res.ok) {
      throw new Error('Gagal mengirim sinkronisasi delta ke Apps Script');
    }

    const result = await res.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Error dari Apps Script');
    }

    // Clear the specific keys that were synced
    for (const key of queueKeys) {
      await store.syncQueue.removeItem(key);
    }
  } else {
    // Full Backup Push
    const students: Student[] = [];
    await store.students.iterate<Student, void>((v) => { students.push(v); });

    const grades: Grade[] = [];
    await store.grades.iterate<Grade, void>((v) => { grades.push(v); });

    const attendance: Attendance[] = [];
    await store.attendance.iterate<Attendance, void>((v) => { attendance.push(v); });

    const users: AppUser[] = [];
    await store.users.iterate<AppUser, void>((v) => { users.push(v); });

    const settings = await store.settings.getItem<Settings>('app_settings');

    const payload = {
      action: 'push',
      data: {
        students,
        grades,
        attendance,
        users,
        settings
      }
    };

    const res = await fetch(appsScriptUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' } 
    });

    if (!res.ok) {
      throw new Error('Gagal menyimpan backup penuh ke Apps Script');
    }

    const result = await res.json();
    if (result.status !== 'success') {
      throw new Error(result.message || 'Error dari Apps Script');
    }

    await store.syncQueue.clear();
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('sync-status-changed'));
  }
}

export async function pullDataFromSheets(appsScriptUrl: string) {
  const payload = { action: 'pull' };
  
  const res = await fetch(appsScriptUrl, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });

  if (!res.ok) {
    throw new Error('Gagal mengambil data dari Apps Script');
  }

  const result = await res.json();
  if (result.status !== 'success' || !result.data) {
    throw new Error(result.message || 'Error dari Apps Script');
  }

  const { students, grades, attendance, users, settings } = result.data;

  // Pause notifications and sync queue to prevent bulk render overhead & infinite push-pull loops
  pauseNotifications();
  pauseSyncQueue();

  try {
    // Smart Sync for Students (differential updates)
    const localStudentsMap = new Map<string, Student>();
    await store.students.iterate<Student, void>((v, k) => {
      localStudentsMap.set(k, v);
    });

    if (students && Array.isArray(students)) {
      const remoteIds = new Set(students.map(s => s.id));
      for (const s of students) {
        const local = localStudentsMap.get(s.id);
        if (!local || JSON.stringify(local) !== JSON.stringify(s)) {
          await store.students.setItem(s.id, s);
        }
      }
      for (const [id, local] of localStudentsMap.entries()) {
        if (!remoteIds.has(id)) {
          await store.students.removeItem(id);
        }
      }
    }

    // Smart Sync for Grades (differential updates)
    const localGradesMap = new Map<string, Grade>();
    await store.grades.iterate<Grade, void>((v, k) => {
      localGradesMap.set(k, v);
    });

    if (grades && Array.isArray(grades)) {
      const remoteIds = new Set(grades.map(g => g.id));
      for (const g of grades) {
        const local = localGradesMap.get(g.id);
        if (!local || JSON.stringify(local) !== JSON.stringify(g)) {
          await store.grades.setItem(g.id, g);
        }
      }
      for (const [id, local] of localGradesMap.entries()) {
        if (!remoteIds.has(id)) {
          await store.grades.removeItem(id);
        }
      }
    }

    // Smart Sync for Attendance (differential updates)
    const localAttendanceMap = new Map<string, Attendance>();
    await store.attendance.iterate<Attendance, void>((v, k) => {
      localAttendanceMap.set(k, v);
    });

    if (attendance && Array.isArray(attendance)) {
      const remoteIds = new Set(attendance.map(a => a.id));
      for (const a of attendance) {
        const local = localAttendanceMap.get(a.id);
        if (!local || JSON.stringify(local) !== JSON.stringify(a)) {
          await store.attendance.setItem(a.id, a);
        }
      }
      for (const [id, local] of localAttendanceMap.entries()) {
        if (!remoteIds.has(id)) {
          await store.attendance.removeItem(id);
        }
      }
    }

    // Smart Sync for Settings (differential updates)
    if (settings) {
      const existingSettings = await store.settings.getItem<Settings>('app_settings') || {} as Settings;
      const newSettings = { ...existingSettings, ...settings };
      if (JSON.stringify(existingSettings) !== JSON.stringify(newSettings)) {
        await store.settings.setItem('app_settings', newSettings);
      }
    }

    // Smart Sync for Users (differential updates, preserving admin password)
    const localUsersMap = new Map<string, AppUser>();
    await store.users.iterate<AppUser, void>((v, k) => {
      localUsersMap.set(k, v);
    });

    if (users && Array.isArray(users)) {
      const remoteIds = new Set(users.map(u => u.id));
      for (const u of users) {
        if (u.username === 'admin') continue; // Don't override local admin
        const local = localUsersMap.get(u.id);
        if (!local || JSON.stringify(local) !== JSON.stringify(u)) {
          await store.users.setItem(u.id, u);
        }
      }
      for (const [id, local] of localUsersMap.entries()) {
        if (local.username === 'admin') continue;
        if (!remoteIds.has(id)) {
          await store.users.removeItem(id);
        }
      }
    }

    // Clear sync queue since local state is now fully synced with Sheets
    await store.syncQueue.clear();
  } finally {
    resumeSyncQueue();
    resumeNotifications(true);
  }
}

