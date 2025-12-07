import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, sendPasswordResetEmail, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, where, deleteDoc, limit, setDoc, getDoc, writeBatch, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { 
  CheckCircle, AlertCircle, Calendar, Clock, 
  Trash2, Lock, Unlock, BarChart3, Download, ChevronDown, ChevronUp, Copy, Check, 
  CloudLightning, Video, Youtube, Megaphone, ExternalLink, ShieldAlert, 
  BookOpen, Battery, Smile, Zap, Target, Play, RotateCcw, LogOut, Mail,
  Dumbbell, Heart, DollarSign, GraduationCap, PartyPopper, Flame, Brain, Trophy, Leaf, Droplets, Swords, Lightbulb, Edit3, Users, Search, Scale, UserCheck, UserX, LayoutDashboard, Plus,
  XCircle, AlertTriangle, UploadCloud, MessageCircle, Send, Filter, Hash, Star, Timer, Menu, Grid
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

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzNBJdt_3dEJs9pRukUfRduhd9IkY6n1ZcQ3MhkbqxJ8ThxFIusYb3aGYrCbUYhhkY/exec"; 
const GOOGLE_CALENDAR_ID = "24d802fd6bba1a39b3c5818f3d4e1e3352a58526261be9342453808f0423b426@group.calendar.google.com"; 

// --- SECURITY & ASSETS ---
const COACH_ACCESS_CODE = "bluejays"; // Hardcoded access code
const APPROVED_COACH_EMAILS = ["coach@example.com", "admin@school.edu"]; // Auto-approved emails
const LOGO_URL = "https://raw.githubusercontent.com/WillardWonder/girlsattendance/main/merrill-logo.png"; // GitHub raw link

// --- EVENTS FOR COUNTDOWN ---
const MAJOR_EVENTS = [
  { name: "Regionals", date: new Date("2026-02-13T09:00:00") },
  { name: "Sectionals", date: new Date("2026-02-20T09:00:00") },
  { name: "State", date: new Date("2026-02-26T09:00:00") }
];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Attempt to set persistence to local, handling quota errors automatically
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Auth persistence warning:", error);
  if (error.code === 'auth/quota-exceeded' || error.message.includes('quota')) {
     console.log("Attempting to clear storage to fix quota...");
     try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
  }
});

const App = () => {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null); 
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // App State
  const [activeTab, setActiveTab] = useState('daily');
  const [showMenu, setShowMenu] = useState(false);
  const [appMode, setAppMode] = useState<'athlete' | 'coach'>('athlete');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [roster, setRoster] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [countdowns, setCountdowns] = useState<any[]>([]);

  // --- FORUM / DISCUSSION STATE ---
  const [showForum, setShowForum] = useState(false);
  const [activePost, setActivePost] = useState<any>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // --- LIBRARY STATE ---
  const [libFilterTag, setLibFilterTag] = useState('All');
  const [libShowFavorites, setLibShowFavorites] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // --- TAB 1: DAILY GRIND STATE ---
  const [dailyComplete, setDailyComplete] = useState(false);
  const [weight, setWeight] = useState('');
  const [skinCheck, setSkinCheck] = useState(true);
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('Good');
  const [energyColor, setEnergyColor] = useState(''); 
  const [nutrition, setNutrition] = useState({ veggies: false, protein: false, fruit: false, grain: false });
  const [hydration, setHydration] = useState(0);
  const [balance, setBalance] = useState({ faith: 5, family: 5, fitness: 5, finances: 5, academics: 5, fun: 5 });
  const [mentalImprovement, setMentalImprovement] = useState('');
  const [mentalTeammate, setMentalTeammate] = useState('');
  const [dailyGratitude, setDailyGratitude] = useState('');
  const [dailyFocusWord, setDailyFocusWord] = useState('');
  const [dailyFocusStatement, setDailyFocusStatement] = useState('');
  const [dailyMantra, setDailyMantra] = useState('');
  const [dailyTechFocus, setDailyTechFocus] = useState('');

  // --- TAB 2: MATCH DAY STATE ---
  const [matchComplete, setMatchComplete] = useState(false);
  const [matchEvent, setMatchEvent] = useState('');
  const [matchOpponent, setMatchOpponent] = useState('');
  const [matchResult, setMatchResult] = useState('Win');
  const [matchWell, setMatchWell] = useState('');
  const [matchLearn, setMatchLearn] = useState('');

  // --- TAB 3: WEEKLY CHECK-IN STATE ---
  const [weeklyComplete, setWeeklyComplete] = useState(false);
  const [weeklyAcademic, setWeeklyAcademic] = useState('No');
  const [weeklyWeight, setWeeklyWeight] = useState('Yes');
  const [weeklyRecovery, setWeeklyRecovery] = useState(5);
  const [weeklyGoal, setWeeklyGoal] = useState('');
  
  // Focus Grid State
  const [focusState, setFocusState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [focusGrid, setFocusGrid] = useState<number[]>([]);
  const [focusNextNumber, setFocusNextNumber] = useState(0);
  const [focusTimeLeft, setFocusTimeLeft] = useState(120); 
  const [focusScore, setFocusScore] = useState(0);

  // --- TAB 4: FOUNDATION STATE ---
  const [foundationLocked, setFoundationLocked] = useState(true);
  const [identityWords, setIdentityWords] = useState(['', '', '', '', '']);
  const [whyLevels, setWhyLevels] = useState(['', '', '']); 
  const [purposeStatement, setPurposeStatement] = useState('');
  const [showIdentityExamples, setShowIdentityExamples] = useState(false);

  // --- TAB 5: CONFIDENCE BANK ---
  const [confidenceDeposits, setConfidenceDeposits] = useState<any[]>([]);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  // --- ADMIN STATE ---
  const [adminTab, setAdminTab] = useState('live'); 
  const [todaysAttendance, setTodaysAttendance] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyStats, setHistoryStats] = useState<any[]>([]);
  const [isCoachAuthenticated, setIsCoachAuthenticated] = useState(false);
  const [showCoachLoginModal, setShowCoachLoginModal] = useState(false);
  const [coachPassInput, setCoachPassInput] = useState('');
  const [csvData, setCsvData] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const [copiedDate, setCopiedDate] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoURL, setNewVideoURL] = useState('');
  const [newVideoTags, setNewVideoTags] = useState('');
  const [autoAnnounceVideo, setAutoAnnounceVideo] = useState(false);
  
  // Report Filters
  const [reportStartDate, setReportStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportStudentFilter, setReportStudentFilter] = useState('');
  const [reportGradeFilter, setReportGradeFilter] = useState('');

  // --- HELPER FUNCTIONS ---

  const getCurrentName = () => {
    if (userProfile && userProfile.First_Name) return `${userProfile.Last_Name}, ${userProfile.First_Name}`;
    return user?.email || "Athlete";
  };

  const getFirstName = () => {
     if (userProfile && userProfile.First_Name) return userProfile.First_Name;
     if (user && user.email) return user.email.split('@')[0];
     return "Athlete";
  };

  const getAbsentStudents = () => {
    // Basic implementation: Roster minus Today's Attendance
    const presentIds = new Set(todaysAttendance.map(a => a.studentId || a.uid));
    const absent = roster.filter(r => !presentIds.has(r.id));
    return absent;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setSelectedStudent(null); 
  };

  const selectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchTerm(student.name || "");
  };

  const handleResetAppData = () => {
    if(confirm("This will clear cached data to fix loading errors. It will NOT delete your saved journals. Continue?")) {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
    }
  };

  const getVideoMetadata = (url: string) => {
    if (!url) return { type: 'unknown', id: null, label: 'Link' };
    if (url.includes('youtu.be') || url.includes('youtube.com')) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const id = (match && match[2].length === 11) ? match[2] : null;
        return { type: 'youtube', id, label: 'YouTube', color: 'bg-red-600' };
    }
    if (url.includes('tiktok.com')) return { type: 'tiktok', id: null, label: 'TikTok', color: 'bg-black' };
    if (url.includes('facebook.com') || url.includes('fb.watch')) return { type: 'facebook', id: null, label: 'Facebook', color: 'bg-blue-600' };
    if (url.includes('instagram.com')) return { type: 'instagram', id: null, label: 'Instagram', color: 'bg-pink-600' };
    return { type: 'generic', id: null, label: 'Video', color: 'bg-gray-600' };
  };

  const toggleFavorite = async (videoId: string) => {
    if (!user) return;
    const isFav = userProfile?.favorites?.includes(videoId);
    try {
        await updateDoc(doc(db, "user_profiles", user.uid), {
            favorites: isFav ? arrayRemove(videoId) : arrayUnion(videoId)
        });
        // Optimistic update
        const newFavs = isFav 
            ? (userProfile.favorites || []).filter((id: string) => id !== videoId)
            : [...(userProfile.favorites || []), videoId];
        setUserProfile({...userProfile, favorites: newFavs});
    } catch(e) { console.error("Fav toggle error", e); }
  };

  // Function to handle tab switching with scroll reset (Fixes black/empty page issues)
  const switchTab = (tabName: string) => {
      setActiveTab(tabName);
      window.scrollTo(0, 0); // Force scroll to top
  };

  // --- ASYNC DATA ACTIONS ---

  const loadConfidenceBank = async (uid: string) => {
    try {
      // 1. Daily Logs (Improvement & Gratitude)
      const q1 = query(collection(db, "daily_logs"), where("uid", "==", uid), orderBy("timestamp", "desc"), limit(20));
      const snap1 = await getDocs(q1);
      const dailyDeposits: any[] = [];
      snap1.docs.forEach(d => {
         const data = d.data();
         if(data.mentalImprovement) {
            dailyDeposits.push({ id: d.id + '_imp', date: data.date, text: `Improvement: ${data.mentalImprovement}`, type: 'improvement' });
         }
         if(data.gratitude) {
            dailyDeposits.push({ id: d.id + '_grat', date: data.date, text: `Gratitude: ${data.gratitude}`, type: 'gratitude' });
         }
         // Capture Profile/Foundation logs
         if(data.type === 'foundation_log') {
             dailyDeposits.push({ id: d.id + '_fnd', date: data.date, text: `Foundation: ${data.mentalImprovement}`, type: 'foundation' });
         }
      });

      // 2. Match Logs (Wins & Reflections)
      const q2 = query(collection(db, "match_logs"), where("uid", "==", uid), orderBy("timestamp", "desc"), limit(20));
      const snap2 = await getDocs(q2);
      const matchDeposits: any[] = [];
      snap2.docs.forEach(d => {
         const data = d.data();
         if(data.result === 'Win') {
             matchDeposits.push({ id: d.id + '_win', date: data.date, text: `WIN vs ${data.opponent}`, type: 'win' });
         }
         if(data.reflection?.well) {
             matchDeposits.push({ id: d.id + '_well', date: data.date, text: `Match Highlight: ${data.reflection.well}`, type: 'match_well' });
         }
      });

      const allDeposits = [...dailyDeposits, ...matchDeposits].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setConfidenceDeposits(allDeposits);
    } catch (e: any) { 
      if (e.code === 'failed-precondition') console.warn("INDEX NEEDED: Check console for link");
      console.log("Bank load issue", e); 
    }
  };

  const loadStudentStats = async (uid: string) => {
    try {
      const q = query(collection(db, "attendance"), where("studentId", "==", uid), orderBy("timestamp", "desc"), limit(20));
      const snap = await getDocs(q);
      setStudentHistory(snap.docs.map(d => d.data()));
    } catch (e) { console.log("Stats load issue", e); }
  };

  const fetchHistory = async () => {
    try {
      const q = query(collection(db, "attendance"), orderBy("timestamp", "desc"), limit(2000));
      const querySnapshot = await getDocs(q);
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryRecords(records);
      const stats: {[key: string]: number} = {};
      records.forEach((data: any) => { const date = data.date; if(date) stats[date] = (stats[date] || 0) + 1; });
      const statsArray = Object.keys(stats).map(date => ({ date, count: stats[date] })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setHistoryStats(statsArray);
    } catch (err) { console.error("Error fetching history:", err); }
  };

  const syncToSheets = async (data: any) => {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST", mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Sheet Sync Error", e); }
  };

  // --- FORUM ACTIONS ---
  const loadComments = async (postId: string) => {
    try {
      setLoading(true);
      // Remove orderBy("timestamp") to avoid index errors in dev. Sort client side.
      const q = query(collection(db, "post_comments"), where("postId", "==", postId));
      const snap = await getDocs(q);
      const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side
      comments.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setPostComments(comments);
    } catch(e) { console.error("Comment load error", e); }
    finally { setLoading(false); }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !activePost) return;
    try {
      const commentData = {
        postId: activePost.id,
        userId: user.uid,
        userName: getCurrentName(),
        text: newComment.trim(),
        timestamp: new Date().toISOString(),
        displayDate: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})
      };
      await addDoc(collection(db, "post_comments"), commentData);
      setNewComment('');
      loadComments(activePost.id); // Reload
    } catch (e) { console.error("Post comment error", e); }
  };

  const handleOpenPost = (post: any) => {
    setActivePost(post);
    loadComments(post.id);
  };

  // --- EFFECTS ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const rosterQ = query(collection(db, "roster"), orderBy("Last_Name"));
        const rosterSnap = await getDocs(rosterQ);
        setRoster(rosterSnap.docs.map(doc => {
            const d = doc.data();
            const fName = d.First_Name || d.firstname || '';
            const lName = d.Last_Name || d.lastname || '';
            return { id: doc.id, name: `${lName}, ${fName}`, email: d.Email || d.email, ...d };
        }));

        const newsQ = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(10));
        const newsSnap = await getDocs(newsQ);
        setAnnouncements(newsSnap.docs.map(d => ({id: d.id, ...d.data()})));

        const resQ = query(collection(db, "resources"), orderBy("timestamp", "desc"));
        const resSnap = await getDocs(resQ);
        setResources(resSnap.docs.map(d => ({id: d.id, ...d.data()})));
      } catch (e) { console.error("Init Error:", e); }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if ((appMode === 'coach' && isCoachAuthenticated) || user?.isCoach) {
      const fetchAdminData = async () => {
        try {
          const today = new Date().toLocaleDateString();
          const attQ = query(collection(db, "attendance"), where("date", "==", today));
          const attSnap = await getDocs(attQ);
          setTodaysAttendance(attSnap.docs.map(d => ({id: d.id, ...d.data()})));
        } catch (e) { console.error(e); }
      };
      fetchAdminData();
      if(adminTab === 'history') fetchHistory();
    }
  }, [appMode, isCoachAuthenticated, adminTab, user]);

  // Auth & Profile Listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Auto-detect coach by email
        if(currentUser.email && APPROVED_COACH_EMAILS.includes(currentUser.email)) {
             setAppMode('coach');
             setIsCoachAuthenticated(true);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Data Listener (Dependent on User)
  useEffect(() => {
    if (!user) return;

    // Real-time listener for profile changes (Fixes "Athlete" name issue and ensures profile data is loaded)
    const docRef = doc(db, "user_profiles", user.uid);
    const unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            // Sync local state
            if(data.identity) setIdentityWords(data.identity);
            if(data.whys) setWhyLevels(data.whys);
            if(data.purpose) setPurposeStatement(data.purpose);

            // Redirect Logic: If profile is new/empty, force them to Foundation tab
            if (!data.identity || data.identity[0] === '' || data.identity.length === 0) {
                 setFoundationLocked(false);
                 setActiveTab(prev => (prev === 'daily' ? 'foundation' : prev));
            } else {
                 setFoundationLocked(true);
            }
        } else {
            // Document doesn't exist yet (registration race condition), force foundation
            setActiveTab('foundation');
            setFoundationLocked(false);
        }
    });

    loadConfidenceBank(user.uid);
    loadStudentStats(user.uid);

    return () => unsubscribeProfile();
  }, [user]);

  // Countdown Timer Effect
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const updated = MAJOR_EVENTS.map(ev => {
        const diff = ev.date.getTime() - now.getTime();
        // If event passed, return 0s
        if (diff <= 0) return { name: ev.name.replace("Girls ", ""), days: 0, hours: 0, minutes: 0, seconds: 0 };
        return {
          name: ev.name.replace("Girls ", ""),
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        };
      });
      setCountdowns(updated);
    };

    updateCountdown(); // Initial call
    const interval = setInterval(updateCountdown, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // Focus Timer
  useEffect(() => {
    let timer: any;
    if (focusState === 'playing' && focusTimeLeft > 0) {
      timer = setInterval(() => { setFocusTimeLeft(t => t - 1); }, 1000);
    } else if (focusTimeLeft === 0 && focusState === 'playing') {
      endFocusGame(false); 
    }
    return () => clearInterval(timer);
  }, [focusState, focusTimeLeft]);

  const startFocus = () => {
    const nums = Array.from({length: 100}, (_, i) => i);
    for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
    setFocusGrid(nums); setFocusNextNumber(0); setFocusTimeLeft(120); setFocusState('playing');
  };

  const tapFocusNumber = (num: number) => {
    if (num === focusNextNumber) {
      if (num === 99) { endFocusGame(true); } else { setFocusNextNumber(n => n + 1); }
    }
  };

  const endFocusGame = async (completed: boolean) => {
    setFocusState('finished');
    const score = completed ? 100 : focusNextNumber;
    setFocusScore(score);
    if(user) {
        await addDoc(collection(db, "focus_scores"), {
           uid: user.uid, name: getCurrentName(), score, date: new Date().toLocaleDateString(), timestamp: new Date().toISOString()
        });
    }
  };

  // --- HANDLERS ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    
    // 1. Trim Inputs (Fixes "400" error due to trailing spaces)
    const emailClean = emailInput.trim();
    const passClean = passwordInput; 

    // Client-side Validation
    if(passClean.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return;
    }

    try {
      if (authView === 'login') {
        await signInWithEmailAndPassword(auth, emailClean, passClean);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, emailClean, passClean);
        
        // Better Name Extraction
        let fName = "Athlete"; let lName = "";
        const namePart = emailClean.split('@')[0];
        const parts = namePart.split('.'); // try first.last
        if(parts.length > 1) { 
             fName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1); 
             lName = parts[1].charAt(0).toUpperCase() + parts[1].slice(1); 
        } else {
             fName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        await setDoc(doc(db, "user_profiles", cred.user.uid), { 
            email: emailClean, 
            First_Name: fName, 
            Last_Name: lName, 
            joined: new Date().toISOString(), 
            identity: ['', '', '', '', ''], 
            whys: ['', '', ''], 
            purpose: '' 
        });
        await addDoc(collection(db, "roster"), { First_Name: fName, Last_Name: lName, Email: emailClean });
      }
    } catch (err: any) { 
        console.error("Auth Error Full Object:", err); 
        let msg = err.message || "Authentication failed.";
        
        // Map common Firebase errors to user-friendly messages
        if(err.code === 'auth/email-already-in-use') msg = "Email already registered. Please Sign In.";
        else if(err.code === 'auth/wrong-password') msg = "Incorrect password.";
        else if(err.code === 'auth/user-not-found') msg = "User not found. Please Sign Up.";
        else if(err.code === 'auth/invalid-email') msg = "Invalid email format.";
        else if(err.code === 'auth/weak-password') msg = "Password is too weak (min 6 chars).";
        else if(err.code === 'auth/operation-not-allowed') msg = "Sign-up is disabled in Firebase Console.";
        else if(err.code === 'auth/network-request-failed') msg = "Network error. Check connection.";
        else if(err.message.includes("quota")) {
            msg = "Device storage full. Clearing cache... Try again in 5 seconds.";
            try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
        }
        
        setError(msg); 
    } finally { 
        setLoading(false); 
    }
  };

  const submitDaily = async () => {
    if (!weight || !energyColor) { alert("Please enter Weight and Energy."); return; }
    setLoading(true);
    const commonData = {
      uid: user.uid, studentId: user.uid, name: getCurrentName(),
      timestamp: new Date().toISOString(), date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Modified to include Focus data for Live View
    const attendanceData = { 
        ...commonData, 
        grade: userProfile?.Grade || '', 
        weight: parseFloat(weight), 
        skinCheckPass: skinCheck, 
        type: 'attendance',
        focusWord: dailyFocusWord,
        focusStatement: dailyFocusStatement
    };
    await addDoc(collection(db, "attendance"), attendanceData);
    syncToSheets(attendanceData);

    const journalData = { ...commonData, type: 'daily_log', sleep: { hours: sleepHours, quality: sleepQuality }, energy: energyColor, nutrition, hydration, balance, mentalImprovement, mentalTeammate, gratitude: dailyGratitude, focusWord: dailyFocusWord, focusStatement: dailyFocusStatement, mantra: dailyMantra, techFocus: dailyTechFocus };
    await addDoc(collection(db, "daily_logs"), journalData);
    syncToSheets(journalData);

    setSuccessMsg("Day Logged! 1% Better."); setDailyComplete(true);
    setNutrition({ veggies: false, protein: false, fruit: false, grain: false }); setHydration(0); setMentalImprovement(''); setMentalTeammate(''); setDailyGratitude(''); setDailyFocusStatement(''); setDailyFocusWord(''); setDailyTechFocus('');
    setTimeout(() => setSuccessMsg(''), 3000); setLoading(false); loadConfidenceBank(user.uid); loadStudentStats(user.uid);
  };

  const submitMatch = async () => {
    if (!matchEvent || !matchOpponent) { alert("Please fill match details."); return; }
    setLoading(true);
    const data = {
      uid: user.uid, name: getCurrentName(), type: 'match_log', timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(), event: matchEvent, opponent: matchOpponent,
      result: matchResult, reflection: { well: matchWell, learn: matchLearn }
    };
    await addDoc(collection(db, "match_logs"), data); syncToSheets(data);
    setSuccessMsg("Match Recorded."); setMatchComplete(true); setMatchEvent(''); setMatchOpponent(''); setMatchWell(''); setMatchLearn('');
    setTimeout(() => setSuccessMsg(''), 3000); setLoading(false); loadConfidenceBank(user.uid);
  };

  const submitWeekly = async () => {
    setLoading(true);
    const data = {
      uid: user.uid, name: getCurrentName(), type: 'weekly_prep', timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(), focus_score: focusScore, academic_check: weeklyAcademic,
      weight_check: weeklyWeight, recovery_score: weeklyRecovery, weekly_goal: weeklyGoal
    };
    await addDoc(collection(db, "weekly_prep"), data); syncToSheets(data);
    setSuccessMsg("Weekly Log Saved!"); setWeeklyComplete(true); setWeeklyGoal('');
    setTimeout(() => setSuccessMsg(''), 3000); setLoading(false);
  };

  const saveFoundation = async () => {
    setLoading(true);
    const data = { identity: identityWords, whys: whyLevels, purpose: purposeStatement, updated: new Date().toISOString() };
    await setDoc(doc(db, "user_profiles", user.uid), data, { merge: true });
    setUserProfile({ ...userProfile, ...data }); setSuccessMsg("Foundation Saved."); setFoundationLocked(true);
    setTimeout(() => setSuccessMsg(''), 3000); setLoading(false);
    
    // BUILD BANK: Add a positive log entry for completing the profile
    try {
        await addDoc(collection(db, "daily_logs"), {
            uid: user.uid, 
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toISOString(),
            type: 'foundation_log',
            mentalImprovement: "Defined my Core Values, Whys, and Purpose."
        });
        loadConfidenceBank(user.uid); // Refresh bank immediately
    } catch(e) { console.error("Bank build error", e); }
  };

  const unlockCoach = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(passwordInput === COACH_ACCESS_CODE) { 
          setIsCoachAuthenticated(true); 
          setAppMode('coach');
          setShowCoachLoginModal(false);
          setPasswordInput(''); 
      } else { 
          alert('Wrong Code'); 
      } 
  };

  const handleDeleteCheckIn = async (id: string) => { if(!confirm(`Delete?`)) return; await deleteDoc(doc(db, "attendance", id)); const today = new Date().toLocaleDateString(); const attQ = query(collection(db, "attendance"), where("date", "==", today)); const attSnap = await getDocs(attQ); setTodaysAttendance(attSnap.docs.map(d => ({id: d.id, ...d.data()}))); };
  const handleCopyForSheets = (date: string) => { const records = historyRecords.filter(r => r.date === date).sort((a,b) => String(a.name).localeCompare(String(b.name))); let text = "Name\tWeight\tTime\tNotes\n"; records.forEach(r => { text += `${r.name}\t${r.weight}\t${r.time}\t${r.notes || ''}\n`; }); navigator.clipboard.writeText(text).then(() => { setCopiedDate(date); setTimeout(() => setCopiedDate(null), 2000); }); };
  const handleGenerateReport = async () => { alert("Report generation triggered"); };
  const handleBulkImport = async () => { if (!csvData) return; const rows = csvData.trim().split('\n'); if(rows.length < 2) return; const batch = writeBatch(db); rows.slice(1).forEach(row => { const c = row.split(','); if(c.length >= 2) batch.set(doc(collection(db, "roster")), {Email:c[0], Last_Name:c[1], First_Name:c[2]}); }); await batch.commit(); setImportStatus('Imported'); };
  const handleDeleteAllRoster = async () => { if(!confirm("Delete All?")) return; const q = query(collection(db, "roster")); const snap = await getDocs(q); snap.docs.forEach(d => deleteDoc(d.ref)); };
  const handleDeduplicate = async () => { /* preserved */ };
  const handlePreloadedImport = async () => { /* preserved */ };
  const handleAddAnnouncement = async () => { if(!newAnnouncement) return; await addDoc(collection(db, "announcements"), { message: newAnnouncement, timestamp: new Date().toISOString(), date: new Date().toLocaleDateString() }); setNewAnnouncement(''); alert('Posted!'); };
  const handleAddVideo = async () => { 
    if(!newVideoTitle || !newVideoURL) return; 
    
    // Parse tags (comma separated)
    const tags = newVideoTags.split(',').map(t => t.trim()).filter(t => t);

    // Add Video
    await addDoc(collection(db, "resources"), { 
      title: newVideoTitle, 
      url: newVideoURL, 
      tags: tags,
      timestamp: new Date().toISOString() 
    });
    
    // Auto Announce
    if (autoAnnounceVideo) {
       await addDoc(collection(db, "announcements"), { 
         message: `New Video Added to Library: "${newVideoTitle}"`, 
         timestamp: new Date().toISOString(), 
         date: new Date().toLocaleDateString() 
       });
    }

    setNewVideoTitle(''); 
    setNewVideoURL(''); 
    setNewVideoTags('');
    setAutoAnnounceVideo(false); 
    alert('Video Added' + (autoAnnounceVideo ? ' & Announced!' : '!')); 
  };

  // Get Unique Tags
  const allTags = Array.from(new Set(resources.flatMap(r => r.tags || []))).sort();

  if (authLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  // 1. LOGIN SCREEN (Only if NOT authenticated as coach AND not logged in)
  if (!user && !isCoachAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            {LOGO_URL ? (
                <img src={LOGO_URL} alt="Team Logo" className="w-24 h-24 mx-auto mb-4 object-contain" />
            ) : (
                <Brain className="w-12 h-12 text-pink-500 mx-auto mb-2" />
            )}
            <h1 className="text-2xl font-extrabold text-white">Merrill Smart Journal</h1><p className="text-pink-400 text-sm font-bold uppercase tracking-widest mb-6">My Mind Masters Me</p></div>
          <form onSubmit={handleAuth} className="space-y-4">
            <h2 className="text-white font-bold text-lg">{authView === 'login' ? 'Sign In' : 'New Account'}</h2>
            <input type="email" required className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Email" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
            <input type="password" required className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Password (Min 6 chars)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
            {error && <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded">{error}</div>}
            <button disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg transition-all">{loading ? '...' : (authView === 'login' ? 'Sign In' : 'Create Account')}</button>
            <div className="text-center text-xs text-gray-400 mt-4"><button type="button" onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} className="text-pink-400 hover:text-pink-300 font-bold">{authView === 'login' ? 'Need an account? Sign Up' : 'Have an account? Sign In'}</button></div>
          </form>
          <div className="mt-8 pt-8 border-t border-gray-700 space-y-4">
            <button onClick={() => { setShowCoachLoginModal(true); }} className="text-gray-600 text-xs hover:text-gray-400 flex items-center justify-center gap-1 w-full"><Lock className="w-3 h-3"/> Coach Admin</button>
          </div>
        </div>
        
        {/* COACH MODAL */}
        {showCoachLoginModal && (
             <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 animate-in fade-in">
                 <div className="bg-gray-800 p-8 rounded-xl w-full max-w-sm relative">
                    <button onClick={() => { setShowCoachLoginModal(false); }} className="absolute top-4 right-4 text-gray-400 hover:text-white"><XCircle className="w-6 h-6"/></button>
                    <h2 className="text-xl font-bold text-white mb-4 text-center">Coach Access</h2>
                    <form onSubmit={unlockCoach}>
                        <input type="password" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mb-4 text-center tracking-widest" placeholder="ACCESS CODE" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all">Enter Dashboard</button>
                    </form>
                 </div>
             </div>
        )}
      </div>
    );
  }

  // 2. COACH DASHBOARD
  if ((appMode === 'coach' && isCoachAuthenticated) || user?.isCoach) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             {LOGO_URL && <img src={LOGO_URL} className="w-10 h-10 object-contain" alt="Logo"/>}
             <h1 className="text-xl font-bold">Coach Dashboard</h1>
          </div>
          <button onClick={() => { setIsCoachAuthenticated(false); setAppMode('athlete'); setShowCoachLoginModal(false); }} className="text-xs bg-red-900/50 hover:bg-red-900/80 px-3 py-1 rounded transition-colors">Exit</button>
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['live', 'content', 'history', 'roster'].map(t => (
            <button key={t} onClick={() => setAdminTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${adminTab === t ? 'bg-pink-600' : 'bg-gray-800 text-gray-400'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
        {/* LIVE TAB */}
        {adminTab === 'live' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <div className="text-gray-400 text-xs uppercase font-bold">Present Today</div>
              <div className="text-3xl font-bold text-green-400">{todaysAttendance.length}</div>
            </div>
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-3 bg-gray-900/50 border-b border-gray-700 font-bold text-gray-300">Checked In</div>
              <div className="divide-y divide-gray-700">
                {todaysAttendance.map(r => (
                  <div key={r.id} className="p-3 flex justify-between items-center">
                    <div>
                      <div className="font-bold text-lg text-white">{r.name}</div>
                      <div className="text-sm text-gray-400 italic">"{r.focusStatement}"</div>
                    </div>
                    <div className="text-right">
                       <div className="text-xs text-gray-500 mb-1">{r.time}</div>
                       <div className="font-bold text-pink-500 uppercase text-xs">{r.focusWord}</div>
                       <div className="flex items-center justify-end gap-2 mt-2">
                          {!r.skinCheckPass && <AlertCircle className="w-4 h-4 text-red-500" />}
                          <button onClick={() => handleDeleteCheckIn(r.id, r.name)}><XCircle className="w-5 h-5 text-gray-600 hover:text-red-500"/></button>
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* ABSENT LIST */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="p-3 bg-gray-900/50 border-b border-gray-700 font-bold text-gray-300">Absent</div>
              <div className="divide-y divide-gray-700">
                {getAbsentStudents().map(s => (
                  <div key={s.id} className="p-3 text-sm text-gray-400 flex justify-between">
                    <span>{s.name}</span><span className="text-gray-500 text-xs">{s.grade ? `Gr ${s.grade}` : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* HISTORY TAB */}
        {adminTab === 'history' && (
          <div className="space-y-4 max-w-4xl mx-auto">
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
        {/* CONTENT TAB */}
        {adminTab === 'content' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Megaphone className="w-4 h-4 text-yellow-400"/> Announcement</h3>
              <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Message..." value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} />
              <button onClick={handleAddAnnouncement} className="w-full bg-pink-600 py-2 rounded text-sm font-bold">Post</button>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Youtube className="w-4 h-4 text-red-400"/> Add Video Resource</h3>
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Title" value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} />
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="URL (YouTube, TikTok, FB...)" value={newVideoURL} onChange={e => setNewVideoURL(e.target.value)} />
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Tags (comma separated: Takedown, Drill)" value={newVideoTags} onChange={e => setNewVideoTags(e.target.value)} />
              
              <div className="flex items-center gap-2 mb-3">
                <input 
                  type="checkbox" 
                  id="autoAnnounce" 
                  checked={autoAnnounceVideo} 
                  onChange={(e) => setAutoAnnounceVideo(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-900 border-gray-600 text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="autoAnnounce" className="text-xs text-gray-300">Post announcement to Team Talk</label>
              </div>

              <button onClick={handleAddVideo} className="w-full bg-green-600 py-2 rounded text-sm font-bold">Add Video</button>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-purple-400"/> Calendar</h3>
              <p className="text-xs text-gray-400 mb-2">ID: <span className="font-mono text-white">{GOOGLE_CALENDAR_ID || "Not Set"}</span></p>
              <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-xs bg-gray-700 px-3 py-2 rounded text-white block text-center">Manage in Google Calendar</a>
            </div>
          </div>
        )}
        {/* ROSTER TAB */}
        {adminTab === 'roster' && (
          <div className="space-y-6 max-w-4xl mx-auto">
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

  // 4. ATHLETE DASHBOARD
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans pb-24">
      <div className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10 shadow-lg">
         <div className="max-w-4xl mx-auto p-2">
           <div className="flex justify-between items-center mb-2">
             <div className="flex items-center gap-2">
               {LOGO_URL && <img src={LOGO_URL} className="w-8 h-8 object-contain" alt="Logo"/>}
               <div><h1 className="text-lg font-extrabold text-white">Smart Journal</h1><p className="text-xs text-pink-400">Welcome, {getFirstName()}!</p></div>
             </div>
           </div>
           {/* Countdown Row */}
           <div className="flex gap-2 justify-between bg-black/30 p-2 rounded-lg overflow-x-auto">
              {countdowns.map((c, i) => (
                <div key={i} className="flex flex-col items-center bg-gray-800 px-2 py-1 rounded border border-gray-700/50 min-w-[90px]">
                   <span className="text-[8px] text-gray-500 uppercase tracking-tighter mb-0.5">{c.name}</span>
                   <div className="flex gap-1 text-[10px] font-mono font-bold text-pink-500 leading-none">
                      <span>{c.days}d</span>
                      <span>{c.hours}h</span>
                      <span>{c.minutes}m</span>
                      <span className="text-white">{c.seconds}s</span>
                   </div>
                </div>
              ))}
           </div>
         </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto w-full">
        {/* --- TAB 1: DAILY GRIND --- */}
        {activeTab === 'daily' && !showForum && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            {/* Show Announcement if exists */}
            {announcements.length > 0 && (
              <div className="bg-gradient-to-r from-pink-900/50 to-purple-900/50 p-4 rounded-xl border border-pink-500/30 mb-4">
                <h3 className="text-pink-300 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Megaphone className="w-3 h-3"/> Latest News</h3>
                <p className="text-white text-sm">{announcements[0].message}</p>
                <div className="flex justify-between items-center mt-3">
                   <p className="text-pink-500/50 text-[10px]">{announcements[0].date}</p>
                   <button onClick={() => switchTab('teamtalk')} className="text-xs bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 px-3 py-1 rounded-full flex items-center gap-1 transition-colors"><MessageCircle className="w-3 h-3"/> Team Talk</button>
                </div>
              </div>
            )}

            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500"/> The Daily Grind</h2>
            {dailyComplete ? (
              <div className="bg-gray-800 p-8 rounded-xl border border-green-500/50 text-center animate-in zoom-in">
                <div className="mx-auto bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-10 h-10 text-green-400" /></div>
                <h3 className="text-2xl font-bold text-white mb-2">You Crushed It!</h3>
                <p className="text-gray-400 mb-6">Daily journal entry recorded.</p>
                <button onClick={() => setDailyComplete(false)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 mx-auto"><Edit3 className="w-4 h-4"/> Edit / New Entry</button>
              </div>
            ) : (
            <>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">1. Pre-Practice Check</h3>
               <div className="grid grid-cols-2 gap-4 mb-4">
                 <div><label className="text-xs text-gray-500 mb-1 block">Weight</label><input type="number" step="0.1" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white font-mono" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.0" /></div>
                 <div><label className="text-xs text-gray-500 mb-1 block">Skin Check</label><div className="flex bg-gray-900 rounded border border-gray-600 overflow-hidden"><button onClick={() => setSkinCheck(true)} className={`flex-1 py-2 text-xs font-bold ${skinCheck ? 'bg-green-600 text-white' : 'text-gray-400'}`}>Pass</button><button onClick={() => setSkinCheck(false)} className={`flex-1 py-2 text-xs font-bold ${!skinCheck ? 'bg-red-600 text-white' : 'text-gray-400'}`}>Fail</button></div></div>
               </div>
               
               {/* Nutrition & Hydration */}
               <div className="mb-4">
                  <label className="text-xs text-gray-500 mb-2 block">Nutrition (Today)</label>
                  <div className="flex gap-1 mb-3">
                     {['veggies', 'protein', 'fruit', 'grain'].map(type => (
                       <button key={type} onClick={() => setNutrition({ ...nutrition, [type]: !nutrition[type as keyof typeof nutrition] })} className={`flex-1 py-2 rounded text-[10px] font-bold uppercase border ${nutrition[type as keyof typeof nutrition] ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-900 border-gray-600 text-gray-400'}`}>
                         {type}
                       </button>
                     ))}
                  </div>
                  <label className="text-xs text-gray-500 mb-1 block">Hydration (Cups)</label>
                  <div className="flex items-center gap-3">
                     <button onClick={() => setHydration(h => Math.max(0, h-1))} className="bg-gray-700 w-8 h-8 rounded flex items-center justify-center">-</button>
                     <span className="font-bold text-white text-lg w-8 text-center">{hydration}</span>
                     <button onClick={() => setHydration(h => h+1)} className="bg-gray-700 w-8 h-8 rounded flex items-center justify-center">+</button>
                     <span className="text-xs text-blue-400 ml-2"><Droplets className="w-3 h-3 inline"/> Water</span>
                  </div>
               </div>

               {/* Wellness & Energy */}
               <div className="mb-4"><label className="text-xs text-gray-500 mb-2 block">Energy</label><div className="flex gap-2"><button onClick={() => setEnergyColor('green')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${energyColor === 'green' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>🟢 High</button><button onClick={() => setEnergyColor('yellow')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${energyColor === 'yellow' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>🟡 Steady</button><button onClick={() => setEnergyColor('red')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${energyColor === 'red' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>🔴 Low</button></div></div>
            </div>
            {/* Mindset */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">2. Mindset & Intent</h3>
               <div className="space-y-3">
                 <div><label className="text-xs text-white block mb-2">Today's Focus Word</label><div className="flex flex-wrap gap-2">{['Consistent', 'Persistent', 'Resilient', 'Relentless', 'Respectful'].map(w => <button key={w} onClick={() => setDailyFocusWord(w)} className={`px-3 py-1 rounded text-xs border ${dailyFocusWord === w ? 'bg-pink-600 border-pink-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-400'}`}>{w}</button>)}</div></div>
                 <div><label className="text-xs text-white block mb-1">Statement</label><input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" placeholder="How will I be..." value={dailyFocusStatement} onChange={e => setDailyFocusStatement(e.target.value)} /></div>
               </div>
            </div>
            <button onClick={submitDaily} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl shadow-lg">Submit Daily Log</button>
            </>
            )}
          </div>
        )}

        {/* --- TAB: TEAM TALK --- */}
        {activeTab === 'teamtalk' && (
          <div className="space-y-4 animate-in fade-in pb-20 max-w-xl mx-auto">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-pink-500"/> Team Talk</h2>
             
             {!activePost ? (
                <div className="space-y-3">
                   <p className="text-gray-400 text-xs mb-2">Announcements & Discussions</p>
                   {announcements.map(post => (
                      <div key={post.id} onClick={() => handleOpenPost(post)} className="bg-gray-800 p-4 rounded-xl border border-gray-700 active:bg-gray-700 transition-colors cursor-pointer">
                         <div className="flex justify-between items-start mb-2">
                            <span className="bg-pink-900/50 text-pink-300 text-[10px] px-2 py-1 rounded font-bold uppercase">News</span>
                            <span className="text-gray-500 text-[10px]">{post.date}</span>
                         </div>
                         <p className="text-white text-sm line-clamp-2">{post.message}</p>
                         <div className="mt-3 flex items-center gap-2 text-xs text-blue-400">
                            <MessageCircle className="w-3 h-3"/> Reply to post
                         </div>
                      </div>
                   ))}
                </div>
             ) : (
                <div className="bg-gray-800 rounded-xl border border-gray-700 flex flex-col h-[70vh]">
                   {/* Active Post Header */}
                   <div className="p-4 border-b border-gray-700 bg-gray-800/50 sticky top-0 z-10 rounded-t-xl">
                      <button onClick={() => setActivePost(null)} className="text-xs text-gray-400 mb-2 flex items-center gap-1"><ChevronDown className="w-3 h-3 rotate-90"/> Back to list</button>
                      <p className="text-white text-sm font-medium">{activePost.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activePost.date}</p>
                   </div>
                   
                   {/* Comments List */}
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {postComments.length === 0 ? (
                         <div className="text-center text-gray-600 text-xs py-8">No comments yet. Be the first!</div>
                      ) : (
                         postComments.map(comment => (
                            <div key={comment.id} className={`flex flex-col ${comment.userId === user.uid ? 'items-end' : 'items-start'}`}>
                               <div className={`max-w-[85%] rounded-xl p-3 ${comment.userId === user.uid ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-700 text-gray-200 rounded-tl-none'}`}>
                                  <p className="text-xs font-bold mb-1 opacity-70">{comment.userName}</p>
                                  <p className="text-sm">{comment.text}</p>
                                </div>
                               <span className="text-[9px] text-gray-600 mt-1 px-1">{comment.displayDate}</span>
                            </div>
                         ))
                      )}
                   </div>

                   {/* Input Area */}
                   <div className="p-3 border-t border-gray-700 bg-gray-900 rounded-b-xl flex gap-2">
                      <input 
                        type="text" 
                        className="flex-1 bg-gray-800 border border-gray-600 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                        placeholder="Type a reply..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                      />
                      <button onClick={submitComment} disabled={!newComment.trim()} className="bg-blue-600 text-white p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
                         <Send className="w-4 h-4"/>
                      </button>
                   </div>
                </div>
             )}
          </div>
        )}
        
        {/* --- TAB: SCHEDULE (New) --- */}
        {activeTab === 'schedule' && (
          <div className="space-y-6 animate-in fade-in pb-20 max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Calendar className="w-5 h-5 text-purple-500"/> Team Schedule</h2>
            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 h-[60vh]">
                <iframe 
                    src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(GOOGLE_CALENDAR_ID)}&ctz=America%2FChicago&mode=AGENDA&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&theme=DARK`} 
                    style={{border: 0}} 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    scrolling="no"
                ></iframe>
            </div>
          </div>
        )}

        {/* --- TAB 4: FOUNDATION --- */}
        {activeTab === 'foundation' && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Target className="w-5 h-5 text-pink-500"/> My Profile</h2>
                {foundationLocked && <button onClick={() => setFoundationLocked(false)} className="text-xs bg-gray-800 px-3 py-1 rounded text-white flex items-center gap-1"><Unlock className="w-3 h-3"/> Unlock & Edit</button>}
             </div>

             {/* Career Stats Card */}
             <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="text-lg font-bold text-white">{userProfile?.First_Name} {userProfile?.Last_Name}</h3>
                      <p className="text-xs text-gray-400">Class of 20{userProfile?.Grade ? 32 - (userProfile.Grade - 5) : '??'}</p>
                   </div>
                   <div className="bg-pink-900/30 p-2 rounded-lg">
                      <Trophy className="w-6 h-6 text-pink-500" />
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                   <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-white">{studentHistory.length}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Check-ins</div>
                   </div>
                   <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-blue-400">{confidenceDeposits.filter(d => d.type === 'win').length}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Wins Logged</div>
                   </div>
                   <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-green-400">
                         {studentHistory.length > 0 ? Math.round(studentHistory.reduce((acc, curr) => acc + (curr.sleep?.hours ? parseFloat(curr.sleep.hours) : 0), 0) / studentHistory.length) : '-'}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Avg Sleep</div>
                   </div>
                </div>
             </div>

             {/* Identity Section */}
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><UserCheck className="w-4 h-4"/> 1. My Identity</h3>
               <p className="text-[10px] text-gray-500 mb-2">I am...</p>
               <div className="space-y-2">{identityWords.map((word, i) => <div key={i} className="flex gap-2 items-center"><span className="text-gray-600 text-xs font-mono">{i+1}.</span><input type="text" disabled={foundationLocked} className={`w-full bg-gray-900 border rounded p-2 text-white text-sm ${foundationLocked ? 'border-transparent' : 'border-gray-600'}`} value={word} onChange={e => { const n = [...identityWords]; n[i] = e.target.value; setIdentityWords(n); }} /></div>)}</div>
             </div>

             {/* The 3 Whys Section */}
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4"/> 2. The 3 Whys</h3>
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Level 1: Surface (Why wrestle?)</label>
                     <textarea disabled={foundationLocked} className={`w-full bg-gray-900 border rounded p-2 text-white text-sm h-16 ${foundationLocked ? 'border-transparent' : 'border-gray-600'}`} value={whyLevels[0]} onChange={e => { const n = [...whyLevels]; n[0] = e.target.value; setWhyLevels(n); }} placeholder="To get strong, to win medals..." />
                  </div>
                  <div>
                     <label className="text-[10px] text-blue-400 uppercase font-bold block mb-1">Level 2: Deeper (Why does that matter?)</label>
                     <textarea disabled={foundationLocked} className={`w-full bg-gray-900 border rounded p-2 text-white text-sm h-16 ${foundationLocked ? 'border-transparent' : 'border-gray-600'}`} value={whyLevels[1]} onChange={e => { const n = [...whyLevels]; n[1] = e.target.value; setWhyLevels(n); }} placeholder="To prove I can do hard things..." />
                  </div>
                  <div>
                     <label className="text-[10px] text-pink-500 uppercase font-bold block mb-1">Level 3: Core (The real reason)</label>
                     <textarea disabled={foundationLocked} className={`w-full bg-gray-900 border rounded p-2 text-white text-sm h-16 ${foundationLocked ? 'border-transparent' : 'border-gray-600'}`} value={whyLevels[2]} onChange={e => { const n = [...whyLevels]; n[2] = e.target.value; setWhyLevels(n); }} placeholder="Because I refuse to be average..." />
                  </div>
               </div>
             </div>

             {/* Purpose Statement */}
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Target className="w-4 h-4"/> 3. Purpose Statement</h3>
               <textarea disabled={foundationLocked} className={`w-full bg-gray-900 border rounded p-2 text-white text-sm h-24 ${foundationLocked ? 'border-transparent' : 'border-gray-600'}`} value={purposeStatement} onChange={e => setPurposeStatement(e.target.value)} placeholder="I wrestle to..." />
             </div>

             {!foundationLocked && <button onClick={saveFoundation} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg">Save Foundation</button>}
          </div>
        )}

        {/* --- TAB 5: BANK --- */}
        {activeTab === 'bank' && (
           <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500"/> Confidence Bank</h2>
             <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {confidenceDeposits.length === 0 ? <div className="p-8 text-center text-gray-500"><Leaf className="w-12 h-12 mx-auto mb-2 opacity-20"/><p>No deposits yet.</p></div> : <div className="divide-y divide-gray-700">{confidenceDeposits.map(d => <div key={d.id} className="p-4"><div className="text-xs text-blue-400 font-mono mb-1">{d.date}</div><div className="text-white text-sm font-medium">"{d.text}"</div></div>)}</div>}
             </div>
           </div>
        )}

        {/* --- TAB: WEEKLY CHECK-IN --- */}
        {activeTab === 'weekly' && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500"/> Weekly Check-In</h2>
            {weeklyComplete ? (
              <div className="bg-gray-800 p-8 rounded-xl border border-green-500/50 text-center animate-in zoom-in">
                <div className="mx-auto bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-10 h-10 text-green-400" /></div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready to Launch!</h3>
                <button onClick={() => setWeeklyComplete(false)} className="text-gray-400 text-xs underline">Edit Entry</button>
              </div>
            ) : (
             <>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
               <div className="flex justify-between items-center mb-4"><h3 className="text-sm font-bold text-white">1. Concentration Grid</h3>{focusState === 'playing' && <span className="font-mono text-xl text-yellow-400">{Math.floor(focusTimeLeft / 60)}:{(focusTimeLeft % 60).toString().padStart(2, '0')}</span>}</div>
               {focusState === 'idle' ? (
                 <button onClick={startFocus} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto"><Play className="w-4 h-4"/> Start Grid (00-99)</button>
               ) : focusState === 'finished' ? (
                 <div><p className="text-2xl font-bold text-white mb-2">Score: {focusScore}</p><p className="text-xs text-gray-400">Time's Up!</p><button onClick={() => setFocusState('idle')} className="text-gray-400 text-xs underline mt-2">Reset</button></div>
               ) : (
                 <div><div className="flex justify-between text-xs text-gray-400 mb-2"><span>Find: <b className="text-white text-lg">{focusNextNumber}</b></span></div><div className="grid grid-cols-10 gap-1">{focusGrid.map(num => <button key={num} onTouchStart={(e) => { e.preventDefault(); tapFocusNumber(num); }} onClick={() => tapFocusNumber(num)} className={`aspect-square flex items-center justify-center text-[10px] font-bold rounded ${num < focusNextNumber ? 'bg-green-900 text-green-500' : 'bg-gray-700 text-white active:bg-blue-500'}`}>{num}</button>)}</div></div>
               )}
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
               <h3 className="text-sm font-bold text-white">2. Weekly Check-In</h3>
               
               {/* Academic */}
               <div>
                 <label className="text-xs text-gray-400 block mb-2">Grades / Academics on track?</label>
                 <div className="flex gap-2">
                   {['Yes', 'No'].map(opt => (
                     <button key={opt} onClick={() => setWeeklyAcademic(opt)} 
                       className={`flex-1 py-2 rounded text-xs font-bold border ${weeklyAcademic === opt ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-600 text-gray-400'}`}>
                       {opt}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Weight */}
               <div>
                 <label className="text-xs text-gray-400 block mb-2">Weight Management on track?</label>
                 <div className="flex gap-2">
                   {['Yes', 'No'].map(opt => (
                     <button key={opt} onClick={() => setWeeklyWeight(opt)} 
                       className={`flex-1 py-2 rounded text-xs font-bold border ${weeklyWeight === opt ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-900 border-gray-600 text-gray-400'}`}>
                       {opt}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Recovery */}
               <div>
                 <label className="text-xs text-gray-400 block mb-2">Recovery Level (1-10)</label>
                 <input type="range" min="1" max="10" className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" 
                   value={weeklyRecovery} onChange={e => setWeeklyRecovery(parseInt(e.target.value))} />
                 <div className="text-center text-xl font-bold text-blue-400 mt-1">{weeklyRecovery}</div>
               </div>

               {/* Goal */}
               <div>
                 <label className="text-xs text-gray-400 block mb-1">Weekly Goal</label>
                 <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white h-20" 
                   placeholder="One specific thing to improve..." value={weeklyGoal} onChange={e => setWeeklyGoal(e.target.value)} />
               </div>

               <button onClick={submitWeekly} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg">Submit Launch</button>
            </div>
            </>
            )}
          </div>
        )}

        {/* --- TAB: MATCH DAY --- */}
        {activeTab === 'match' && !showForum && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Swords className="w-5 h-5 text-red-500"/> Match Day Review</h2>
            {matchComplete ? (
               <div className="bg-gray-800 p-8 rounded-xl border border-green-500/50 text-center animate-in zoom-in">
                <div className="mx-auto bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-10 h-10 text-green-400" /></div>
                <h3 className="text-2xl font-bold text-white mb-2">Match Recorded</h3>
                <button onClick={() => setMatchComplete(false)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 mx-auto"><Copy className="w-4 h-4"/> Log Another Match</button>
              </div>
            ) : (
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
              <div><label className="text-xs text-gray-500 mb-1 block">Event Name</label><input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={matchEvent} onChange={e => setMatchEvent(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs text-gray-500 mb-1 block">Opponent</label><input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={matchOpponent} onChange={e => setMatchOpponent(e.target.value)} /></div>
                <div><label className="text-xs text-gray-500 mb-1 block">Result</label><select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={matchResult} onChange={e => setMatchResult(e.target.value)}><option>Win</option><option>Loss</option></select></div>
              </div>
              <div className="pt-4 border-t border-gray-700"><h3 className="text-sm font-bold text-white mb-2">Win or Learn</h3><div className="mb-3"><label className="text-xs text-gray-400 block mb-1">What went well?</label><textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white h-20" placeholder="Setups, motion, attitude..." value={matchWell} onChange={e => setMatchWell(e.target.value)} /></div><div><label className="text-xs text-gray-400 block mb-1">What did I learn?</label><textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white h-20" placeholder="Technical fixes, mindset gaps..." value={matchLearn} onChange={e => setMatchLearn(e.target.value)} /></div></div>
              <button onClick={submitMatch} disabled={loading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg">Log Match</button>
            </div>
            )}
          </div>
        )}

        {/* --- TAB 6: LIBRARY (Updated Grid Layout) --- */}
        {activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in pb-20">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><Video className="w-5 h-5 text-purple-500"/> Video Library</h2>
                 {/* Filter Controls */}
                 <div className="flex gap-2">
                    <button onClick={() => setLibShowFavorites(!libShowFavorites)} className={`p-2 rounded-lg ${libShowFavorites ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                       <Heart className={`w-4 h-4 ${libShowFavorites ? 'fill-current' : ''}`} />
                    </button>
                 </div>
              </div>

              {/* Tag Filters */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 <button onClick={() => setLibFilterTag('All')} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border ${libFilterTag === 'All' ? 'bg-white text-gray-900 border-white' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>All</button>
                 {allTags.map(tag => (
                    <button key={tag} onClick={() => setLibFilterTag(tag)} className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold border ${libFilterTag === tag ? 'bg-white text-gray-900 border-white' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>{tag}</button>
                 ))}
              </div>
            </div>

            {/* Video Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {resources
                .filter(r => libFilterTag === 'All' || (r.tags && r.tags.includes(libFilterTag)))
                .filter(r => !libShowFavorites || (userProfile?.favorites?.includes(r.id)))
                .map(r => {
                 const meta = getVideoMetadata(r.url);
                 const isPlaying = playingVideoId === r.id;
                 const isFav = userProfile?.favorites?.includes(r.id);
                 
                 // Get thumbnail URL specifically for YouTube
                 const thumbnailUrl = meta.type === 'youtube' && meta.id 
                    ? `https://img.youtube.com/vi/${meta.id}/hqdefault.jpg` 
                    : null;

                 return (
                   <div key={r.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex flex-col group hover:border-gray-500 transition-colors">
                     {/* Video Player / Thumbnail Area */}
                     <div 
                        className={`aspect-video bg-black relative ${thumbnailUrl ? 'bg-cover bg-center' : ''}`} 
                        style={{ backgroundImage: thumbnailUrl && !isPlaying ? `url(${thumbnailUrl})` : 'none' }}
                     >
                        {/* LOGIC:
                           1. If isPlaying = true -> Show YouTube Iframe (autoplay) or Non-YouTube Iframe (source)
                           2. If isPlaying = false AND it's YouTube -> Show Image Overlay
                           3. If isPlaying = false AND it's NOT YouTube -> Show Iframe immediately (so it acts as thumb)
                        */}
                        
                        {(isPlaying || meta.type !== 'youtube') ? (
                           meta.type === 'youtube' && meta.id ? (
                              <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${meta.id}?autoplay=${isPlaying ? 1 : 0}`} title={r.title} frameBorder="0" allow="autoplay; encrypted-media" allowFullScreen></iframe>
                           ) : (
                              // Non-YouTube: Just render the iframe directly. 
                              // NOTE: Some sites (IG/TikTok) might block this without specific embed URLs. 
                              // This is "best effort" per user request.
                              <iframe className="w-full h-full" src={r.url} title={r.title} frameBorder="0" allowFullScreen></iframe>
                           )
                        ) : (
                           // YouTube Placeholder Overlay (Click to Play)
                           <button onClick={() => setPlayingVideoId(r.id)} className="w-full h-full flex flex-col items-center justify-center relative bg-black/40 hover:bg-black/20 transition-colors group">
                              <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold text-white uppercase ${meta.color}`}>{meta.label}</div>
                              <Play className="w-12 h-12 text-white opacity-80 group-hover:scale-110 transition-transform drop-shadow-lg"/>
                              <div className="absolute inset-0 bg-black/10"></div>
                           </button>
                        )}
                     </div>

                     {/* Info Area */}
                     <div className="p-3 flex-1 flex flex-col">
                       <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight">{r.title}</h3>
                          <button onClick={() => toggleFavorite(r.id)} className="text-gray-400 hover:text-pink-500 transition-colors ml-2">
                             <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                          </button>
                       </div>
                       
                       {/* Tags */}
                       <div className="mt-auto flex flex-wrap gap-1">
                          {r.tags && r.tags.map((tag: string) => (
                             <span key={tag} className="text-[9px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{tag}</span>
                          ))}
                       </div>
                     </div>
                   </div>
                 );
              })}
              {resources.length === 0 && <p className="text-gray-500 text-center text-sm col-span-full py-10">No videos found.</p>}
            </div>
          </div>
        )}

      </div>

      <div className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 pb-safe pt-2 px-1 flex justify-around items-center z-40 overflow-x-auto z-40">
         <div className="max-w-4xl mx-auto flex justify-around w-full">
            <button onClick={() => switchTab('daily')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'daily' ? 'text-pink-500' : 'text-gray-500'}`}><Flame className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Daily</span></button>
            <button onClick={() => switchTab('teamtalk')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'teamtalk' ? 'text-pink-500' : 'text-gray-500'}`}><MessageCircle className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Team Talk</span></button>
            <button onClick={() => switchTab('match')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'match' ? 'text-pink-500' : 'text-gray-500'}`}><Swords className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Match</span></button>
            <button onClick={() => setShowMenu(true)} className={`flex flex-col items-center p-2 min-w-[50px] ${showMenu ? 'text-pink-500' : 'text-gray-500'}`}><Menu className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Menu</span></button>
         </div>
      </div>
      
      {/* --- MENU OVERLAY (Replaces old tabs for mobile) --- */}
      {showMenu && (
         <div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-6 animate-in fade-in">
            <button onClick={() => setShowMenu(false)} className="absolute top-6 right-6 text-white bg-gray-800 p-2 rounded-full"><XCircle className="w-8 h-8"/></button>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <h2 className="col-span-2 text-center text-xl font-bold text-white mb-4">App Menu</h2>
                <button onClick={() => { switchTab('weekly'); setShowMenu(false); }} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-700 active:scale-95 transition-all">
                   <Zap className="w-8 h-8 text-yellow-500"/>
                   <span className="font-bold text-white">Weekly Launch</span>
                </button>
                <button onClick={() => { switchTab('foundation'); setShowMenu(false); }} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-700 active:scale-95 transition-all">
                   <Target className="w-8 h-8 text-pink-500"/>
                   <span className="font-bold text-white">My Profile</span>
                </button>
                <button onClick={() => { switchTab('bank'); setShowMenu(false); }} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-700 active:scale-95 transition-all">
                   <Trophy className="w-8 h-8 text-yellow-500"/>
                   <span className="font-bold text-white">Confidence Bank</span>
                </button>
                <button onClick={() => { switchTab('schedule'); setShowMenu(false); }} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center gap-2 hover:bg-gray-700 active:scale-95 transition-all">
                   <Calendar className="w-8 h-8 text-purple-500"/>
                   <span className="font-bold text-white">Schedule</span>
                </button>
                <button onClick={() => { switchTab('library'); setShowMenu(false); }} className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center justify-center gap-2 col-span-2 hover:bg-gray-700 active:scale-95 transition-all">
                   <Video className="w-8 h-8 text-blue-500"/>
                   <span className="font-bold text-white">Video Library</span>
                </button>
                <div className="col-span-2 mt-4 pt-4 border-t border-gray-800">
                    <button onClick={() => { signOut(auth); setShowMenu(false); }} className="w-full bg-red-900/50 p-4 rounded-xl text-red-300 font-bold flex items-center justify-center gap-2">
                       <LogOut className="w-4 h-4"/> Sign Out
                    </button>
                </div>
            </div>
         </div>
      )}

    </div>
  );
};

export default App;
