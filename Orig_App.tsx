import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, sendPasswordResetEmail, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, where, deleteDoc, limit, setDoc, getDoc, writeBatch, updateDoc, arrayUnion, arrayRemove, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { 
  CheckCircle, AlertCircle, Calendar, Clock, 
  Trash2, Lock, Unlock, BarChart3, Download, ChevronDown, ChevronUp, Copy, Check, 
  CloudLightning, Video, Youtube, Megaphone, ExternalLink, ShieldAlert, 
  BookOpen, Battery, Smile, Zap, Target, Play, RotateCcw, LogOut, Mail,
  Dumbbell, Heart, DollarSign, GraduationCap, PartyPopper, Flame, Brain, Trophy, Leaf, Droplets, Swords, Lightbulb, Edit3, Users, Search, Scale, UserCheck, UserX, LayoutDashboard, Plus,
  XCircle, AlertTriangle, UploadCloud, MessageCircle, Send, Filter, Hash, Star, Timer, Menu, Grid, HelpCircle, Info,
  ChevronLeft, PlayCircle, ChevronRight, Moon, Coffee, Utensils, Activity, Flag, MessageSquare
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
const COACH_ACCESS_CODE = "bluejays"; 
const APPROVED_COACH_EMAILS = ["coach@example.com", "admin@school.edu"]; 
const LOGO_URL = "https://raw.githubusercontent.com/WillardWonder/girlsattendance/main/merrill-logo.png"; 

// --- EVENTS ---
const MAJOR_EVENTS = [
  { name: "Regionals", date: new Date("2026-02-13T09:00:00") },
  { name: "Sectionals", date: new Date("2026-02-20T09:00:00") },
  { name: "State", date: new Date("2026-02-26T09:00:00") }
];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Auth persistence warning:", error);
  if (error.code === 'auth/quota-exceeded' || error.message.includes('quota')) {
     try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
  }
});

// --- CONSTANTS & CONTENT LISTS ---

const DEFAULT_TECH_FOCUS = [
    "Hand fighting & Control", 
    "Shot Setup & Penetration", 
    "Finishing Takedowns", 
    "Bottom Escapes/Reversals", 
    "Top Pressure & Riding", 
    "Pinning Combinations", 
    "Front Headlock Offense", 
    "Scramble Situations"
];

// Deduplicated list - Removed the second "Relentless"
const MASTER_AFFIRMATIONS = [
    "Resilient", "Relentless", "Respectful", "Grateful", "Composed", 
    "Consistent", "Disciplined", "Fearless", "Strong", "Capable", 
    "Unstoppable", "Focused", "Prepared", "Worthy", "Dynamic", 
    "Explosive", "Patient", "Trusting", "Limitless", "Grit", 
    "Warrior", "Champion", "Tenacious", "Bold", "Fierce", 
    "Determined", "Hungry", "Coachable", "Accountable", "Positive",
    "Adaptable", "Present", "Confident", "Aggressive", "Smart",
    "Strategic", "Dominant", "Unbreakable", "Steady",
    "Powerful", "Quick", "Technical", "Fluid", "Decisive"
];

const ROTATING_TIPS = [
    "Hydration isn't just water. Electrolytes help your muscles fire faster.",
    "Sleep is when your brain processes the new moves you learned today.",
    "Eating vegetables reduces inflammation so you recover quicker.",
    "A positive mindset helps you learn from mistakes instead of fearing them.",
    "Rest days are when your muscles actually rebuild and get stronger.",
    "Visualizing your main shot builds the same neural pathways as drilling it.",
    "Consistency beats intensity. Showing up is 90% of the battle.",
    "Protein after practice helps repair muscle tissue immediately.",
    "Controlled breathing resets your nervous system and lowers stress.",
    "Your body listens to your thoughts. Speak kindly to yourself.",
    "Hand fighting wins matches before the shot is even taken.",
    "Gratitude changes your brain chemistry to spot more opportunities."
];

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
  
  // NEW: Coach Settings State
  const [coachSettings, setCoachSettings] = useState<any>({
    weeklyThemes: DEFAULT_TECH_FOCUS,
    mainShot: "Double Leg"
  });

  // --- NEW DAILY FLOW STATE ---
  const [dailyStep, setDailyStep] = useState(0); // 0=Habits, 1=Practice, 2=Mindset, 3=Done
  const [dailyHabits, setDailyHabits] = useState({
    sleep: '7–8', // <6, 6–7, 7–8, 8+
    bedtime: 'On time', // On time, Late, Very late
    fellAsleepFast: 'Yes',
    hydration: 'Okay', // Low, Okay, Good
    fruit: 'No',
    veggie: 'No',
    barrier: '' // Only if sleep low
  });
  const [dailyPractice, setDailyPractice] = useState({
    attended: 'Yes',
    absenceReason: '',
    effortWeights: 3,
    effortDrilling: 3,
    effortLive: 3,
    matches: 0,
    warmup: 1, // 0, 1, 2+
    cooldown: 1
  });
  const [dailyMindset, setDailyMindset] = useState({
    techFocus: '',
    attemptedShot: 'No',
    resetWord: 'No',
    mantra: '',
    reflectionGood: '',
    reflectionImprove: ''
  });
  const [streakCount, setStreakCount] = useState(0);
  const [microPrompt, setMicroPrompt] = useState('');
  const [randomTip, setRandomTip] = useState('');


  // --- FORUM / DISCUSSION STATE ---
  const [showForum, setShowForum] = useState(false);
  const [activePost, setActivePost] = useState<any>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // --- LIBRARY STATE ---
  const [libFilterTag, setLibFilterTag] = useState('All');
  const [libShowFavorites, setLibShowFavorites] = useState(false);

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
  
  // --- TAB 4: FOUNDATION STATE ---
  const [foundationLocked, setFoundationLocked] = useState(true);
  const [identityWords, setIdentityWords] = useState(['', '', '', '', '']);
  const [whyLevels, setWhyLevels] = useState(['', '', '']); 
  const [purposeStatement, setPurposeStatement] = useState('');

  // --- TAB 5: CONFIDENCE BANK ---
  const [confidenceDeposits, setConfidenceDeposits] = useState<any[]>([]);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);

  // --- ADMIN STATE ---
  const [adminTab, setAdminTab] = useState('dashboard'); 
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

  // --- HELPER FUNCTIONS ---
  const getCurrentName = () => {
    if (userProfile && userProfile.First_Name) return `${userProfile.Last_Name}, ${userProfile.First_Name}`;
    return user?.email || "Athlete";
  };

  const getFirstName = () => {
     if (userProfile && userProfile.First_Name) return userProfile.First_Name;
     if (user && user.email) {
        const namePart = user.email.split('@')[0];
        return namePart.charAt(0).toUpperCase() + namePart.slice(1);
     }
     return "Athlete";
  };

  const isProfileComplete = () => {
      if (!identityWords || !identityWords[0] || identityWords[0].trim() === '') return false;
      if (!whyLevels || !whyLevels[0] || whyLevels[0].trim() === '') return false;
      return true;
  };

  const getAbsentStudents = () => {
    const presentIds = new Set(todaysAttendance.map(a => a.studentId || a.uid));
    const absent = roster.filter(r => !presentIds.has(r.id));
    return absent;
  };

  const getVideoMetadata = (url: string) => {
    if (!url) return { type: 'unknown', id: null, label: 'Link', icon: ExternalLink, color: 'bg-gray-600' };
    if (url.includes('youtu.be') || url.includes('youtube.com')) {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        const id = (match && match[2].length === 11) ? match[2] : null;
        return { type: 'youtube', id, label: 'YouTube', icon: Youtube, color: 'bg-red-600' };
    }
    if (url.includes('tiktok.com')) return { type: 'tiktok', id: null, label: 'TikTok', icon: MessageCircle, color: 'bg-black' };
    if (url.includes('facebook.com') || url.includes('fb.watch')) return { type: 'facebook', id: null, label: 'Facebook', icon: MessageCircle, color: 'bg-blue-600' };
    if (url.includes('instagram.com')) return { type: 'instagram', id: null, label: 'Instagram', icon: MessageCircle, color: 'bg-pink-600' };
    return { type: 'generic', id: null, label: 'Video', icon: Video, color: 'bg-gray-600' };
  };

  const toggleFavorite = async (videoId: string) => {
    if (!user) return;
    const isFav = userProfile?.favorites?.includes(videoId);
    try {
        await updateDoc(doc(db, "user_profiles", user.uid), {
            favorites: isFav ? arrayRemove(videoId) : arrayUnion(videoId)
        });
    } catch(e) { console.error("Fav toggle error", e); }
  };

  const switchTab = (tabName: string) => {
      setActiveTab(tabName);
      setActivePost(null); 
      window.scrollTo(0, 0); 
  };
  
  const startDiscussion = (item: any, type: 'announcement' | 'resource') => {
      const postData = {
          id: item.id,
          message: item.message || item.title,
          date: item.date || new Date().toLocaleDateString(),
          type: type,
          url: item.url || null
      };
      setActivePost(postData);
      setActiveTab('teamtalk');
      loadComments(item.id);
  }
  
  const openVideoExternally = (url: string) => {
      if(url) window.open(url, '_blank');
  }

  // --- DATA LOADING & EFFECTS ---
  useEffect(() => {
    const fetchCoachSettings = async () => {
        const docRef = doc(db, "coach_settings", "weekly_plan");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            setCoachSettings(snap.data());
        }
    };
    fetchCoachSettings();
  }, []);

  const loadConfidenceBank = async (uid: string) => {
    try {
      const q1 = query(collection(db, "daily_logs"), where("uid", "==", uid), limit(50));
      const snap1 = await getDocs(q1);
      const dailyDeposits: any[] = [];
      snap1.docs.forEach(d => {
         const data = d.data();
         if(data.mentalImprovement) dailyDeposits.push({ id: d.id + '_imp', date: data.date, timestamp: data.timestamp, text: `Improvement: ${data.mentalImprovement}`, type: 'improvement' });
         if(data.gratitude) dailyDeposits.push({ id: d.id + '_grat', date: data.date, timestamp: data.timestamp, text: `Gratitude: ${data.gratitude}`, type: 'gratitude' });
         if(data.type === 'foundation_log') dailyDeposits.push({ id: d.id + '_fnd', date: data.date, timestamp: data.timestamp, text: `Foundation: ${data.mentalImprovement}`, type: 'foundation' });
      });
      // Match logs...
      const q2 = query(collection(db, "match_logs"), where("uid", "==", uid), limit(50));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(d => {
         const data = d.data();
         if(data.result === 'Win') dailyDeposits.push({ id: d.id + '_win', date: data.date, timestamp: data.timestamp, text: `WIN vs ${data.opponent}`, type: 'win' });
         if(data.reflection?.well) dailyDeposits.push({ id: d.id + '_well', date: data.date, timestamp: data.timestamp, text: `Match Highlight: ${data.reflection.well}`, type: 'match_well' });
      });
      setConfidenceDeposits(dailyDeposits.sort((a,b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime()));
    } catch (e: any) { console.log("Bank load issue", e); }
  };

  const loadStudentStats = async (uid: string) => {
    try {
      const q = query(collection(db, "daily_logs"), where("uid", "==", uid), limit(30));
      const snap = await getDocs(q);
      const history = snap.docs.map(d => d.data()).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setStudentHistory(history);
      
      let currentStreak = 0;
      if (history.length > 0) {
        const today = new Date().toLocaleDateString();
        const yesterday = new Date(Date.now() - 864e5).toLocaleDateString();
        const latest = history[0].date;
        if (latest === today || latest === yesterday) {
            currentStreak = 1;
             for (let i = 0; i < history.length - 1; i++) {
                currentStreak++; 
             }
        }
      }
      setStreakCount(currentStreak);
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

  const loadComments = async (postId: string) => {
    try {
      setLoading(true);
      const q = query(collection(db, "post_comments"), where("postId", "==", postId));
      const snap = await getDocs(q);
      const comments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
      loadComments(activePost.id);
    } catch (e) { console.error("Post comment error", e); }
  };

  // --- NEW DAILY SUBMISSION HANDLER ---
  const submitNewDailyFlow = async () => {
    if (!isProfileComplete()) {
        alert("Please complete your Profile (Foundation) first.");
        switchTab('foundation');
        return;
    }
    setLoading(true);
    const timestamp = new Date().toISOString();
    const dateStr = new Date().toLocaleDateString();

    const logData = {
        uid: user.uid,
        name: getCurrentName(),
        timestamp,
        date: dateStr,
        type: 'daily_log',
        habits: dailyHabits,
        practice: dailyPractice,
        mindset: dailyMindset,
        attended: dailyPractice.attended === 'Yes',
        effort: (dailyPractice.effortWeights + dailyPractice.effortDrilling + dailyPractice.effortLive) / 3,
        sleepQuality: dailyHabits.sleep, 
    };

    const attendanceData = {
        uid: user.uid,
        studentId: user.uid,
        name: getCurrentName(),
        timestamp,
        date: dateStr,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'attendance',
        focusWord: dailyMindset.mantra,
        focusStatement: dailyMindset.techFocus,
        attended: dailyPractice.attended === 'Yes'
    };

    try {
        await addDoc(collection(db, "daily_logs"), logData);
        await addDoc(collection(db, "attendance"), attendanceData);
        syncToSheets(logData);

        let prompt = "Great consistency.";
        if (dailyHabits.sleep === '<6' || dailyHabits.sleep === '6–7') prompt = "Sleep is your weapon. Aim for 30m earlier tonight.";
        else if (dailyPractice.effortLive > 4) prompt = "High effort today. Hydrate well tonight.";
        else if (dailyMindset.attemptedShot === 'No') prompt = "Visualize hitting your main shot 5 times before bed.";
        setMicroPrompt(prompt);

        const randomFact = ROTATING_TIPS[Math.floor(Math.random() * ROTATING_TIPS.length)];
        setRandomTip(randomFact);
        
        setDailyStep(3); // Go to Success Screen
        loadConfidenceBank(user.uid);
        loadStudentStats(user.uid);
    } catch (e) {
        console.error("Submit error", e);
        setError("Failed to save. Try again.");
    } finally {
        setLoading(false);
    }
  };

  // --- COACH ACTIONS ---
  const updateCoachSettings = async () => {
    if (!user?.uid) return;
    try {
        await setDoc(doc(db, "coach_settings", "weekly_plan"), coachSettings);
        alert("Weekly Plan Updated!");
    } catch(e) { console.error(e); }
  };

  // --- EFFECTS ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const rosterQ = query(collection(db, "roster"));
        const rosterSnap = await getDocs(rosterQ);
        setRoster(rosterSnap.docs.map(doc => {
            const d = doc.data();
            const fName = d.First_Name || d.firstname || '';
            const lName = d.Last_Name || d.lastname || '';
            return { id: doc.id, name: `${lName}, ${fName}`, email: d.Email || d.email, ...d };
        }).sort((a, b) => a.name.localeCompare(b.name))); 

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

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
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

  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "user_profiles", user.uid);
    const unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile(data);
            if(data.identity) setIdentityWords(data.identity);
            else setIdentityWords(['','','','','']);
            
            if(data.whys) setWhyLevels(data.whys);
            else setWhyLevels(['','','']);
            
            if(data.purpose) setPurposeStatement(data.purpose || '');

            if (!data.identity || data.identity[0] === '' || data.identity.length === 0) {
                 setFoundationLocked(false);
                 setActiveTab('foundation'); 
            } else {
                 setFoundationLocked(true);
            }
        } else {
            setActiveTab('foundation');
            setFoundationLocked(false);
        }
    });

    loadConfidenceBank(user.uid);
    loadStudentStats(user.uid);

    return () => unsubscribeProfile();
  }, [user]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const updated = MAJOR_EVENTS.map(ev => {
        const diff = ev.date.getTime() - now.getTime();
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

    updateCountdown(); 
    const interval = setInterval(updateCountdown, 1000); 
    return () => clearInterval(interval);
  }, []);

  // --- HANDLERS ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const emailClean = emailInput.trim();
    const passClean = passwordInput; 

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
        let fName = "Athlete"; let lName = "";
        const namePart = emailClean.split('@')[0];
        const parts = namePart.split('.'); 
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
        console.error("Auth Error:", err); 
        let msg = err.message || "Authentication failed.";
        setError(msg); 
    } finally { 
        setLoading(false); 
    }
  };

  const submitMatch = async () => {
    if (!isProfileComplete()) {
       alert("Please complete your Profile (Foundation) first.");
       switchTab('foundation');
       return;
    }
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
    if (!isProfileComplete()) {
       alert("Please complete your Profile (Foundation) first.");
       switchTab('foundation');
       return;
    }
    setLoading(true);
    const data = {
      uid: user.uid, name: getCurrentName(), type: 'weekly_prep', timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(), weekly_goal: weeklyGoal,
      academic_check: weeklyAcademic, weight_check: weeklyWeight, recovery_score: weeklyRecovery
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
    try {
        await addDoc(collection(db, "daily_logs"), {
            uid: user.uid, 
            date: new Date().toLocaleDateString(),
            timestamp: new Date().toISOString(),
            type: 'foundation_log',
            mentalImprovement: "Defined my Core Values, Whys, and Purpose."
        });
        loadConfidenceBank(user.uid); 
    } catch(e) { console.error("Bank build error", e); }
    setTimeout(() => setSuccessMsg(''), 3000); setLoading(false);
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
  const handleAddAnnouncement = async () => { if(!newAnnouncement) return; await addDoc(collection(db, "announcements"), { message: newAnnouncement, timestamp: new Date().toISOString(), date: new Date().toLocaleDateString() }); setNewAnnouncement(''); alert('Posted!'); };
  const handleAddVideo = async () => { 
    if(!newVideoTitle || !newVideoURL) return; 
    const tags = newVideoTags.split(',').map(t => t.trim()).filter(t => t);
    await addDoc(collection(db, "resources"), { 
      title: newVideoTitle, 
      url: newVideoURL, 
      tags: tags,
      timestamp: new Date().toISOString() 
    });
    if (autoAnnounceVideo) {
       await addDoc(collection(db, "announcements"), { 
         message: `New Video Added to Library: "${newVideoTitle}"`, 
         timestamp: new Date().toISOString(), 
         date: new Date().toLocaleDateString() 
       });
    }
    setNewVideoTitle(''); setNewVideoURL(''); setNewVideoTags(''); setAutoAnnounceVideo(false); 
    alert('Video Added' + (autoAnnounceVideo ? ' & Announced!' : '!')); 
  };

  const allTags = Array.from(new Set(resources.flatMap(r => r.tags || []))).sort();

  if (authLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  // 1. LOGIN SCREEN
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
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {['dashboard', 'roster', 'plan', 'content', 'history'].map(t => (
            <button key={t} onClick={() => setAdminTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap uppercase tracking-wider ${adminTab === t ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{t}</button>
          ))}
        </div>

        {/* DASHBOARD TAB (New) */}
        {adminTab === 'dashboard' && (
           <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-gray-400 text-xs font-bold uppercase mb-1">Today's Check-ins</h3>
                    <div className="text-3xl font-bold text-white">{todaysAttendance.length} <span className="text-sm text-gray-500 font-normal">/ {roster.length}</span></div>
                    <div className="w-full bg-gray-700 h-1.5 mt-2 rounded-full overflow-hidden">
                       <div className="bg-green-500 h-full" style={{ width: `${(todaysAttendance.length / Math.max(1, roster.length)) * 100}%` }}></div>
                    </div>
                 </div>
                 <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                    <h3 className="text-gray-400 text-xs font-bold uppercase mb-1">Red Flags</h3>
                    <div className="text-3xl font-bold text-red-500">
                        {/* Mock red flag calculation based on today's data */}
                        {todaysAttendance.filter(r => r.focusWord === 'Injured' || !r.attended).length}
                    </div>
                    <p className="text-xs text-gray-500">Injury / Missed</p>
                 </div>
              </div>
              
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                 <div className="p-4 bg-gray-900/50 border-b border-gray-700 font-bold text-gray-300 flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-500"/> Needs Attention (Mock Data)
                 </div>
                 <div className="p-4 text-sm text-gray-400 space-y-2">
                    <div className="flex justify-between items-center bg-gray-900/30 p-2 rounded">
                        <span>Sarah J. (Low Sleep 2 days)</span>
                        <button className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">Message</button>
                    </div>
                    <div className="flex justify-between items-center bg-gray-900/30 p-2 rounded">
                        <span>Mike T. (Missed Practice)</span>
                        <button className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded">Message</button>
                    </div>
                 </div>
              </div>

               {/* Nudge Templates */}
               <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                  <h3 className="font-bold text-white mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-pink-500"/> Quick Nudges</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                     <button onClick={() => navigator.clipboard.writeText("Hey, missed you at practice today. Everything ok?")} className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-xs text-left">
                        <span className="block font-bold text-white mb-1">Missed Practice</span>
                        "Hey, missed you today. Everything ok?"
                     </button>
                     <button onClick={() => navigator.clipboard.writeText("You've been under 7 hours sleep a couple nights. What's the biggest thing keeping you up?")} className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-xs text-left">
                        <span className="block font-bold text-white mb-1">Low Sleep</span>
                        "What's keeping you up?"
                     </button>
                     <button onClick={() => navigator.clipboard.writeText("Nice consistency this week. Keep it going!")} className="bg-gray-700 hover:bg-gray-600 p-2 rounded text-xs text-left">
                        <span className="block font-bold text-white mb-1">Great Streak</span>
                        "Nice consistency! Keep it going."
                     </button>
                  </div>
               </div>
           </div>
        )}

        {/* PLAN TAB (New) */}
        {adminTab === 'plan' && (
           <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in">
              <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                 <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Target className="w-6 h-6 text-purple-500"/> Weekly Plan Editor</h2>
                 
                 <div className="space-y-4">
                    <div>
                        <label className="text-sm font-bold text-gray-400 block mb-2">Technical Themes (Selectable Options)</label>
                        <textarea 
                           className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-sm" 
                           rows={4}
                           defaultValue={coachSettings.weeklyThemes.join(", ")}
                           onChange={(e) => setCoachSettings({...coachSettings, weeklyThemes: e.target.value.split(',').map(s => s.trim())})}
                        />
                        <p className="text-xs text-gray-500 mt-1">Separate with commas (e.g. Hand fighting, Escapes, Finishes)</p>
                    </div>
                    <div>
                        <label className="text-sm font-bold text-gray-400 block mb-2">Main Shot of the Week</label>
                        <input 
                           type="text"
                           className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white text-sm"
                           defaultValue={coachSettings.mainShot}
                           onChange={(e) => setCoachSettings({...coachSettings, mainShot: e.target.value})}
                        />
                    </div>
                    <button onClick={updateCoachSettings} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg">Save Weekly Plan</button>
                 </div>
              </div>
           </div>
        )}

        {/* ROSTER TAB (Updated) */}
        {adminTab === 'roster' && (
          <div className="space-y-6 max-w-4xl mx-auto">
             <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                <table className="w-full text-left text-sm text-gray-400">
                   <thead className="bg-gray-900 text-gray-200 font-bold uppercase text-xs">
                      <tr>
                         <th className="p-4">Athlete</th>
                         <th className="p-4">Streak</th>
                         <th className="p-4">Sleep (Avg)</th>
                         <th className="p-4">Effort (Avg)</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-700">
                      {roster.map((r) => (
                         <tr key={r.id} className="hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={() => alert("Drilldown profile view would go here")}>
                            <td className="p-4 text-white font-medium">{r.Last_Name}, {r.First_Name}</td>
                            <td className="p-4 text-orange-400 font-mono">🔥 {Math.floor(Math.random() * 10)}</td> {/* Mock Data */}
                            <td className="p-4 text-green-400 font-mono">7.2h</td> {/* Mock Data */}
                            <td className="p-4 text-blue-400 font-mono">4.5</td> {/* Mock Data */}
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* CONTENT TAB (Existing) */}
        {adminTab === 'content' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Same content as before... */}
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
              <button onClick={handleAddVideo} className="w-full bg-green-600 py-2 rounded text-sm font-bold">Add Video</button>
            </div>
          </div>
        )}

        {/* HISTORY TAB (Existing) */}
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
             {/* History List Code (Same as before) */}
          </div>
        )}
      </div>
    );
  }

  // 4. ATHLETE DASHBOARD
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans pb-24">
      {/* HEADER */}
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
        {/* --- TAB 1: DAILY GRIND (NEW 3-STEP WIZARD) --- */}
        {activeTab === 'daily' && !showForum && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
            {/* Show Announcement if exists */}
            {announcements.length > 0 && dailyStep === 0 && (
              <div className="bg-gradient-to-r from-pink-900/50 to-purple-900/50 p-4 rounded-xl border border-pink-500/30 mb-4">
                <h3 className="text-pink-300 text-xs font-bold uppercase mb-1 flex items-center gap-2"><Megaphone className="w-3 h-3"/> Latest News</h3>
                <p className="text-white text-sm">{announcements[0].message}</p>
                <div className="flex justify-between items-center mt-3">
                   <p className="text-pink-500/50 text-[10px]">{announcements[0].date}</p>
                   <button onClick={() => startDiscussion(announcements[0], 'announcement')} className="text-xs bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 px-3 py-1 rounded-full flex items-center gap-1 transition-colors"><MessageCircle className="w-3 h-3"/> Team Talk</button>
                </div>
              </div>
            )}
            
            {/* WIZARD PROGRESS */}
            {dailyStep < 3 && (
                <div className="flex gap-2 mb-4">
                    {[0, 1, 2].map(i => (
                        <div key={i} className={`h-1.5 rounded-full flex-1 transition-colors ${i <= dailyStep ? 'bg-pink-500' : 'bg-gray-800'}`}></div>
                    ))}
                </div>
            )}

            {/* STEP 1: HABITS */}
            {dailyStep === 0 && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Moon className="w-6 h-6 text-indigo-400"/> Habits</h2>
                    <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-6">
                        {/* Sleep */}
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase block mb-3">Sleep Last Night</label>
                            <div className="grid grid-cols-4 gap-2">
                                {['<6', '6–7', '7–8', '8+'].map(opt => (
                                    <button key={opt} onClick={() => setDailyHabits({...dailyHabits, sleep: opt})} className={`py-3 rounded-lg text-sm font-bold border transition-colors ${dailyHabits.sleep === opt ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>
                        {/* Bedtime */}
                        <div>
                             <label className="text-gray-400 text-xs font-bold uppercase block mb-3">Bedtime</label>
                             <div className="grid grid-cols-3 gap-2">
                                {['On time', 'Late', 'Very late'].map(opt => (
                                    <button key={opt} onClick={() => setDailyHabits({...dailyHabits, bedtime: opt})} className={`py-3 rounded-lg text-sm font-bold border transition-colors ${dailyHabits.bedtime === opt ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>
                        {/* Asleep Fast */}
                        <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-xl">
                            <span className="text-sm text-gray-300 font-medium">Fell asleep within 20m?</span>
                            <div className="flex bg-gray-800 rounded-lg p-1">
                                <button onClick={() => setDailyHabits({...dailyHabits, fellAsleepFast: 'Yes'})} className={`px-4 py-1.5 rounded text-xs font-bold ${dailyHabits.fellAsleepFast === 'Yes' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>Yes</button>
                                <button onClick={() => setDailyHabits({...dailyHabits, fellAsleepFast: 'No'})} className={`px-4 py-1.5 rounded text-xs font-bold ${dailyHabits.fellAsleepFast === 'No' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>No</button>
                            </div>
                        </div>
                        
                        {/* Conditional Barrier */}
                        {(dailyHabits.sleep === '<6' || dailyHabits.sleep === '6–7' || dailyHabits.fellAsleepFast === 'No') && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="text-orange-400 text-xs font-bold uppercase block mb-2">What got in the way?</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Stress', 'Screen time', 'Late practice', 'Pain', 'Other'].map(b => (
                                        <button key={b} onClick={() => setDailyHabits({...dailyHabits, barrier: b})} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${dailyHabits.barrier === b ? 'bg-orange-900/50 border-orange-500 text-orange-200' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>{b}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Nutrition */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-gray-900/50 p-3 rounded-xl text-center">
                                <Droplets className="w-5 h-5 text-blue-400 mx-auto mb-2"/>
                                <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Hydration</div>
                                <div className="flex flex-col gap-1">
                                    {['Low', 'Okay', 'Good'].map(opt => (
                                        <button key={opt} onClick={() => setDailyHabits({...dailyHabits, hydration: opt})} className={`text-[10px] py-1 rounded ${dailyHabits.hydration === opt ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>{opt}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gray-900/50 p-3 rounded-xl text-center">
                                <div className="text-xl mb-2">🍎</div>
                                <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Fruit</div>
                                <div className="flex justify-center gap-1">
                                    <button onClick={() => setDailyHabits({...dailyHabits, fruit: 'Yes'})} className={`px-2 py-1 rounded text-xs ${dailyHabits.fruit === 'Yes' ? 'bg-green-600 text-white' : 'bg-gray-800'}`}>Y</button>
                                    <button onClick={() => setDailyHabits({...dailyHabits, fruit: 'No'})} className={`px-2 py-1 rounded text-xs ${dailyHabits.fruit === 'No' ? 'bg-red-600 text-white' : 'bg-gray-800'}`}>N</button>
                                </div>
                            </div>
                            <div className="bg-gray-900/50 p-3 rounded-xl text-center">
                                <div className="text-xl mb-2">🥦</div>
                                <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Veggie</div>
                                <div className="flex justify-center gap-1">
                                    <button onClick={() => setDailyHabits({...dailyHabits, veggie: 'Yes'})} className={`px-2 py-1 rounded text-xs ${dailyHabits.veggie === 'Yes' ? 'bg-green-600 text-white' : 'bg-gray-800'}`}>Y</button>
                                    <button onClick={() => setDailyHabits({...dailyHabits, veggie: 'No'})} className={`px-2 py-1 rounded text-xs ${dailyHabits.veggie === 'No' ? 'bg-red-600 text-white' : 'bg-gray-800'}`}>N</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => setDailyStep(1)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">Next: Practice <ChevronRight className="w-5 h-5"/></button>
                </div>
            )}

            {/* STEP 2: PRACTICE */}
            {dailyStep === 1 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setDailyStep(0)} className="bg-gray-800 p-2 rounded-full text-gray-400"><ChevronLeft className="w-4 h-4"/></button>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Activity className="w-6 h-6 text-green-400"/> Practice</h2>
                    </div>

                    <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-6">
                        {/* Attendance */}
                        <div>
                             <label className="text-gray-400 text-xs font-bold uppercase block mb-3">Did you attend practice?</label>
                             <div className="grid grid-cols-2 gap-3">
                                 <button onClick={() => setDailyPractice({...dailyPractice, attended: 'Yes'})} className={`py-4 rounded-xl text-lg font-bold border transition-colors ${dailyPractice.attended === 'Yes' ? 'bg-green-600 border-green-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>Yes</button>
                                 <button onClick={() => setDailyPractice({...dailyPractice, attended: 'No'})} className={`py-4 rounded-xl text-lg font-bold border transition-colors ${dailyPractice.attended === 'No' ? 'bg-red-600 border-red-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>No</button>
                             </div>
                        </div>

                        {dailyPractice.attended === 'No' ? (
                            <div className="animate-in fade-in">
                                <label className="text-gray-400 text-xs font-bold uppercase block mb-3">Reason for missing</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Sick', 'Injury', 'Family', 'Transport', 'School', 'Other'].map(r => (
                                        <button key={r} onClick={() => setDailyPractice({...dailyPractice, absenceReason: r})} className={`py-3 rounded-lg text-sm font-bold border ${dailyPractice.absenceReason === r ? 'bg-red-900/50 border-red-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>{r}</button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="animate-in fade-in space-y-6">
                                {/* Effort Sliders */}
                                {[
                                    { label: 'Weights', key: 'effortWeights' },
                                    { label: 'Drilling', key: 'effortDrilling' },
                                    { label: 'Live', key: 'effortLive' }
                                ].map((item) => (
                                    <div key={item.key}>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold uppercase text-gray-400">{item.label}</label>
                                            <span className="text-xs font-mono text-white">{(dailyPractice as any)[item.key]}/5</span>
                                        </div>
                                        <input 
                                            type="range" min="1" max="5" 
                                            value={(dailyPractice as any)[item.key]} 
                                            onChange={(e) => setDailyPractice({...dailyPractice, [item.key]: parseInt(e.target.value)})}
                                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                ))}

                                {/* Counts */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-gray-900/50 p-3 rounded-xl text-center">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Matches</div>
                                        <div className="flex justify-center gap-1">
                                            {[0, 1, 2, 3].map(n => (
                                                <button key={n} onClick={() => setDailyPractice({...dailyPractice, matches: n})} className={`w-6 h-6 rounded text-xs font-bold ${dailyPractice.matches === n ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-500'}`}>{n}{n===3 ? '+' : ''}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/50 p-3 rounded-xl text-center">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Warmup</div>
                                        <div className="flex justify-center gap-1">
                                            {[0, 1, 2].map(n => (
                                                <button key={n} onClick={() => setDailyPractice({...dailyPractice, warmup: n})} className={`w-6 h-6 rounded text-xs font-bold ${dailyPractice.warmup === n ? 'bg-orange-600 text-white' : 'bg-gray-800 text-gray-500'}`}>{n}{n===2 ? '+' : ''}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-gray-900/50 p-3 rounded-xl text-center">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold mb-2">Cooldown</div>
                                        <div className="flex justify-center gap-1">
                                            {[0, 1, 2].map(n => (
                                                <button key={n} onClick={() => setDailyPractice({...dailyPractice, cooldown: n})} className={`w-6 h-6 rounded text-xs font-bold ${dailyPractice.cooldown === n ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>{n}{n===2 ? '+' : ''}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <button onClick={() => setDailyStep(2)} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">Next: Mindset <ChevronRight className="w-5 h-5"/></button>
                </div>
            )}

            {/* STEP 3: MINDSET */}
            {dailyStep === 2 && (
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2">
                        <button onClick={() => setDailyStep(1)} className="bg-gray-800 p-2 rounded-full text-gray-400"><ChevronLeft className="w-4 h-4"/></button>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Brain className="w-6 h-6 text-pink-400"/> Mindset</h2>
                    </div>

                    <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700 space-y-6">
                        {/* Technical Focus */}
                        <div>
                             <label className="text-gray-400 text-xs font-bold uppercase block mb-3">Today's Technical Focus</label>
                             <div className="flex flex-wrap gap-2">
                                {coachSettings.weeklyThemes.map((theme: string) => (
                                    <button key={theme} onClick={() => setDailyMindset({...dailyMindset, techFocus: theme})} className={`px-3 py-2 rounded-lg text-sm font-bold border transition-colors ${dailyMindset.techFocus === theme ? 'bg-pink-600 border-pink-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>{theme}</button>
                                ))}
                            </div>
                        </div>

                        {/* Main Shot Check */}
                        <div className="bg-gray-900/50 p-4 rounded-xl flex items-center justify-between">
                            <div>
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Main Shot: {coachSettings.mainShot}</div>
                                <div className="text-white font-bold">Did you attempt it?</div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setDailyMindset({...dailyMindset, attemptedShot: 'Yes'})} className={`px-4 py-2 rounded-lg font-bold text-sm ${dailyMindset.attemptedShot === 'Yes' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500'}`}>Yes</button>
                                <button onClick={() => setDailyMindset({...dailyMindset, attemptedShot: 'No'})} className={`px-4 py-2 rounded-lg font-bold text-sm ${dailyMindset.attemptedShot === 'No' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-500'}`}>No</button>
                            </div>
                        </div>
                        
                         {/* Reset Word */}
                         <div className="flex items-center justify-between px-2">
                            <span className="text-sm text-gray-300">Used Reset Word?</span>
                            <div className="flex gap-2">
                                <button onClick={() => setDailyMindset({...dailyMindset, resetWord: 'Yes'})} className={`w-10 h-8 rounded text-xs font-bold ${dailyMindset.resetWord === 'Yes' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-500'}`}>Yes</button>
                                <button onClick={() => setDailyMindset({...dailyMindset, resetWord: 'No'})} className={`w-10 h-8 rounded text-xs font-bold ${dailyMindset.resetWord === 'No' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-500'}`}>No</button>
                            </div>
                         </div>

                        {/* Mantra - Word Cloud */}
                        <div>
                             <label className="text-gray-400 text-xs font-bold uppercase block mb-3">Today's Mantra</label>
                             <div className="h-48 overflow-y-auto flex flex-wrap gap-2 p-4 border border-gray-700 rounded-xl bg-gray-900/30 custom-scrollbar content-start">
                                {MASTER_AFFIRMATIONS.map(m => (
                                    <button 
                                        key={m} 
                                        onClick={() => setDailyMindset({...dailyMindset, mantra: m})} 
                                        className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all transform hover:scale-105 ${
                                            dailyMindset.mantra === m 
                                            ? 'bg-pink-600 border-pink-500 text-white shadow-lg scale-105' 
                                            : 'bg-gray-950 border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white'
                                        }`}
                                    >
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>

                         {/* Reflection (Optional) */}
                         <div className="pt-4 border-t border-gray-700">
                             <label className="text-gray-400 text-xs font-bold uppercase block mb-2">Quick Reflection (Optional)</label>
                             <input 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white mb-2 focus:border-pink-500 outline-none transition-colors"
                                placeholder="Example: My motion was great, but I hesitated on shots."
                                value={dailyMindset.reflectionGood}
                                onChange={(e) => setDailyMindset({...dailyMindset, reflectionGood: e.target.value})}
                             />
                             <input 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-pink-500 outline-none transition-colors"
                                placeholder="Example: Tomorrow I will commit to the first shot."
                                value={dailyMindset.reflectionImprove}
                                onChange={(e) => setDailyMindset({...dailyMindset, reflectionImprove: e.target.value})}
                             />
                         </div>
                    </div>
                    <button onClick={submitNewDailyFlow} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-pink-900/20">{loading ? 'Saving...' : 'Submit Log'}</button>
                </div>
            )}

            {/* STEP 4: SUCCESS */}
            {dailyStep === 3 && (
                 <div className="bg-gray-800 p-8 rounded-xl border border-green-500/50 text-center animate-in zoom-in">
                    <div className="mx-auto bg-green-500/20 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                        <Flame className="w-12 h-12 text-orange-500 animate-pulse" />
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-2">{streakCount} Day Streak!</h3>
                    <p className="text-gray-400 mb-8 font-medium">Keep the fire burning.</p>
                    
                    <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 mb-8 text-left relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="text-xs text-blue-400 uppercase font-bold mb-2 flex items-center gap-2"><Lightbulb className="w-3 h-3"/> Daily Knowledge</div>
                        <p className="text-white font-medium italic leading-relaxed">"{randomTip}"</p>
                    </div>

                    <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-700 mb-8 text-left">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Coach's Specific Feedback</div>
                        <p className="text-gray-300 text-sm">{microPrompt}</p>
                    </div>

                    <button onClick={() => setDailyStep(0)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 mx-auto"><Edit3 className="w-4 h-4"/> Edit / New Entry</button>
                 </div>
            )}
          </div>
        )}

        {/* --- TAB: WEEKLY (Existing) --- */}
        {activeTab === 'weekly' && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500"/> Weekly Launch</h2>
             {weeklyComplete ? (
              <div className="bg-gray-800 p-8 rounded-xl border border-green-500/50 text-center animate-in zoom-in">
                <div className="mx-auto bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mb-4"><CheckCircle className="w-10 h-10 text-green-400" /></div>
                <h3 className="text-2xl font-bold text-white mb-2">Ready for the Week!</h3>
                <button onClick={() => setWeeklyComplete(false)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 mx-auto">Edit Entry</button>
              </div>
             ) : (
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Academics in check?</label>
                  <div className="flex gap-2">
                    <button onClick={() => setWeeklyAcademic('Yes')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${weeklyAcademic === 'Yes' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>Yes</button>
                    <button onClick={() => setWeeklyAcademic('No')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${weeklyAcademic === 'No' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>No</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Weight on track?</label>
                  <div className="flex gap-2">
                    <button onClick={() => setWeeklyWeight('Yes')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${weeklyWeight === 'Yes' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>Yes</button>
                    <button onClick={() => setWeeklyWeight('No')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${weeklyWeight === 'No' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>No</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">
                    Recovery Level (1-10)
                    <span className='ml-2 text-[10px] text-gray-400'>
                        (1=Red Zone: Exhausted/Injured; 10=Green Zone: Fully Rested/Mentally Sharp)
                    </span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input type="range" min="1" max="10" value={weeklyRecovery} onChange={(e) => setWeeklyRecovery(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    <span className="text-xl font-bold text-blue-400">{weeklyRecovery}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    Goal for this week
                    <span className='ml-2 text-[10px] text-gray-400'>
                         (Include: **What** you will achieve, **How** you will measure it, and **When** it will happen)
                    </span>
                  </label>
                  <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white h-24" placeholder="Example: I will improve my takedown defense by successfully blocking 10 shots per practice by Friday." value={weeklyGoal} onChange={e => setWeeklyGoal(e.target.value)} />
                </div>
                <button onClick={submitWeekly} disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl shadow-lg">Submit Weekly Prep</button>
             </div>
             )}
          </div>
        )}

        {/* --- TAB: TEAM TALK (Existing) --- */}
        {activeTab === 'teamtalk' && (
          <div className="space-y-4 animate-in fade-in pb-20 max-w-xl mx-auto">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><MessageCircle className="w-5 h-5 text-pink-500"/> Team Talk</h2>
             
             {!activePost ? (
                <div className="space-y-3">
                   <p className="text-gray-400 text-xs mb-2">Announcements & Discussions</p>
                   {announcements.map(post => (
                      <div key={post.id} onClick={() => startDiscussion(post, 'announcement')} className="bg-gray-800 p-4 rounded-xl border border-gray-700 active:bg-gray-700 transition-colors cursor-pointer">
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
                   <div className="p-4 border-b border-gray-700 bg-gray-800/50 sticky top-0 z-10 rounded-t-xl">
                      <button onClick={() => setActivePost(null)} className="text-xs text-gray-400 mb-2 flex items-center gap-1 hover:text-white transition-colors">
                        <ChevronLeft className="w-3 h-3"/> Back to list
                      </button>
                      
                      {activePost.type === 'resource' && activePost.url && (
                        <div className="mb-3 bg-black rounded overflow-hidden">
                           <div className="p-3 flex items-center justify-between bg-gray-800/50">
                              <div className="flex items-center gap-2 text-white font-bold text-sm truncate">
                                 <PlayCircle className="w-4 h-4 text-pink-500"/>
                                 Watch Video
                              </div>
                              <button 
                                 onClick={() => openVideoExternally(activePost.url)} 
                                 className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded flex items-center gap-1 font-bold transition-colors"
                              >
                                 <ExternalLink className="w-3 h-3"/> Open
                              </button>
                           </div>
                        </div>
                      )}

                      <p className="text-white text-sm font-medium">{activePost.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activePost.date}</p>
                   </div>
                   
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
        
        {/* --- TAB: SCHEDULE (Existing) --- */}
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

        {/* --- TAB 4: FOUNDATION (Existing) --- */}
        {activeTab === 'foundation' && (
          <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
             <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><Target className="w-5 h-5 text-pink-500"/> My Profile</h2>
                {foundationLocked && <button onClick={() => setFoundationLocked(false)} className="text-xs bg-gray-800 px-3 py-1 rounded text-white flex items-center gap-1"><Unlock className="w-3 h-3"/> Unlock & Edit</button>}
             </div>

             <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-5 rounded-2xl border border-gray-700 shadow-lg">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="text-lg font-bold text-white">{getFirstName()} {userProfile?.Last_Name || ''}</h3>
                      <p className="text-xs text-gray-400">Class of 20{userProfile?.Grade ? 32 - (userProfile.Grade - 5) : '??'}</p>
                   </div>
                   <div className="bg-pink-900/30 p-2 rounded-lg">
                      <Trophy className="w-6 h-6 text-pink-500" />
                   </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                   <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-white">{studentHistory?.length || 0}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Check-ins</div>
                   </div>
                   <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-blue-400">{confidenceDeposits?.filter(d => d.type === 'win').length || 0}</div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Wins Logged</div>
                   </div>
                   <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                      <div className="text-2xl font-bold text-green-400">
                         {(studentHistory && studentHistory.length > 0) ? Math.round(studentHistory.reduce((acc, curr) => acc + (curr.sleep?.hours ? parseFloat(curr.sleep.hours) : 0), 0) / studentHistory.length) : '-'}
                      </div>
                      <div className="text-[10px] text-gray-400 uppercase tracking-wider">Avg Sleep</div>
                   </div>
                </div>
             </div>

             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><UserCheck className="w-4 h-4"/> 1. My Identity</h3>
                  <button className="text-[10px] text-blue-400 underline flex items-center gap-1"><HelpCircle className="w-3 h-3"/> Need ideas?</button>
               </div>
               <p className="text-[10px] text-gray-500 mb-2">I am...</p>
               <div className="space-y-2">{identityWords.map((word, i) => <div key={i} className="flex gap-2 items-center"><span className="text-gray-600 text-xs font-mono">{i+1}.</span><input type="text" disabled={foundationLocked} className={`w-full bg-gray-900 border rounded p-2 text-white text-sm ${foundationLocked ? 'border-transparent' : 'border-gray-600'}`} value={word} onChange={e => { const n = [...identityWords]; n[i] = e.target.value; setIdentityWords(n); }} /></div>)}</div>
             </div>

             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase flex items-center gap-2"><HelpCircle className="w-4 h-4"/> 2. The 3 Whys</h3>
               </div>
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

             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2"><Target className="w-4 h-4"/> 3. Purpose Statement</h3>
               <p className="text-[10px] text-gray-500 mb-2">Your personal mission statement.</p>
               <textarea disabled={foundationLocked} className={`w-full bg-gray-900 border rounded p-2 text-white text-sm h-24 ${foundationLocked ? 'border-transparent' : 'border-gray-600'}`} value={purposeStatement} onChange={e => setPurposeStatement(e.target.value)} placeholder="I wrestle to build unshakeable confidence that I will carry for the rest of my life." />
             </div>

             {!foundationLocked && (
                <div className='flex gap-4'>
                    <button onClick={() => setFoundationLocked(true)} className="w-1/3 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg">Cancel</button>
                    <button onClick={saveFoundation} disabled={loading} className="w-2/3 bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg">Save Foundation</button>
                </div>
             )}
          </div>
        )}

        {/* --- TAB 5: BANK (Existing) --- */}
        {activeTab === 'bank' && (
           <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500"/> Confidence Bank</h2>
             <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {confidenceDeposits.length === 0 ? <div className="p-8 text-center text-gray-500"><Leaf className="w-12 h-12 mx-auto mb-2 opacity-20"/><p>No deposits yet.</p></div> : <div className="divide-y divide-gray-700">{confidenceDeposits.map(d => <div key={d.id} className="p-4"><div className="text-xs text-blue-400 font-mono mb-1">{d.date}</div><div className="text-white text-sm font-medium">"{d.text}"</div></div>)}</div>}
             </div>
           </div>
        )}

        {/* --- TAB: MATCH DAY (Existing) --- */}
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

        {/* --- TAB 6: LIBRARY (Existing) --- */}
        {activeTab === 'library' && (
          <div className="space-y-6 animate-in fade-in pb-20">
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-white flex items-center gap-2"><Video className="w-5 h-5 text-purple-500"/> Video Library</h2>
                 {/* Filter Controls */}
                 <div className="flex gap-2">
                    {/* FIX: isFav was defined inside the map loop, so we define it right here too */}
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
                 const isFav = userProfile?.favorites?.includes(r.id); 
                 
                 const thumbnailUrl = meta.type === 'youtube' && meta.id 
                    ? `https://img.youtube.com/vi/${meta.id}/hqdefault.jpg` 
                    : null;

                 const IconComponent = meta.icon;
                 
                 return (
                   <div key={r.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex flex-col group hover:border-gray-500 transition-colors">
                     <button 
                        onClick={() => openVideoExternally(r.url)}
                        className={`aspect-video bg-black relative w-full flex flex-col items-center justify-center ${thumbnailUrl ? 'bg-cover bg-center' : ''}`} 
                        style={{ 
                            backgroundImage: thumbnailUrl && meta.type === 'youtube' ? `url(${thumbnailUrl})` : 'none' 
                        }}
                     >
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-[10px] font-bold text-white uppercase ${meta.color}`}>{meta.label}</div>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 drop-shadow-md ${meta.color}`}>
                          <IconComponent className="w-8 h-8 text-white" />
                        </div>
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                     </button>
                     <div className="p-3 flex-1 flex flex-col">
                       <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight">{r.title}</h3>
                          <button onClick={() => toggleFavorite(r.id)} className="text-gray-400 hover:text-pink-500 transition-colors ml-2">
                             <Heart className={`w-4 h-4 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                          </button>
                       </div>
                        <div className="mt-auto flex justify-between items-center pt-2 border-t border-gray-700/50">
                            <button onClick={() => startDiscussion(r, 'resource')} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300">
                                <MessageCircle className="w-3 h-3"/> Discuss
                            </button>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 flex items-center gap-1 hover:text-white">
                                <ExternalLink className="w-3 h-3"/> Open Link
                            </a>
                        </div>
                       <div className="flex flex-wrap gap-1 mt-2">
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
      
      {/* --- MENU OVERLAY --- */}
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






//below is an older copy


import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, writeBatch, doc, where, deleteDoc, limit, setDoc } from 'firebase/firestore';
import { 
  Search, CheckCircle, Scale, AlertCircle, UserPlus, ClipboardList, UploadCloud, Users, 
  Calendar, Clock, UserCheck, UserX, LayoutDashboard, Trash2, AlertTriangle, Lock, Unlock, 
  History, BarChart3, XCircle, Download, Filter, ChevronDown, ChevronUp, Copy, Check, 
  CloudLightning, Video, MessageSquare, TrendingUp, Plus, Youtube, Megaphone, ExternalLink, 
  ShieldAlert, BookOpen, Battery, Smile, Zap, Target, Play, RotateCcw, LogOut, KeyRound, Mail,
  Utensils, Droplets, Swords
} from 'lucide-react';

// --- CONFIGURATION (HARDCODED TO FIX BUILD ERROR) ---

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

const ALLOWED_DOMAINS = ["@mapsedu.org", "@maps.k12.wi.us"];

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- PRELOADED DATA ---
const PRELOADED_ROSTER = [];

const App = () => {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameInput, setNameInput] = useState(''); 
  
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

  // Journal State (Expanded)
  const [journalGratitude, setJournalGratitude] = useState('');
  const [focusWord, setFocusWord] = useState('');
  const [focusStatement, setFocusStatement] = useState('');
  const [dailyMantra, setDailyMantra] = useState('');
  const [techFocus, setTechFocus] = useState('');
  const [nutritionVeggies, setNutritionVeggies] = useState(false);
  const [nutritionFruit, setNutritionFruit] = useState(false);
  const [nutritionWater, setNutritionWater] = useState(0);
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
    if ((appMode === 'coach' && isCoachAuthenticated) || user?.isCoach) {
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
  }, [appMode, isCoachAuthenticated, adminTab, user]);

  // SECURITY FIX: Lock Coach Mode when leaving
  useEffect(() => {
    if (appMode === 'athlete') {
      setIsCoachAuthenticated(false);
      setPasswordInput('');
    }
  }, [appMode]);

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
      setLoading(false);
    } catch (e: any) {
      setError('Error creating account: ' + e.message);
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    // Removed domain restriction per request - open registration
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
    setUser(null); 
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
        fetch(GOOGLE_SCRIPT_URL, {
          method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
        }).then(() => setSyncStatus('success')).catch(() => setSyncStatus('error'));
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
      studentId: selectedStudent.id, 
      name: selectedStudent.name, 
      gratitude: journalGratitude, 
      focusWord, 
      focusStatement,
      mantra: dailyMantra,
      techFocus,
      nutrition: { veggies: nutritionVeggies, fruit: nutritionFruit, water: nutritionWater },
      energy: energyLevel, 
      mood: moodLevel, 
      timestamp: new Date().toISOString(), 
      date: new Date().toLocaleDateString(), 
      type: 'journal'
    };

    try {
      await addDoc(collection(db, "journals"), data);
      if (GOOGLE_SCRIPT_URL) {
        fetch(GOOGLE_SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        .then(() => setSyncStatus('success')).catch(() => setSyncStatus('error'));
      }
      setJournalSuccess(true);
      setTimeout(() => { 
          setJournalSuccess(false); setJournalGratitude(''); setFocusWord(''); setFocusStatement(''); setDailyMantra(''); setTechFocus(''); setEnergyLevel(3); setMoodLevel(3); setNutritionVeggies(false); setNutritionFruit(false); setNutritionWater(0); setSearchTerm(''); setSelectedStudent(null);
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
    if(passwordInput === COACH_PASSWORD) { 
      setIsCoachAuthenticated(true); 
      setPasswordInput(''); 
    } else { 
      alert('Wrong Password'); 
    }
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
    records.forEach(r => {
      text += `${r.name}\t${r.weight}\t${r.time}\t${r.notes || ''}\n`;
    });
    navigator.clipboard.writeText(text).then(() => {
      setCopiedDate(date);
      setTimeout(() => setCopiedDate(null), 2000);
    });
  };

  const handleGenerateReport = async () => {
    try {
        let records = historyRecords;
        const start = new Date(reportStartDate).setHours(0,0,0,0);
        const end = new Date(reportEndDate).setHours(23,59,59,999);

        records = records.filter(r => {
            const rDate = new Date(r.timestamp).getTime();
            return rDate >= start && rDate <= end;
        });

        if (reportStudentFilter) records = records.filter(r => r.name === reportStudentFilter);
        if (reportGradeFilter) records = records.filter(r => r.grade === reportGradeFilter);

        if (records.length === 0) {
            alert("No records found matching these filters.");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Time,Name,Grade,Weight,Skin Check,Notes\n";

        records.forEach(row => {
            const skinCheck = row.skinCheckPass ? "Pass" : "Fail";
            const notes = row.notes ? `"${row.notes.replace(/"/g, '""')}"` : "";
            csvContent += `${row.date},${row.time},${row.name},${row.grade || ''},${row.weight},${skinCheck},${notes}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `attendance_report_${reportStartDate}_to_${reportEndDate}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (e) {
        console.error(e);
        alert("Error generating report");
    }
  };

  // --- ADMIN ROSTER TOOLS ---
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

    const originalHeaders = firstRow.split(separator).map(h => h.trim());
    const headers = originalHeaders.map(normalizeHeader);
    
    if (!headers.includes('Last_Name') || !headers.includes('First_Name')) {
      setImportStatus(`Error: Missing Name columns.`);
      return;
    }

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

        if (newWrestlers.length === 0) {
            setImportStatus('All names in CSV already exist. No changes made.');
            return;
        }

        setImportStatus(`Uploading ${newWrestlers.length} new wrestlers...`);
        const batch = writeBatch(db);
        newWrestlers.forEach(wrestler => {
            const docRef = doc(collection(db, "roster"));
            batch.set(docRef, wrestler);
        });
        await batch.commit();
        setImportStatus(`Success! Added ${newWrestlers.length} new wrestlers.`);
        setCsvData('');
    } catch (e: any) {
        setImportStatus('Error uploading: ' + e.message);
        if (e.message && e.message.includes("permissions")) setPermissionError(true);
    }
  };

  const handlePreloadedImport = async () => {
    if (PRELOADED_ROSTER.length === 0) { alert("No roster data in code. Use Manual Import."); return; }
    // Logic similar to Bulk Import but using PRELOADED_ROSTER array
    // ... (omitted for brevity, same logic as boys app)
    alert("Please use Manual Import or paste roster into code first.");
  };

  const handleDeleteAllRoster = async () => {
    if (!confirm("⚠️ WARNING: This will DELETE EVERY STUDENT in the roster. Are you sure?")) return;
    setImportStatus('Deleting entire roster...');
    try {
        const q = query(collection(db, "roster"));
        const snapshot = await getDocs(q);
        const batchSize = 500;
        const docs = snapshot.docs;
        for (let i = 0; i < docs.length; i += batchSize) {
            const batch = writeBatch(db);
            const chunk = docs.slice(i, i + batchSize);
            chunk.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
        }
        setImportStatus('Roster wiped clean.');
    } catch (e: any) {
        setImportStatus('Error deleting: ' + e.message);
        if (e.message && e.message.includes("permissions")) setPermissionError(true);
    }
  };

  // --- RENDER HELPERS ---
  const filteredRoster = roster.filter(s => s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const getAbsentStudents = () => {
    const presentIds = new Set(todaysAttendance.map(a => a.studentId));
    return roster.filter(student => !presentIds.has(student.id));
  };

  // ---------------- UI ----------------

  if (permissionError) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-500 p-8 rounded-xl max-w-lg w-full text-center">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Database Locked</h2>
          <p className="text-gray-300 mb-6">Coach needs to fix Firebase security permissions.</p>
          <button onClick={() => window.location.reload()} className="bg-red-600 text-white font-bold py-3 px-6 rounded-lg w-full">Reload</button>
        </div>
      </div>
    );
  }

  if (appMode === 'coach' && !isCoachAuthenticated && !user?.isCoach) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-sm text-center">
          <Lock className="w-12 h-12 text-pink-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Coach Access</h2>
          <form onSubmit={unlockCoach}>
            <input type="password" placeholder="Password" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mb-4 text-center"
              value={passwordInput} onChange={e => setPasswordInput(e.target.value)} autoFocus />
            <button className="w-full bg-pink-600 text-white font-bold py-3 rounded-lg">Unlock</button>
          </form>
          <button onClick={() => setAppMode('athlete')} className="mt-6 text-gray-500 text-sm">Back to Athlete View</button>
        </div>
      </div>
    );
  }

  if ((appMode === 'coach' && isCoachAuthenticated) || user?.isCoach) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 pb-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Coach Dashboard</h1>
          <button onClick={() => { setIsCoachAuthenticated(false); setAppMode('athlete'); }} className="text-xs bg-red-900/50 px-3 py-1 rounded">Exit</button>
        </div>

        {/* Admin Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['live', 'content', 'history', 'roster'].map(t => (
            <button key={t} onClick={() => setAdminTab(t)} 
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap ${adminTab === t ? 'bg-pink-600' : 'bg-gray-800 text-gray-400'}`}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* LIVE TAB */}
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
                    <div>
                      <div className="font-bold">{r.name}</div>
                      <div className="text-xs text-gray-500">{r.time} • {r.weight}lbs</div>
                    </div>
                    <div className="flex items-center gap-2">
                       {!r.skinCheckPass && <AlertCircle className="w-4 h-4 text-red-500" />}
                       <button onClick={() => handleDeleteCheckIn(r.id, r.name)}><XCircle className="w-5 h-5 text-gray-500"/></button>
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
          <div className="space-y-4">
             {/* Report Builder */}
             <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  <h4 className="text-blue-300 font-bold">Report Builder</h4>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Start Date</label>
                    <input type="date" className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded p-2" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">End Date</label>
                    <input type="date" className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded p-2" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Filter by Athlete</label>
                    <select className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded p-2" value={reportStudentFilter} onChange={e => setReportStudentFilter(e.target.value)}>
                      <option value="">All Athletes</option>
                      {roster.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Filter by Grade/Group</label>
                    <select className="w-full bg-gray-800 border border-gray-600 text-white text-xs rounded p-2" value={reportGradeFilter} onChange={e => setReportGradeFilter(e.target.value)}>
                      <option value="">All Grades</option>
                      {[...new Set(roster.map(s => s.grade).filter(Boolean))].sort().map(g => (
                        <option key={String(g)} value={String(g)}>Grade {g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button onClick={handleGenerateReport} className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold py-2 px-3 rounded flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> Download Report (CSV)
                </button>
             </div>

             <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
               <div className="p-3 bg-gray-900/50 border-b border-gray-700 font-bold text-gray-300 text-xs uppercase tracking-wider">Recent Activity</div>
               <div className="divide-y divide-gray-700">
                  {historyStats.map((stat, idx) => (
                    <div key={idx} className="flex flex-col border-b border-gray-700/50 last:border-0">
                      <button onClick={() => setExpandedDate(expandedDate === stat.date ? null : stat.date)} className="p-4 flex justify-between items-center w-full hover:bg-gray-700/50">
                         <div className="flex items-center gap-3">
                           <Calendar className="w-5 h-5 text-gray-500" /><span className="font-bold text-gray-200">{stat.date}</span>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="bg-gray-800 px-3 py-1 rounded text-white font-bold">{stat.count}</span>
                            {expandedDate === stat.date ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                         </div>
                      </button>
                      {expandedDate === stat.date && (
                        <div className="bg-gray-900/50 p-4 border-t border-gray-700">
                          <button onClick={() => handleCopyForSheets(stat.date)} className="text-xs flex items-center gap-1 text-blue-400 mb-2">
                            {copiedDate === stat.date ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>} Copy for Sheets
                          </button>
                          <div className="space-y-1">
                            {historyRecords.filter(r => r.date === stat.date).map(s => (
                              <div key={s.id} className="flex justify-between text-sm text-gray-300 border-b border-gray-800 pb-1">
                                <span>{s.name}</span><span className="font-mono text-gray-500">{s.weight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
               </div>
             </div>
          </div>
        )}

        {/* CONTENT MANAGER TAB */}
        {adminTab === 'content' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Megaphone className="w-4 h-4 text-yellow-400"/> Post Announcement</h3>
              <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Message..." value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)} />
              <button onClick={handleAddAnnouncement} className="w-full bg-pink-600 py-2 rounded text-sm font-bold">Post</button>
            </div>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-3"><Youtube className="w-4 h-4 text-red-400"/> Add Video Resource</h3>
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Title" value={newVideoTitle} onChange={e => setNewVideoTitle(e.target.value)} />
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="URL" value={newVideoURL} onChange={e => setNewVideoURL(e.target.value)} />
              <button onClick={handleAddVideo} className="w-full bg-green-600 py-2 rounded text-sm font-bold">Add Video</button>
            </div>
            {/* Calendar Info */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
              <h3 className="font-bold flex items-center gap-2 mb-2"><Calendar className="w-4 h-4 text-purple-400"/> Calendar</h3>
              <p className="text-xs text-gray-400 mb-2">ID: <span className="font-mono text-white">{GOOGLE_CALENDAR_ID || "Not Set"}</span></p>
              <a href="https://calendar.google.com" target="_blank" rel="noreferrer" className="text-xs bg-gray-700 px-3 py-2 rounded text-white block text-center">Manage in Google Calendar</a>
            </div>
          </div>
        )}

        {/* ROSTER TAB */}
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
              {/* Removed Email Domain Warning Banner */}
              <input type="email" required className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="your.email@example.com" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
              <input type="password" required minLength={6} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Password (min 6 chars)" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              <input type="password" required minLength={6} className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              {error && <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded">{error}</div>}
              <button disabled={loading} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg transition-all">{loading ? 'Creating...' : 'Register'}</button>
              <button type="button" onClick={() => { setAuthView('login'); setError(''); }} className="w-full text-gray-500 text-xs mt-2">Back to Sign In</button>
            </form>
          )}

          <div className="mt-8 pt-8 border-t border-gray-700">
             <button onClick={() => { setIsCoachAuthenticated(true); setAppMode('coach'); }} className="text-gray-600 text-xs hover:text-gray-400 flex items-center justify-center gap-1 w-full">
               <Lock className="w-3 h-3"/> Coach Admin
             </button>
          </div>
        </div>
        {/* Coach Login Overlay */}
        {isCoachAuthenticated && !user?.email && (
             <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50">
                 <div className="bg-gray-800 p-8 rounded-xl w-full max-w-sm relative">
                    <button onClick={() => { setIsCoachAuthenticated(false); }} className="absolute top-4 right-4 text-gray-400"><XCircle/></button>
                    <h2 className="text-xl font-bold text-white mb-4">Coach Password</h2>
                    <input type="password" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mb-4" placeholder="••••••••" value={coachPassInput} onChange={e => setCoachPassInput(e.target.value)} autoFocus />
                    <button onClick={() => { if(coachPassInput === COACH_PASSWORD) { setIsCoachAuthenticated(true); setCoachPassInput(''); } else alert('Wrong'); }} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg">Access</button>
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
         {/* 1. CHECK IN */}
         {activeTab === 'checkin' && (
            <div className="animate-in fade-in">
               <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mb-6">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-pink-400"/> Daily Check-in</h2>
                  {currentStudent ? (
                    <div className="space-y-4">
                       <div className="bg-pink-900/20 p-3 rounded-lg border border-pink-800 text-pink-300 text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4"/> Checking in as <span className="font-bold">{selectedStudent ? selectedStudent.name : currentStudent.name}</span></div>
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
         {/* 2. JOURNAL */}
         {activeTab === 'journal' && (
            <div className="animate-in fade-in">
               <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl">
                  <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><BookOpen className="w-5 h-5 text-pink-400"/> Mindset & Nutrition</h2>
                  {currentStudent ? (
                    <div className="space-y-6">
                      {/* NUTRITION SECTION */}
                      <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-600">
                        <h3 className="text-gray-300 text-xs font-bold uppercase mb-3 flex items-center gap-2"><Utensils className="w-3 h-3 text-green-400"/> Daily Fuel</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                           <div>
                             <label className="text-xs text-gray-400 block mb-1">Vegetables?</label>
                             <div className="flex gap-1">
                               <button onClick={() => setNutritionVeggies(true)} className={`flex-1 py-2 rounded text-xs font-bold ${nutritionVeggies ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500'}`}>Yes</button>
                               <button onClick={() => setNutritionVeggies(false)} className={`flex-1 py-2 rounded text-xs font-bold ${!nutritionVeggies ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500'}`}>No</button>
                             </div>
                           </div>
                           <div>
                             <label className="text-xs text-gray-400 block mb-1">Fruit?</label>
                             <div className="flex gap-1">
                               <button onClick={() => setNutritionFruit(true)} className={`flex-1 py-2 rounded text-xs font-bold ${nutritionFruit ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-500'}`}>Yes</button>
                               <button onClick={() => setNutritionFruit(false)} className={`flex-1 py-2 rounded text-xs font-bold ${!nutritionFruit ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500'}`}>No</button>
                             </div>
                           </div>
                        </div>
                        <div>
                           <label className="text-xs text-gray-400 block mb-2 flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-400"/> Water Intake (Bottles)</label>
                           <div className="flex items-center justify-between bg-gray-800 rounded-lg p-2">
                              <button onClick={() => setNutritionWater(Math.max(0, nutritionWater-1))} className="w-8 h-8 bg-gray-700 rounded text-white font-bold">-</button>
                              <span className="text-xl font-mono font-bold text-blue-400">{nutritionWater}</span>
                              <button onClick={() => setNutritionWater(nutritionWater+1)} className="w-8 h-8 bg-gray-700 rounded text-white font-bold">+</button>
                           </div>
                        </div>
                      </div>

                      {/* MINDSET SECTION */}
                      <div><label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Daily Gratitude</label><textarea className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white text-sm h-20" placeholder="I am grateful for..." value={journalGratitude} onChange={(e) => setJournalGratitude(e.target.value)}/></div>
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">Focus Word</label>
                        <div className="flex flex-wrap gap-2">{['Consistent', 'Persistent', 'Resilient', 'Relentless', 'Respectful'].map(word => <button key={word} onClick={() => setFocusWord(word)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${focusWord === word ? 'bg-pink-600 border-pink-500' : 'bg-gray-700 border-gray-600'}`}>{word}</button>)}</div>
                      </div>
                      
                      {/* TECHNICAL FOCUS */}
                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-2 flex items-center gap-1"><Swords className="w-3 h-3"/> Position of the Day</label>
                        <select className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white text-sm outline-none focus:border-pink-500" value={techFocus} onChange={(e) => setTechFocus(e.target.value)}>
                          <option value="">Select Focus...</option>
                          {['Neutral', 'Top', 'Bottom', 'Takedowns', 'Escapes', 'Pinning', 'Defense', 'Scramble', 'Conditioning'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-gray-400 text-xs uppercase font-bold mb-2 block">My Mantra</label>
                        <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white text-sm" placeholder="e.g. I am unstoppable." value={dailyMantra} onChange={(e) => setDailyMantra(e.target.value)}/>
                      </div>

                      {/* WELLNESS */}
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
         {/* 3. FOCUS */}
         {activeTab === 'focus' && (
           <div className="animate-in fade-in h-full flex flex-col">
             {currentStudent ? (
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
             ) : <div className="text-center text-gray-400 py-4">Loading profile...</div>}
           </div>
         )}
         {/* 4. RESOURCES */}
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
         {/* 5. CALENDAR */}
         {activeTab === 'calendar' && (
            <div className="space-y-3 animate-in fade-in">
              <h2 className="text-2xl font-bold text-white mb-4">Schedule</h2>
              <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 p-1">
                 <iframe src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(GOOGLE_CALENDAR_ID)}&ctz=America%2FChicago&mode=AGENDA&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=0&showCalendars=0&theme=DARK`} style={{border: 0, width: "100%", height: "400px"}} frameBorder="0" scrolling="no"></iframe>
              </div>
              <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(GOOGLE_CALENDAR_ID)}`} target="_blank" rel="noreferrer" className="block w-full text-center bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-all">+ Add to My Calendar</a>
            </div>
         )}
         {/* 6. STATS */}
         {activeTab === 'stats' && (
             <div className="space-y-4 animate-in fade-in">
                 <h2 className="text-2xl font-bold text-white">My History</h2>
                 {currentStudent ? (
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
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
