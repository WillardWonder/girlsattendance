import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, sendPasswordResetEmail, browserLocalPersistence, setPersistence, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, where, deleteDoc, limit, setDoc, getDoc, writeBatch, updateDoc, arrayUnion, arrayRemove, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { 
  CheckCircle, AlertCircle, Calendar, Clock, 
  Trash2, Lock, Unlock, BarChart3, Download, ChevronDown, ChevronUp, Copy, Check, 
  CloudLightning, Video, Youtube, Megaphone, ExternalLink, ShieldAlert, 
  BookOpen, Battery, Smile, Zap, Target, Play, RotateCcw, LogOut, Mail,
  Dumbbell, Heart, DollarSign, GraduationCap, PartyPopper, Flame, Brain, Trophy, Leaf, Droplets, Swords, Lightbulb, Edit3, Users, Search, Scale, UserCheck, UserX, LayoutDashboard, Plus,
  XCircle, AlertTriangle, UploadCloud, MessageCircle, Send, Filter, Hash, Star, Timer, Menu, Grid, HelpCircle, Info,
  ChevronLeft, PlayCircle, ChevronRight, Moon, Coffee, Utensils, Activity, Flag, MessageSquare, Image as ImageIcon
} from 'lucide-react';

// --- CONFIGURATION (RESTORED YOUR SPECIFIC KEYS) ---
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

// Handle auth persistence
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Auth persistence warning:", error);
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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('lastActiveTab') || 'daily');
  const [showMenu, setShowMenu] = useState(false);
  const [appMode, setAppMode] = useState<'athlete' | 'coach'>('athlete');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [roster, setRoster] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [countdowns, setCountdowns] = useState<any[]>([]);
  
  // Coach Settings State
  const [coachSettings, setCoachSettings] = useState<any>({
    weeklyThemes: DEFAULT_TECH_FOCUS,
    mainShot: "Double Leg"
  });

  // --- DAILY FLOW STATE ---
  const [dailyStep, setDailyStep] = useState(0); 
  const [dailyHabits, setDailyHabits] = useState({
    sleep: '7–8', bedtime: 'On time', fellAsleepFast: 'Yes',
    hydration: 'Okay', fruit: 'No', veggie: 'No', barrier: ''
  });
  const [dailyPractice, setDailyPractice] = useState({
    attended: 'Yes', absenceReason: '',
    effortWeights: 3, effortDrilling: 3, effortLive: 3,
    matches: 0, warmup: 1, cooldown: 1
  });
  const [dailyMindset, setDailyMindset] = useState({
    techFocus: '', attemptedShot: 'No', resetWord: 'No',
    mantra: '', reflectionGood: '', reflectionImprove: ''
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
  const [isCoachAuthenticated, setIsCoachAuthenticated] = useState(false);
  const [showCoachLoginModal, setShowCoachLoginModal] = useState(false);
  const [coachPassInput, setCoachPassInput] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoURL, setNewVideoURL] = useState('');
  const [newVideoTags, setNewVideoTags] = useState('');
  const [newVideoThumbnail, setNewVideoThumbnail] = useState(''); 
  const [autoAnnounceVideo, setAutoAnnounceVideo] = useState(false);
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
  
  const formatDateSafe = (dateVal: any) => {
    if (!dateVal) return '';
    if (typeof dateVal === 'object' && dateVal.seconds) {
        return new Date(dateVal.seconds * 1000).toLocaleDateString();
    }
    return String(dateVal); 
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
      localStorage.setItem('lastActiveTab', tabName);
      setActivePost(null); 
      window.scrollTo(0, 0); 
  };
  
  const startDiscussion = (item: any, type: 'announcement' | 'resource') => {
      const postData = {
          id: item.id,
          message: item.message || item.title,
          date: formatDateSafe(item.date) || new Date().toLocaleDateString(),
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

  const unlockCoach = (e: React.FormEvent) => { 
      e.preventDefault(); 
      if(coachPassInput === COACH_ACCESS_CODE) { 
          setIsCoachAuthenticated(true); 
          setAppMode('coach');
          setShowCoachLoginModal(false);
          setCoachPassInput(''); 
      } else { 
          alert('Wrong Code'); 
      } 
  };

  const handleAddAnnouncement = async () => { if(!newAnnouncement) return; await addDoc(collection(db, "announcements"), { message: newAnnouncement, timestamp: new Date().toISOString(), date: new Date().toLocaleDateString() }); setNewAnnouncement(''); alert('Posted!'); };
  
  // NEW: Auto-Fetch helper
  const fetchAutoThumbnail = async (url: string) => {
      try {
          // Use NoEmbed to fetch metadata
          const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
          const data = await response.json();
          // NoEmbed returns data.thumbnail_url or data.thumbnail_url_with_play_button
          return data.thumbnail_url || null;
      } catch (e) {
          console.warn("Auto-thumbnail fetch failed", e);
          return null;
      }
  };

  const handleAddVideo = async () => { 
    if(!newVideoTitle || !newVideoURL) return; 
    setLoading(true); // Loading indication

    let finalThumbnail = newVideoThumbnail;
    // If no manual thumbnail, try to fetch one automatically
    if (!finalThumbnail) {
        finalThumbnail = await fetchAutoThumbnail(newVideoURL) || '';
    }

    const tags = newVideoTags.split(',').map(t => t.trim()).filter(t => t);
    
    await addDoc(collection(db, "resources"), { 
      title: newVideoTitle, 
      url: newVideoURL, 
      thumbnail: finalThumbnail, // Save result
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

    setNewVideoTitle(''); setNewVideoURL(''); setNewVideoTags(''); setNewVideoThumbnail(''); setAutoAnnounceVideo(false); 
    setLoading(false);
    alert('Video Added' + (autoAnnounceVideo ? ' & Announced!' : '!')); 
  };

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


  // --- DATA LOADING & EFFECTS ---
  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
        try {
            // Load announcements (Root path)
            const newsQ = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(10));
            const newsSnap = await getDocs(newsQ);
            setAnnouncements(newsSnap.docs.map(d => ({id: d.id, ...d.data()})));

            // Load resources (Root path)
            const resQ = query(collection(db, "resources"), orderBy("timestamp", "desc"));
            const resSnap = await getDocs(resQ);
            setResources(resSnap.docs.map(d => ({id: d.id, ...d.data()})));

             // Load roster (Root path)
             const rosterQ = query(collection(db, "roster"));
             const rosterSnap = await getDocs(rosterQ);
             setRoster(rosterSnap.docs.map(doc => {
                 const d = doc.data();
                 const fName = d.First_Name || d.firstname || '';
                 const lName = d.Last_Name || d.lastname || '';
                 return { id: doc.id, name: `${lName}, ${fName}`, email: d.Email || d.email, ...d };
             }).sort((a, b) => a.name.localeCompare(b.name))); 
        } catch (e) {
            console.error("Fetch public data error:", e);
        }
    };
    fetchData();
  }, [user]);

  // --- AUTH INITIALIZATION ---
  useEffect(() => {
    const initAuth = async () => {
      // For this user-provided config, standard auth flow in handleAuth is sufficient
    };
    initAuth();

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

  // --- BANK & PROFILE LOADER ---
  useEffect(() => {
    if (!user) return;
    
    // Load Profile
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
            } else {
                 setFoundationLocked(true);
            }
        } else {
            // First time setup - create profile doc
            setDoc(docRef, { joined: new Date().toISOString() }, { merge: true });
            switchTab('foundation');
            setFoundationLocked(false);
        }
    });

    loadConfidenceBank(user.uid);
    loadStudentStats(user.uid);

    return () => unsubscribeProfile();
  }, [user]);

  // --- CONFIDENCE BANK (Root Path: daily_logs where uid == user.uid) ---
  const loadConfidenceBank = async (uid: string) => {
    try {
      const q1 = query(collection(db, "daily_logs"), where("uid", "==", uid));
      const snap1 = await getDocs(q1);
      
      const dailyDeposits: any[] = [];
      snap1.docs.forEach(d => {
         const data = d.data();
         if(data.mentalImprovement) dailyDeposits.push({ id: d.id + '_imp', date: data.date, timestamp: data.timestamp, text: `Improvement: ${data.mentalImprovement}`, type: 'improvement' });
         if(data.gratitude) dailyDeposits.push({ id: d.id + '_grat', date: data.date, timestamp: data.timestamp, text: `Gratitude: ${data.gratitude}`, type: 'gratitude' });
         if(data.type === 'foundation_log') dailyDeposits.push({ id: d.id + '_fnd', date: data.date, timestamp: data.timestamp, text: `Foundation: ${data.mentalImprovement}`, type: 'foundation' });
      });

      // Match logs
      const q2 = query(collection(db, "match_logs"), where("uid", "==", uid));
      const snap2 = await getDocs(q2);
      snap2.docs.forEach(d => {
         const data = d.data();
         if(data.result === 'Win') dailyDeposits.push({ id: d.id + '_win', date: data.date, timestamp: data.timestamp, text: `WIN vs ${data.opponent}`, type: 'win' });
         if(data.reflection?.well) dailyDeposits.push({ id: d.id + '_well', date: data.date, timestamp: data.timestamp, text: `Match Highlight: ${data.reflection.well}`, type: 'match_well' });
      });

      const sorted = dailyDeposits.sort((a,b) => {
          const tA = new Date(a.timestamp || a.date).getTime();
          const tB = new Date(b.timestamp || b.date).getTime();
          return tB - tA;
      });

      setConfidenceDeposits(sorted);
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

  // --- COACH DASHBOARD DATA ---
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
    }
  }, [appMode, isCoachAuthenticated, adminTab, user]);

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
        mentalImprovement: dailyMindset.reflectionImprove, 
        gratitude: dailyMindset.reflectionGood,
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

        let prompt = "Great consistency.";
        if (dailyHabits.sleep === '<6' || dailyHabits.sleep === '6–7') prompt = "Sleep is your weapon. Aim for 30m earlier tonight.";
        else if (dailyPractice.effortLive > 4) prompt = "High effort today. Hydrate well tonight.";
        else if (dailyMindset.attemptedShot === 'No') prompt = "Visualize hitting your main shot 5 times before bed.";
        setMicroPrompt(prompt);

        const randomFact = ROTATING_TIPS[Math.floor(Math.random() * ROTATING_TIPS.length)];
        setRandomTip(randomFact);
        
        setDailyStep(3); 
        loadConfidenceBank(user.uid); 
        loadStudentStats(user.uid);
    } catch (e) {
        console.error("Submit error", e);
        setError("Failed to save. Try again.");
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
    await addDoc(collection(db, "match_logs"), data); 
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
    await addDoc(collection(db, "weekly_prep"), data);
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
                          <input type="password" className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg mb-4 text-center tracking-widest" placeholder="ACCESS CODE" value={coachPassInput} onChange={e => setCoachPassInput(e.target.value)} autoFocus />
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
          {['dashboard', 'roster', 'content'].map(t => (
            <button key={t} onClick={() => setAdminTab(t)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap uppercase tracking-wider ${adminTab === t ? 'bg-pink-600 text-white' : 'bg-gray-800 text-gray-400'}`}>{t}</button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
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
                       {todaysAttendance.filter(r => r.focusWord === 'Injured' || !r.attended).length}
                    </div>
                    <p className="text-xs text-gray-500">Injury / Missed</p>
                 </div>
              </div>
           </div>
        )}

        {/* ROSTER TAB */}
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
              {/* NEW THUMBNAIL INPUT */}
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Thumbnail Image URL (Optional - leave blank to auto-fetch)" value={newVideoThumbnail} onChange={e => setNewVideoThumbnail(e.target.value)} />
              <input className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white mb-2" placeholder="Tags (comma separated: Takedown, Drill)" value={newVideoTags} onChange={e => setNewVideoTags(e.target.value)} />
              
              <button onClick={handleAddVideo} disabled={loading} className="w-full bg-green-600 py-2 rounded text-sm font-bold disabled:opacity-50">
                  {loading ? 'Processing...' : 'Add Video'}
              </button>
            </div>
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
                             <label className="text-gray-400 text-xs font-bold uppercase block mb-2">What went well? (Gratitude)</label>
                             <input 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white mb-2 focus:border-pink-500 outline-none transition-colors"
                                placeholder="My motion was great..."
                                value={dailyMindset.reflectionGood}
                                onChange={(e) => setDailyMindset({...dailyMindset, reflectionGood: e.target.value})}
                             />
                             <label className="text-gray-400 text-xs font-bold uppercase block mb-2 mt-4">1 Thing to Improve</label>
                             <input 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-pink-500 outline-none transition-colors"
                                placeholder="Commit to the first shot..."
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
                    
                    <button onClick={() => setDailyStep(0)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 mx-auto"><Edit3 className="w-4 h-4"/> Edit / New Entry</button>
                 </div>
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
                   {announcements.length === 0 && <div className="text-gray-500 text-center py-4">No announcements yet.</div>}
                   {announcements.map(post => (
                      <div key={post.id} onClick={() => startDiscussion(post, 'announcement')} className="bg-gray-800 p-4 rounded-xl border border-gray-700 active:bg-gray-700 transition-colors cursor-pointer">
                         <div className="flex justify-between items-start mb-2">
                            <span className="bg-pink-900/50 text-pink-300 text-[10px] px-2 py-1 rounded font-bold uppercase">News</span>
                            <span className="text-gray-500 text-[10px]">{formatDateSafe(post.date)}</span>
                         </div>
                         <p className="text-white text-sm line-clamp-2">{String(post.message)}</p>
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
                      <p className="text-white text-sm font-medium">{String(activePost.message)}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateSafe(activePost.date)}</p>
                   </div>
                   
                   <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {postComments.length === 0 ? (
                         <div className="text-center text-gray-600 text-xs py-8">No comments yet. Be the first!</div>
                      ) : (
                         postComments.map(comment => (
                            <div key={comment.id} className={`flex flex-col ${comment.userId === user.uid ? 'items-end' : 'items-start'}`}>
                               <div className={`max-w-[85%] rounded-xl p-3 ${comment.userId === user.uid ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-700 text-gray-200 rounded-tl-none'}`}>
                                  <p className="text-xs font-bold mb-1 opacity-70">{comment.userName}</p>
                                  <p className="text-sm">{String(comment.text)}</p>
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

        {/* --- TAB 4: FOUNDATION --- */}
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
                         {(studentHistory && studentHistory.length > 0) ? Math.round(studentHistory.reduce((acc, curr) => {
                             // SAFE GUARDED SLEEP CALCULATION
                             let hours = 0;
                             if (typeof curr.sleep === 'string') {
                                 hours = parseFloat(curr.sleep);
                             } else if (curr.sleep && typeof curr.sleep === 'object' && curr.sleep.hours) {
                                 hours = parseFloat(curr.sleep.hours);
                             }
                             return acc + (isNaN(hours) ? 0 : hours);
                         }, 0) / studentHistory.length) : '-'}
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

        {/* --- TAB 5: BANK (FIXED) --- */}
        {activeTab === 'bank' && (
           <div className="space-y-6 animate-in fade-in max-w-xl mx-auto">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500"/> Confidence Bank</h2>
             <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {confidenceDeposits.length === 0 ? <div className="p-8 text-center text-gray-500"><Leaf className="w-12 h-12 mx-auto mb-2 opacity-20"/><p>No deposits yet.</p></div> : <div className="divide-y divide-gray-700">{confidenceDeposits.map(d => <div key={d.id} className="p-4"><div className="text-xs text-blue-400 font-mono mb-1">{formatDateSafe(d.date)}</div><div className="text-white text-sm font-medium">"{String(d.text)}"</div></div>)}</div>}
             </div>
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

        {/* --- TAB: WEEKLY (Restored) --- */}
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
                        (1=Red Zone; 10=Green Zone)
                    </span>
                  </label>
                  <div className="flex items-center gap-4">
                    <input type="range" min="1" max="10" value={weeklyRecovery} onChange={(e) => setWeeklyRecovery(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    <span className="text-xl font-bold text-blue-400">{weeklyRecovery}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Goal for this week</label>
                  <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white h-24" placeholder="Specific, Measurable, Achievable..." value={weeklyGoal} onChange={e => setWeeklyGoal(e.target.value)} />
                </div>
                <button onClick={submitWeekly} disabled={loading} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-xl shadow-lg">Submit Weekly Prep</button>
             </div>
             )}
          </div>
        )}

        {/* --- TAB: SCHEDULE (Restored) --- */}
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

        {/* --- TAB: LIBRARY (Restored) --- */}
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
                 const isFav = userProfile?.favorites?.includes(r.id); 
                 
                 // USE CUSTOM THUMBNAIL IF AVAILABLE, ELSE YOUTUBE, ELSE NULL
                 const thumbnailUrl = r.thumbnail || (meta.type === 'youtube' && meta.id 
                    ? `https://img.youtube.com/vi/${meta.id}/hqdefault.jpg` 
                    : null);

                 const IconComponent = meta.icon;
                 
                 return (
                   <div key={r.id} className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 flex flex-col group hover:border-gray-500 transition-colors">
                     <button 
                        onClick={() => openVideoExternally(r.url)}
                        className={`aspect-video bg-black relative w-full flex flex-col items-center justify-center ${thumbnailUrl ? 'bg-cover bg-center' : ''}`} 
                        style={{ 
                            backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : 'none' 
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
