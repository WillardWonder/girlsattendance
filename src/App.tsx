import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, writeBatch, doc, where, deleteDoc, limit, setDoc } from 'firebase/firestore';
import { 
  Search, CheckCircle, Scale, AlertCircle, UserPlus, ClipboardList, UploadCloud, Users, 
  Calendar, Clock, UserCheck, UserX, LayoutDashboard, Trash2, AlertTriangle, Lock, Unlock, 
  History, BarChart3, XCircle, Download, Filter, ChevronDown, ChevronUp, Copy, Check, 
  CloudLightning, Video, MessageSquare, TrendingUp, Plus, Youtube, Megaphone, ExternalLink, 
  ShieldAlert, BookOpen, Battery, Smile, Zap, Target, Play, RotateCcw, LogOut, KeyRound
} from 'lucide-react';

// --- CONFIGURATION ---

const firebaseConfig = {
  apiKey: "AIzaSyCpaaZZaHAumlUxbshd2GVH9yIoZrszg9I",
  authDomain: "girls-wrestling-attendance.firebaseapp.com",
  projectId: "girls-wrestling-attendance",
  storageBucket: "girls-wrestling-attendance.firebasestorage.app",
  messagingSenderId: "509878173460",
  appId: "1:509878173460:web:d8d0133cbc5718ce9fcc01",
  measurementId: "G-CVY2FGY8L2"
};

// Hardcoded URLs to ensure compatibility with the build environment
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzNBJdt_3dEJs9pRukUfRduhd9IkY6n1ZcQ3MhkbqxJ8ThxFIusYb3aGYrCbUYhhkY/exec"; 
const GOOGLE_CALENDAR_ID = "24d802fd6bba1a39b3c5818f3d4e1e3352a58526261be9342453808f0423b426@group.calendar.google.com"; 
const COACH_PASSWORD = "bluejays";

// Allowed domains for student registration
const ALLOWED_DOMAINS = ["@mapsedu.org", "@maps.k12.wi.us"];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- PRELOADED DATA ---
const PRELOADED_ROSTER = [
  // Paste roster here if needed for "Load Full Team" feature
];

const App = () => {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameInput, setNameInput] = useState(''); // For manual name entry if needed
  
  // App State
  const [activeTab, setActiveTab] = useState('checkin');
  const [appMode, setAppMode] = useState<'athlete' | 'coach'>('athlete');
  const [roster, setRoster] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  
  // Check-In Form State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [weight, setWeight] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [skinCheck, setSkinCheck] = useState(true);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Journal State
  const [journalGratitude, setJournalGratitude] = useState('');
  const [focusWord, setFocusWord] = useState('');
  const [focusStatement, setFocusStatement] = useState('');
  const [energyLevel, setEnergyLevel] = useState(3);
  const [moodLevel, setMoodLevel] = useState(3);
  const [journalSuccess, setJournalSuccess] = useState(false);

  // Focus Game State
  const [focusState, setFocusState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [focusGrid, setFocusGrid] = useState<number[]>([]);
  const [focusNextNumber, setFocusNextNumber] = useState(0);
  const [focusTimeLeft, setFocusTimeLeft] = useState(120); // 2 minutes
  const [focusScore, setFocusScore] = useState(0);

  // Stats View State
  const [statsStudent, setStatsStudent] = useState<any>(null);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  // Admin State
  const [adminTab, setAdminTab] = useState('live'); 
  const [todaysAttendance, setTodaysAttendance] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyStats, setHistoryStats] = useState<any[]>([]);
  const [isCoachAuthenticated, setIsCoachAuthenticated] = useState(false);
  const [coachPassInput, setCoachPassInput] = useState('');
  const [csvData, setCsvData] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [copiedDate, setCopiedDate] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState('');
  
  // Error Handling State
  const [permissionError, setPermissionError] = useState(false);
  
  // Report Filters
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportStudentFilter, setReportStudentFilter] = useState('');
  const [reportGradeFilter, setReportGradeFilter] = useState('');
  
  // Content Management Inputs
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoURL, setNewVideoURL] = useState('');

  // --- DEFINED FUNCTIONS ---

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedStudent(null); 
  };

  const selectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchTerm(student.name || "");
  };

  const getVideoMetadata = (url: string) => {
    if (!url) return { type: 'unknown', id: null, label: 'Link' };
    if (url.includes('youtu.be') || url.includes('youtube.com')) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const id = (match && match[2].length === 11) ? match[2] : null;
        return { type: 'youtube', id, label: 'YouTube' };
    }
    if (url.includes('tiktok.com')) return { type: 'tiktok', id: null, label: 'TikTok' };
    if (url.includes('facebook.com') || url.includes('fb.watch')) return { type: 'facebook', id: null, label: 'Facebook' };
    if (url.includes('instagram.com')) return { type: 'instagram', id: null, label: 'Instagram' };
    return { type: 'generic', id: null, label: 'Video' };
  };

  // --- DATA LOADING ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Roster
        const rosterQ = query(collection(db, "roster"), orderBy("Last_Name"));
        const rosterSnap = await getDocs(rosterQ);
        const loadedRoster = rosterSnap.docs.map(doc => {
          const d = doc.data();
          const fName = d.First_Name || d.firstname || '';
          const lName = d.Last_Name || d.lastname || '';
          return { id: doc.id, name: `${lName}, ${fName}`, email: d.Email || d.email, ...d };
        });
        setRoster(loadedRoster);

        // Announcements
        const newsQ = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(10));
        const newsSnap = await getDocs(newsQ);
        setAnnouncements(newsSnap.docs.map(d => ({id: d.id, ...d.data()})));

        // Resources
        const resQ = query(collection(db, "resources"), orderBy("timestamp", "desc"));
        const resSnap = await getDocs(resQ);
        setResources(resSnap.docs.map(d => ({id: d.id, ...d.data()})));

      } catch (e: any) {
        console.error("Init Error:", e);
        if (e.message && e.message.includes("Missing or insufficient permissions")) {
          setPermissionError(true);
        }
      }
    };
    fetchData();
  }, []);

  // Admin Data Fetch
  useEffect(() => {
    if (appMode === 'coach' && isCoachAuthenticated) {
      const fetchAdminData = async () => {
        try {
          const today = new Date().toLocaleDateString();
          const attQ = query(collection(db, "attendance"), where("date", "==", today));
          const attSnap = await getDocs(attQ);
          setTodaysAttendance(attSnap.docs.map(d => ({id: d.id, ...d.data()})));
        } catch (e: any) {
          if (e.message && e.message.includes("permissions")) setPermissionError(true);
        }
      };
      fetchAdminData();
      if(adminTab === 'history') fetchHistory();
    }
  }, [appMode, isCoachAuthenticated, adminTab]);

  const fetchHistory = async () => {
    try {
      const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"), limit(2000));
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryRecords(records);

      const stats: {[key: string]: number} = {};
      records.forEach((data: any) => {
        const date = data.date;
        if(date) stats[date] = (stats[date] || 0) + 1;
      });

      const statsArray = Object.keys(stats).map(date => ({
        date,
        count: stats[date]
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setHistoryStats(statsArray);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  // --- AUTH LISTENER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) {
        const match = roster.find(r => r.email && r.email.toLowerCase() === currentUser.email?.toLowerCase());
        if (match) setSelectedStudent(match);
      }
    });
    return () => unsubscribe();
  }, [roster]);

  // --- FOCUS GAME LOGIC ---
  useEffect(() => {
    let timer: any;
    if (focusState === 'playing' && focusTimeLeft > 0) {
      timer = setInterval(() => {
        setFocusTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (focusTimeLeft === 0 && focusState === 'playing') {
      endFocusGame();
    }
    return () => clearInterval(timer);
  }, [focusState, focusTimeLeft]);

  const startFocusGame = () => {
    if (!selectedStudent) { alert("Please select your name first."); return; }
    const numbers = Array.from({length: 100}, (_, i) => i);
    for (let i = numbers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    setFocusGrid(numbers);
    setFocusNextNumber(0);
    setFocusScore(0);
    setFocusTimeLeft(120);
    setFocusState('playing');
  };

  const handleGridClick = (num: number) => {
    if (num === focusNextNumber) {
        const newScore = focusNextNumber + 1;
        setFocusNextNumber(newScore);
        setFocusScore(newScore);
        if (newScore === 100) endFocusGame(true);
    }
  };

  const endFocusGame = async (completed = false) => {
    setFocusState('finished');
    if (selectedStudent) {
        const scoreData = {
            studentId: selectedStudent.id,
            name: selectedStudent.name,
            score: completed ? 100 : focusNextNumber,
            completed,
            timestamp: new Date().toISOString(),
            date: new Date().toLocaleDateString(),
            type: 'focus_drill'
        };
        await addDoc(collection(db, "focus_scores"), scoreData);
    }
  };

  // --- ACTIONS ---

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    } catch (err: any) {
      // If User Not Found AND password is "bluejays", try Register
      if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && passwordInput.toLowerCase() === 'bluejays') {
        await handleFirstTimeRegistration();
      } else {
        setError('Invalid email or password.');
        setLoading(false);
      }
    }
  };

  const handleFirstTimeRegistration = async () => {
    const studentRecord = roster.find(r => r.email && r.email.toLowerCase() === emailInput.toLowerCase());
    if (!studentRecord) {
      setError('Email not found on the team roster. Please ask Coach to add you.');
      setLoading(false);
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, emailInput, 'bluejays');
      // Force password update logic handled by UI state if needed, or simple login success here
      setLoading(false);
    } catch (e: any) {
      setError('Error creating account: ' + e.message);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const isValidDomain = ALLOWED_DOMAINS.some(domain => emailInput.toLowerCase().endsWith(domain));
    if (!isValidDomain) { setError(`Please use your official school email (${ALLOWED_DOMAINS[0]}).`); setLoading(false); return; }
    if (passwordInput.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
    if (passwordInput !== confirmPassword) { setError("Passwords do not match."); setLoading(false); return; }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
      const user = userCredential.user;
      const existingStudent = roster.find(r => r.email && r.email.toLowerCase() === emailInput.toLowerCase());
      
      if (!existingStudent) {
        let firstName = "Athlete"; let lastName = "";
        const namePart = emailInput.split('@')[0];
        if (namePart.includes('.')) {
          const parts = namePart.split('.');
          firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
          lastName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
        } else { firstName = nameInput || namePart; }

        await addDoc(collection(db, "roster"), {
          First_Name: firstName, Last_Name: lastName, Email: emailInput, Status: 'Active', uid: user.uid
        });
        const newStudent = { id: user.uid, name: `${lastName}, ${firstName}`, email: emailInput };
        setRoster(prev => [...prev, newStudent]);
        setSelectedStudent(newStudent);
      } else { setSelectedStudent(existingStudent); }
    } catch (err: any) { setError(err.message.replace('Firebase: ', '')); } finally { setLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!emailInput) { setError('Please enter your email address above first.'); return; }
    try { await sendPasswordResetEmail(auth, emailInput); alert('Password reset email sent!'); setAuthView('login'); } 
    catch (e: any) { setError('Error: ' + e.message); }
  };

  const handleLogout = () => {
    signOut(auth);
    setIsCoachAuthenticated(false);
    setSelectedStudent(null);
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !weight) { setError("Name and Weight required."); return; }
    setLoading(true); setSyncStatus('syncing');

    const data = {
      studentId: selectedStudent.id, name: selectedStudent.name, grade: selectedStudent.grade || '', weight: parseFloat(weight),
      skinCheckPass: skinCheck, notes, timestamp: new Date().toISOString(), date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), type: 'attendance'
    };

    try {
      await addDoc(collection(db, "attendance"), data);
      if (GOOGLE_SCRIPT_URL) {
        fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(() => setSyncStatus('success')).catch(() => setSyncStatus('error'));
      }
      setCheckInSuccess(true);
      setTimeout(() => { setCheckInSuccess(false); setWeight(''); setNotes(''); setSearchTerm(''); setSelectedStudent(null); setSyncStatus('idle'); }, 2500);
    } catch (err: any) {
      if (err.message && err.message.includes("permissions")) setPermissionError(true); else setError("Check-in failed.");
    } finally { setLoading(false); }
  };

  const handleJournalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !focusWord) { setError("Name and Focus Word required."); return; }
    setLoading(true);

    const data = {
      studentId: selectedStudent.id, name: selectedStudent.name, gratitude: journalGratitude, focusWord, focusStatement,
      energy: energyLevel, mood: moodLevel, timestamp: new Date().toISOString(), date: new Date().toLocaleDateString(), type: 'journal'
    };

    try {
      await addDoc(collection(db, "journals"), data);
      if (GOOGLE_SCRIPT_URL) {
        fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }
      setJournalSuccess(true);
      setTimeout(() => { 
          setJournalSuccess(false); setJournalGratitude(''); setFocusWord(''); setFocusStatement(''); setEnergyLevel(3); setMoodLevel(3); setSearchTerm(''); setSelectedStudent(null);
      }, 2500);
    } catch (err) { setError("Failed to save journal."); } finally { setLoading(false); }
  };

  const loadStudentStats = async (student: any) => {
    setStatsStudent(student);
    const q = query(collection(db, "attendance"), where("studentId", "==", student.id), orderBy("timestamp", "desc"), limit(20));
    const snap = await getDocs(q);
    setStudentHistory(snap.docs.map(d => d.data()));
  };

  const handleAddAnnouncement = async () => {
    if(!newAnnouncement) return;
    try {
      await addDoc(collection(db, "announcements"), { message: newAnnouncement, timestamp: new Date().toISOString(), date: new Date().toLocaleDateString() });
      setNewAnnouncement(''); alert('Posted!');
    } catch(e: any) { if (e.message && e.message.includes("permissions")) setPermissionError(true); }
  };

  const handleAddVideo = async () => {
    if(!newVideoTitle || !newVideoURL) return;
    try {
      await addDoc(collection(db, "resources"), { title: newVideoTitle, url: newVideoURL, type: 'youtube', timestamp: new Date().toISOString() });
      setNewVideoTitle(''); setNewVideoURL(''); alert('Video Added!');
    } catch(e: any) { if (e.message && e.message.includes("permissions")) setPermissionError(true); }
  };

  const unlockCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if(passwordInput === COACH_PASSWORD) { setIsCoachAuthenticated(true); setPasswordInput(''); } else { alert('Wrong Password'); }
  };

  const handleDeleteCheckIn = async (id: string, name: string) => {
    if(!confirm(`Remove ${name}?`)) return;
    await deleteDoc(doc(db, "attendance", id));
    const today = new Date().toLocaleDateString();
    const attQ = query(collection(db, "attendance"), where("date", "==", today));
    const attSnap = await getDocs(attQ);
    setTodaysAttendance(attSnap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const handleCopyForSheets = (date: string) => {
    const records = historyRecords.filter(r => r.date === date).sort((a,b) => String(a.name).localeCompare(String(b.name)));
    let text = "Name\tWeight\tTime\tNotes\n";
    records.forEach(r => { text += `${r.name}\t${r.weight}\t${r.time}\t${r.notes || ''}\n`; });
    navigator.clipboard.writeText(text).then(() => { setCopiedDate(date); setTimeout(() => setCopiedDate(null), 2000); });
  };

  const handleGenerateReport = async () => {
    try {
        let records = historyRecords;
        const start = new Date(reportStartDate).setHours(0,0,0,0);
        const end = new Date(reportEndDate).setHours(23,59,59,999);
        records = records.filter(r => { const rDate = new Date(r.timestamp).getTime(); return rDate >= start && rDate <= end; });
        if (reportStudentFilter) records = records.filter(r => r.name === reportStudentFilter);
        if (reportGradeFilter) records = records.filter(r => r.grade === reportGradeFilter);
        if (records.length === 0) { alert("No records."); return; }
        let csvContent = "data:text/csv;charset=utf-8,Date,Time,Name,Grade,Weight,Skin Check,Notes\n";
        records.forEach(row => {
            const skinCheck = row.skinCheckPass ? "Pass" : "Fail";
            const notes = row.notes ? `"${row.notes.replace(/"/g, '""')}"` : "";
            csvContent += `${row.date},${row.time},${row.name},${row.grade || ''},${row.weight},${skinCheck},${notes}\n`;
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `report.csv`);
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    } catch (e) { alert("Error generating report"); }
  };

  const handleBulkImport = async () => {
    if (!csvData) return;
    setImportStatus('Parsing...');
    const rows = csvData.trim().split('\n');
    if (rows.length < 2) { setImportStatus('Error: No data rows found.'); return; }
    const firstRow = rows[0];
    const separator = firstRow.includes('\t') ? '\t' : ',';
    const normalizeHeader = (h: string) => {
        const clean = h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (['lastname', 'last_name', 'last'].includes(clean)) return 'Last_Name';
        if (['firstname', 'first_name', 'first'].includes(clean)) return 'First_Name';
        return h.trim().replace(/^"|"$/g, ''); 
    };
    const headers = firstRow.split(separator).map(h => h.trim()).map(normalizeHeader);
    if (!headers.includes('Last_Name') || !headers.includes('First_Name')) { setImportStatus(`Error: Missing Name columns.`); return; }
    const csvWrestlers = rows.slice(1).map(row => {
      if (!row.trim()) return null;
      const values = row.split(separator);
      const obj: any = {};
      headers.forEach((header, index) => {
        let val = values[index]?.trim();
        if (val && val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (header) obj[header] = val;
      });
      return obj;
    }).filter(w => w && w.Last_Name && w.First_Name); 
    setImportStatus('Checking for duplicates...');
    try {
        const currentRosterSnapshot = await getDocs(collection(db, "roster"));
        const existingNames = new Set();
        currentRosterSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const fName = (data.First_Name || data.firstname || '').toString().toLowerCase().trim();
            const lName = (data.Last_Name || data.lastname || '').toString().toLowerCase().trim();
            existingNames.add(`${fName}-${lName}`);
        });
        const newWrestlers = csvWrestlers.filter(w => {
            const fName = (w.First_Name || '').toString().toLowerCase().trim();
            const lName = (w.Last_Name || '').toString().toLowerCase().trim();
            return !existingNames.has(`${fName}-${lName}`);
        });
        if (newWrestlers.length === 0) { setImportStatus('No new names found.'); return; }
        setImportStatus(`Uploading ${newWrestlers.length} new wrestlers...`);
        const batch = writeBatch(db);
        newWrestlers.forEach(wrestler => { const docRef = doc(collection(db, "roster")); batch.set(docRef, wrestler); });
        await batch.commit();
        setImportStatus(`Success! Added ${newWrestlers.length} new wrestlers.`); setCsvData('');
    } catch (e: any) {
        setImportStatus('Error uploading: ' + e.message);
        if (e.message && e.message.includes("permissions")) setPermissionError(true);
    }
  };

  const handlePreloadedImport = async () => {
    if (PRELOADED_ROSTER.length === 0) { alert("No roster data in code. Use Manual Import."); return; }
    alert("Please use Manual Import.");
  };

  const handleDeleteAllRoster = async () => {
    if (!confirm("⚠️ WARNING: This will DELETE EVERY STUDENT in the roster. Are you sure?")) return;
    setImportStatus('Deleting entire roster...');
    try {
        const q = query(collection(db, "roster"));
        const snapshot = await getDocs(q);
        const batchSize = 500;
        for (let i = 0; i < snapshot.docs.length; i += batchSize) {
            const batch = writeBatch(db);
            snapshot.docs.slice(i, i + batchSize).forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        setImportStatus('Roster wiped clean.');
    } catch (e: any) {
        setImportStatus('Error deleting: ' + e.message);
        if (e.message && e.message.includes("permissions")) setPermissionError(true);
    }
  };

  const handleDeduplicate = async () => {
    if (!confirm("Scan and delete duplicates?")) return;
    setImportStatus('Scanning...');
    try {
      const q = query(collection(db, "roster"));
      const snapshot = await getDocs(q);
      const seen = new Set();
      const duplicates: string[] = [];
      snapshot.docs.forEach(doc => {
        const d = doc.data();
        const f = (d.First_Name || '').toString().trim().toLowerCase();
        const l = (d.Last_Name || '').toString().trim().toLowerCase();
        const k = `${f}|${l}`;
        if (seen.has(k)) duplicates.push(doc.id); else seen.add(k);
      });
      if (duplicates.length === 0) { setImportStatus('No duplicates.'); return; }
      setImportStatus(`Deleting ${duplicates.length} duplicates...`);
      const batchSize = 500;
      for (let i = 0; i < duplicates.length; i += batchSize) {
        const batch = writeBatch(db);
        duplicates.slice(i, i + batchSize).forEach(id => batch.delete(doc(db, "roster", id)));
        await batch.commit();
      }
      setImportStatus('Cleanup done.');
    } catch (e: any) { setImportStatus('Error: ' + e.message); }
  };

  // ---------------- UI ----------------

  if (permissionError) return <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4"><div className="bg-red-900/20 border border-red-500 p-8 rounded-xl text-center"><ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4"/><h2 className="text-2xl font-bold text-white mb-4">Database Locked</h2><p className="text-gray-300 mb-6">Coach needs to fix Firebase security permissions.</p><button onClick={() => window.location.reload()} className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg w-full">Reload</button></div></div>;

  if (appMode === 'coach' && !isCoachAuthenticated) return <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4"><div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-sm text-center"><Lock className="w-12 h-12 text-pink-500 mx-auto mb-4"/><h2 className="text-xl font-bold text-white mb-2">Coach Access</h2><form onSubmit={unlockCoach}><input type="password" placeholder="Password" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mb-4 text-center" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus /><button className="w-full bg-pink-600 text-white font-bold py-3 rounded-lg">Unlock</button></form><button onClick={() => setAppMode('athlete')} className="mt-6 text-gray-500 text-sm">Back to Athlete View</button></div></div>;

  if (appMode === 'coach' && isCoachAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Coach Dashboard</h1>
          <button onClick={handleLogout} className="text-xs bg-red-900/50 px-3 py-1 rounded">Logout</button>
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['live', 'content', 'history', 'roster'].map(t => (
            <button key={t} onClick={() => setAdminTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${adminTab === t ? 'bg-pink-600' : 'bg-gray-800 text-gray-400'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        {/* Live Tab */}
        {adminTab === 'live' && (
          <div className="space-y-4">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="text-gray-400 text-xs uppercase font-bold">Present Today</div>
              <div className="text-3xl font-bold text-green-400">{todaysAttendance.length}</div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-3 bg-gray-900/50 border-b border-gray-700 font-bold text-gray-300">Checked In</div>
              <div className="divide-y divide-gray-700">
                {todaysAttendance.map(r => (
                  <div key={r.id} className="p-3 flex justify-between items-center">
                    <div><div className="font-bold">{r.name}</div><div className="text-xs text-gray-500">{r.time} • {r.weight}lbs</div></div>
                    <div className="flex items-center gap-2">{!r.skinCheckPass && <AlertCircle className="w-4 h-4 text-red-500" />}<button onClick={() => handleDeleteCheckIn(r.id, r.name)}><XCircle className="w-5 h-5 text-gray-500"/></button></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-3 bg-gray-900/50 border-b border-gray-700 font-bold text-gray-300">Absent</div>
              <div className="divide-y divide-gray-700">
                {getAbsentStudents().map(s => (
                  <div key={s.id} className="p-3 text-sm text-gray-400 flex justify-between"><span>{s.name}</span><span className="text-gray-500 text-xs">{s.grade ? `Gr ${s.grade}` : ''}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* History Tab */}
        {adminTab === 'history' && (
          <div className="space-y-4">
             <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-blue-400" /><h4 className="text-blue-300 font-bold">Report Builder</h4></div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div><label className="text-xs text-gray-400 block mb-1">Start</label><input type="date" className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded p-2" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} /></div>
                  <div><label className="text-xs text-gray-400 block mb-1">End</label><input type="date" className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded p-2" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} /></div>
                </div>
                <button onClick={handleGenerateReport} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-3 rounded flex items-center justify-center gap-2"><Download className="w-4 h-4" /> CSV</button>
             </div>
             <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
               <div className="p-3 bg-gray-900/50 border-b border-gray-700 font-bold text-gray-300 text-xs uppercase">Recent Activity</div>
               <div className="divide-y divide-gray-700">
                  {historyStats.map((stat, idx) => (
                    <div key={idx} className="flex flex-col border-b border-gray-700/50 last:border-0">
                      <button onClick={() => setExpandedDate(expandedDate === stat.date ? null : stat.date)} className="p-4 flex justify-between items-center w-full hover:bg-gray-700/50">
                         <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-gray-500" /><span className="font-bold text-gray-200">{stat.date}</span></div>
                         <div className="flex items-center gap-2"><span className="bg-gray-800 px-3 py-1 rounded text-white font-bold">{stat.count}</span>{expandedDate === stat.date ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</div>
                      </button>
                      {expandedDate === stat.date && (
                        <div className="bg-gray-900/50 p-4 border-t border-gray-700">
                          <button onClick={() => handleCopyForSheets(stat.date)} className="text-xs flex items-center gap-1 text-blue-400 mb-2">{copiedDate === stat.date ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>} Copy</button>
                          <div className="space-y-1">{historyRecords.filter(r => r.date === stat.date).map(s => (<div key={s.id} className="flex justify-between text-sm text-gray-300 border-b border-gray-800 pb-1"><span>{s.name}</span><span className="font-mono text-gray-500">{s.weight}</span></div>))}</div>
                        </div>
                      )}
                    </div>
                  ))}
               </div>
             </div>
          </div>
        )}
        {/* Content Tab */}
        {adminTab === 'content' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Megaphone className="w-4 h-4 text-yellow-400"/> Announcement</h3>
              <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Message..." value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} />
              <button onClick={handleAddAnnouncement} className="w-full bg-pink-600 py-2 rounded text-sm font-bold">Post</button>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Youtube className="w-4 h-4 text-red-400"/> Add Video Resource</h3>
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Title" value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} />
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="URL" value={newVideoURL} onChange={e => setNewVideoURL(e.target.value)} />
              <button onClick={handleAddVideo} className="w-full bg-green-600 py-2 rounded text-sm font-bold">Add Video</button>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-purple-400"/> Calendar</h3>
              <p className="text-xs text-gray-400 mb-2">ID: <span className="font-mono text-white">{GOOGLE_CALENDAR_ID || "Not Set"}</span></p>
              <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-xs bg-gray-700 px-3 py-2 rounded text-white block text-center">Manage in Google Calendar</a>
            </div>
          </div>
        )}
        {/* Roster Tab */}
        {adminTab === 'roster' && (
          <div className="space-y-6">
             <div className="bg-red-900/10 border border-red-900/50 p-4 rounded-lg">
                <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4"/> Danger Zone</h4>
                <button onClick={handleDeleteAllRoster} className="w-full bg-red-900/50 hover:bg-red-900/80 text-white border border-red-800 text-sm py-2 rounded-lg font-bold flex items-center justify-center gap-2"><Trash2 className="w-4 h-4"/> Delete Entire Roster</button>
             </div>
             <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Manual Import</p>
                <textarea className="w-full bg-gray-800 border border-gray-600 text-xs text-gray-300 p-2 rounded h-24 font-mono" placeholder={`Email,Last_Name,First_Name\njane@school.edu,Doe,Jane`} value={csvData} onChange={(e) => setCsvData(e.target.value)} />
                <button onClick={handleBulkImport} className="mt-2 w-full bg-gray-600 hover:bg-gray-500 text-white text-sm py-2 rounded flex items-center justify-center gap-2"><UploadCloud className="w-4 h-4" /> Process Import</button>
                {importStatus && (<div className="mt-2 text-xs text-blue-400 font-mono">{importStatus}</div>)}
             </div>
             <div className="flex gap-2">
                <input type="text" placeholder="Lastname, Firstname" className="bg-gray-800 border border-gray-600 rounded p-2 text-sm text-white flex-1" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                <button className="bg-pink-600 text-white px-3 rounded" onClick={async () => { if(newStudentName) { const parts = newStudentName.split(','); await addDoc(collection(db, "roster"), { Last_Name: parts[0].trim(), First_Name: parts[1]?.trim() || '' }); alert('Added!'); setNewStudentName(''); } }}><Plus className="w-4 h-4" /></button>
             </div>
          </div>
        )}
      </div>
    );
  }

  // 1. LOGIN / REGISTER VIEW (Default if no user)
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
             <Users className="w-12 h-12 text-pink-500 mx-auto mb-2" />
             <h1 className="text-2xl font-extrabold text-white">Lady Bluejays</h1>
             <p className="text-pink-400 text-sm font-bold uppercase tracking-widest">Wrestling Tracker</p>
          </div>

          {authView === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h2 className="text-white font-bold text-lg">Sign In</h2>
              <input type="email" required className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="School Email" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
              <input type="password" required className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              {error && <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded">{error}</div>}
              <button disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg transition-all">{loading ? '...' : 'Sign In'}</button>
              <div className="text-center text-xs text-gray-400 mt-4">
                <button type="button" onClick={handleForgotPassword} className="hover:text-white underline">Forgot Password?</button>
                <span className="mx-2">|</span>
                <button type="button" onClick={() => { setAuthView('register'); setError(''); }} className="text-pink-400 hover:text-pink-300 font-bold">Create Account</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <h2 className="text-white font-bold text-lg">Create Account</h2>
              <div className="bg-blue-900/20 p-3 rounded border border-blue-800 text-xs text-blue-200">
                Must use official school email ({ALLOWED_DOMAINS[0]})
              </div>
              <input type="email" required className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="lakeyn.adams@mapsedu.org" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
              <input type="password" required minLength={6} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Password (min 6 chars)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              <input type="password" required minLength={6} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              {error && <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded">{error}</div>}
              <button disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-all">{loading ? 'Creating...' : 'Register'}</button>
              <button type="button" onClick={() => { setAuthView('login'); setError(''); }} className="w-full text-gray-500 text-xs mt-2">Back to Sign In</button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-gray-700">
             <button onClick={() => { setIsCoachAuthenticated(true); setAppMode('coach'); setUser({isCoach:true}); }} className="text-gray-600 text-xs hover:text-gray-400 flex items-center justify-center gap-1 w-full">
               <Lock className="w-3 h-3"/> Coach Admin
             </button>
          </div>
        </div>
        {/* Coach Login Overlay */}
        {isCoachAuthenticated && !user?.email && (
             <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
                 <div className="bg-gray-800 p-8 rounded-xl w-full max-w-sm relative">
                    <button onClick={() => { setIsCoachAuthenticated(false); setUser(null); }} className="absolute top-4 right-4 text-gray-400"><XCircle/></button>
                    <h2 className="text-xl font-bold text-white mb-4">Coach Password</h2>
                    <input type="password" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mb-4" placeholder="••••••••" value={coachPassInput} onChange={e => setCoachPassInput(e.target.value)} autoFocus />
                    <button onClick={() => { if(coachPassInput === COACH_PASSWORD) { setUser({isCoach: true}); setCoachPassInput(''); } else alert('Wrong'); }} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">Access</button>
                 </div>
             </div>
        )}
      </div>
    );
  }

  // 4. ATHLETE DASHBOARD
  const currentStudent = roster.find(r => r.email && r.email.toLowerCase() === user?.email?.toLowerCase());
  
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans pb-24">
      <div className="bg-gray-900 p-4 border-b border-gray-800 sticky top-0 z-10 shadow-lg flex justify-between items-center">
         <div><h1 className="text-lg font-extrabold text-white">Lady Bluejays</h1>{currentStudent && <p className="text-xs text-pink-400">Welcome, {currentStudent.First_Name}!</p>}</div>
         <button onClick={handleLogout} className="bg-gray-800 p-2 rounded-full hover:bg-gray-700"><LogOut className="w-4 h-4 text-gray-400"/></button>
      </div>

      <div className="p-4 max-w-md mx-auto">
         {activeTab === 'checkin' && (
            <div className="animate-in fade-in">
               <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-pink-400"/> Daily Check-in</h2>
                  {currentStudent ? (
                    <div className="space-y-4">
                       <div><label className="text-gray-400 text-xs font-bold">Weight</label><input type="number" step="0.1" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-xl text-xl font-mono" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.0" /></div>
                       <div><label className="text-gray-400 text-xs font-bold">Skin Check</label><div className="flex gap-2"><button onClick={() => setSkinCheck(true)} className={`flex-1 py-3 rounded-xl border ${skinCheck ? 'bg-green-600 border-green-500' : 'bg-gray-700 border-gray-600'}`}>Pass</button><button onClick={() => setSkinCheck(false)} className={`flex-1 py-3 rounded-xl border ${!skinCheck ? 'bg-red-600 border-red-500' : 'bg-gray-700 border-gray-600'}`}>Fail</button></div></div>
                       <button onClick={() => { setSelectedStudent(currentStudent); handleCheckIn({ preventDefault: () => {} } as any); }} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl shadow-lg mt-2">{loading ? '...' : 'Submit'}</button>
                    </div>
                  ) : <div className="text-center text-gray-400 py-4">Loading profile...</div>}
               </div>
               <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                  <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2"><Megaphone className="w-4 h-4 text-yellow-500"/> Recent News</h3>
                  <div className="space-y-3">{announcements.slice(0,2).map(a => <div key={a.id} className="text-sm border-l-2 border-yellow-500 pl-3"><div className="text-gray-200">{a.message}</div><div className="text-xs text-gray-500 mt-1">{a.date}</div></div>)}</div>
               </div>
            </div>
         )}

         {/* Other tabs (Journal, Focus, etc.) rely on currentStudent now */}
         {activeTab === 'journal' && (
            <div className="animate-in fade-in">
               <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-pink-400"/> Mindset</h2>
                  {currentStudent ? (
                    <div className="space-y-6">
                      <div><label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Daily Gratitude</label><textarea className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white text-sm h-20" placeholder="I am grateful for..." value={journalGratitude} onChange={(e) => setJournalGratitude(e.target.value)}/></div>
                      <div><label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Focus Word</label><div className="flex flex-wrap gap-2">{['Consistent', 'Persistent', 'Resilient', 'Relentless', 'Respectful'].map(word => <button key={word} onClick={() => setFocusWord(word)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${focusWord === word ? 'bg-pink-600 border-pink-500' : 'bg-gray-700 border-gray-600'}`}>{word}</button>)}</div></div>
                      {focusWord && <div><label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Focus Statement</label><textarea className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white text-sm h-20" placeholder={`How will you be ${focusWord.toLowerCase()} today?`} value={focusStatement} onChange={(e) => setFocusStatement(e.target.value)}/></div>}
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-gray-400 text-xs font-bold mb-2 flex items-center gap-1"><Battery className="w-3 h-3"/> Energy</label><div className="flex justify-between bg-gray-900 rounded-lg p-1 border border-gray-600">{[1, 2, 3, 4, 5].map(lvl => <button key={lvl} onClick={() => setEnergyLevel(lvl)} className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm ${energyLevel === lvl ? 'bg-yellow-500 text-black' : 'text-gray-500'}`}>{lvl}</button>)}</div></div>
                        <div><label className="text-gray-400 text-xs font-bold mb-2 flex items-center gap-1"><Smile className="w-3 h-3"/> Mood</label><div className="flex justify-between bg-gray-900 rounded-lg p-1 border border-gray-600">{[1, 2, 3, 4, 5].map(lvl => <button key={lvl} onClick={() => setMoodLevel(lvl)} className={`w-8 h-8 rounded flex items-center justify-center font-bold text-sm ${moodLevel === lvl ? 'bg-blue-500 text-white' : 'text-gray-500'}`}>{lvl}</button>)}</div></div>
                      </div>
                      <button onClick={() => { setSelectedStudent(currentStudent); handleJournalSubmit({ preventDefault: () => {} } as any); }} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl shadow-lg mt-2">Submit Log</button>
                    </div>
                  ) : <div className="text-center text-gray-400 py-4">Loading profile...</div>}
               </div>
            </div>
         )}

         {activeTab === 'focus' && (
           <div className="animate-in fade-in h-full flex flex-col">
             {currentStudent && (
               <div className="flex-1 flex flex-col">
                  {focusState === 'idle' && (
                    <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 text-center m-auto">
                       <Target className="w-16 h-16 text-pink-500 mx-auto mb-4 animate-pulse"/>
                       <h2 className="text-2xl font-extrabold text-white mb-2">2 Minutes of Focus</h2>
                       <button onClick={() => { setSelectedStudent(currentStudent); startFocusGame(); }} className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-12 rounded-xl text-xl shadow-lg shadow-green-900/20 flex items-center gap-3 mx-auto"><Play className="w-6 h-6 fill-current"/> Start</button>
                    </div>
                  )}
                  {focusState === 'playing' && (
                    <div className="flex flex-col h-full">
                      <div className="flex justify-between items-center mb-4 px-2">
                         <div><div className="text-xs text-gray-500 uppercase font-bold">Next</div><div className="text-3xl font-black text-white">{focusNextNumber}</div></div>
                         <div className={`text-4xl font-mono font-bold ${focusTimeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-pink-500'}`}>{Math.floor(focusTimeLeft / 60)}:{(focusTimeLeft % 60).toString().padStart(2, '0')}</div>
                      </div>
                      <div className="grid grid-cols-10 gap-1 flex-1 content-start">
                        {focusGrid.map((num) => <button key={num} onTouchStart={(e) => { e.preventDefault(); handleGridClick(num); }} onClick={() => handleGridClick(num)} className={`aspect-square flex items-center justify-center text-[10px] sm:text-xs font-bold rounded select-none ${num < focusNextNumber ? 'bg-green-600 text-white opacity-30' : 'bg-gray-800 text-gray-300 active:bg-pink-600 active:text-white'}`}>{num}</button>)}
                      </div>
                    </div>
                  )}
                  {focusState === 'finished' && (
                    <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 text-center m-auto animate-in zoom-in">
                       <div className="mx-auto bg-blue-900/30 w-24 h-24 rounded-full flex items-center justify-center mb-6 border-4 border-blue-500/50"><span className="text-4xl font-black text-white">{focusScore}</span></div>
                       <h2 className="text-2xl font-bold text-white mb-2">Time's Up!</h2>
                       <div className="flex gap-3 justify-center"><button onClick={startFocusGame} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2"><RotateCcw className="w-4 h-4"/> Retry</button><button onClick={() => setFocusState('idle')} className="bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 px-6 rounded-lg">Finish</button></div>
                    </div>
                  )}
               </div>
             )}
           </div>
         )}
         
         {/* Resources, Calendar, Stats tabs rendered here (similar structure, referencing currentStudent) */}
         {activeTab === 'resources' && (
            <div className="space-y-4 animate-in fade-in">
               <h2 className="text-2xl font-bold text-white mb-4">Videos</h2>
               {resources.map(vid => {
                  const { type, id, label } = getVideoMetadata(vid.url);
                  return (
                  <div key={vid.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-lg">
                    <a href={vid.url} target="_blank" rel="noreferrer" className="block relative group">
                       {type === 'youtube' && id ? (
                           <>
                             <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt={vid.title} className="w-full h-48 object-cover group-hover:opacity-80 transition-opacity" />
                             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="bg-black/50 rounded-full p-3"><Play className="w-8 h-8 text-white fill-current"/></div></div>
                           </>
                       ) : (
                           <div className="w-full h-48 bg-gray-700 flex flex-col items-center justify-center group-hover:bg-gray-600 transition-colors"><Video className="w-12 h-12 text-gray-500 mb-2" /><span className="text-gray-400 font-bold text-sm">Watch on {label}</span></div>
                       )}
                    </a>
                    <div className="p-4"><h3 className="font-bold text-white text-lg mb-1">{vid.title}</h3><a href={vid.url} target="_blank" rel="noreferrer" className="text-pink-400 text-sm flex items-center gap-1 hover:underline"><ExternalLink className="w-4 h-4" /> Open Link</a></div>
                  </div>
                )})}
            </div>
         )}

         {activeTab === 'calendar' && (
            <div className="space-y-3 animate-in fade-in">
              <h2 className="text-2xl font-bold text-white mb-4">Schedule</h2>
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 p-1">
                 <iframe src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(GOOGLE_CALENDAR_ID)}&ctz=America%2FChicago&mode=AGENDA&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&theme=DARK`} style={{border: 0, width: "100%", height: "400px"}} frameBorder="0" scrolling="no"></iframe>
              </div>
            </div>
         )}

         {activeTab === 'stats' && (
             <div className="space-y-4 animate-in fade-in">
                 <h2 className="text-2xl font-bold text-white">My History</h2>
                 {currentStudent ? (
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                       {/* We trigger load stats on mount via effect, but need to render */}
                       {studentHistory.length === 0 && <div className="text-gray-500 text-center py-4">No history found yet.</div>}
                       <div className="space-y-2">
                          {studentHistory.map((h, i) => (
                             <div key={i} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg">
                                <span className="text-gray-400 text-sm">{h.date}</span>
                                <span className="font-mono font-bold text-white">{h.weight}</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 ) : <div className="text-center text-gray-500">Loading stats...</div>}
             </div>
         )}
      </div>

      {/* NAV BAR */}
      <div className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 pb-safe pt-2 px-1 flex justify-around items-center z-40">
         <button onClick={() => setActiveTab('checkin')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'checkin' ? 'text-pink-500' : 'text-gray-500'}`}><CheckCircle className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold uppercase">Check In</span></button>
         <button onClick={() => setActiveTab('focus')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'focus' ? 'text-pink-500' : 'text-gray-500'}`}><Target className="w-5 h-5"/><span className="text-[8px] mt-1 font-bold uppercase">Focus</span></button>
         <button onClick={() => setActiveTab('journal')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'journal' ? 'text-pink-500' : 'text-gray-500'}`}><BookOpen className="w-5 h-5"/><span className="text-[8px] mt-1 font-bold uppercase">Mindset</span></button>
         <button onClick={() => setActiveTab('resources')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'resources' ? 'text-pink-500' : 'text-gray-500'}`}><Video className="w-5 h-5"/><span className="text-[8px] mt-1 font-bold uppercase">Videos</span></button>
         <button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'calendar' ? 'text-pink-500' : 'text-gray-500'}`}><Calendar className="w-5 h-5"/><span className="text-[8px] mt-1 font-bold uppercase">Schedule</span></button>
         <button onClick={() => { setActiveTab('stats'); if(currentStudent) loadStudentStats(currentStudent); }} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'stats' ? 'text-pink-500' : 'text-gray-500'}`}><TrendingUp className="w-5 h-5"/><span className="text-[8px] mt-1 font-bold uppercase">Stats</span></button>
      </div>
    </div>
  );
};

export default App;
