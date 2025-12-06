import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, where, deleteDoc, limit, setDoc, getDoc } from 'firebase/firestore';
import { 
  CheckCircle, AlertCircle, Calendar, Clock, 
  Trash2, Lock, Unlock, BarChart3, Download, ChevronDown, ChevronUp, Copy, Check, 
  CloudLightning, Video, Youtube, Megaphone, ExternalLink, ShieldAlert, 
  BookOpen, Battery, Smile, Zap, Target, Play, RotateCcw, LogOut, Mail,
  Dumbbell, Heart, DollarSign, GraduationCap, PartyPopper, Flame, Brain, Trophy, Leaf, Droplets, Swords, Lightbulb
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

// Hardcoded for build stability
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzNBJdt_3dEJs9pRukUfRduhd9IkY6n1ZcQ3MhkbqxJ8ThxFIusYb3aGYrCbUYhhkY/exec"; 
const COACH_PASSWORD = "bluejays";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const App = () => {
  // Auth State
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null); // Stores the "Foundation" data
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  
  // App State
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // --- TAB 1: DAILY GRIND STATE ---
  const [sleepHours, setSleepHours] = useState('');
  const [sleepQuality, setSleepQuality] = useState('Good');
  const [energyColor, setEnergyColor] = useState(''); // 'green', 'yellow', 'red'
  const [nutrition, setNutrition] = useState({ veggies: false, protein: false, fruit: false, grain: false });
  const [hydration, setHydration] = useState(0);
  const [balance, setBalance] = useState({ faith: 5, family: 5, fitness: 5, finances: 5, academics: 5, fun: 5 });
  const [mentalImprovement, setMentalImprovement] = useState('');
  const [mentalTeammate, setMentalTeammate] = useState('');

  // --- TAB 2: MATCH DAY STATE ---
  const [matchEvent, setMatchEvent] = useState('');
  const [matchOpponent, setMatchOpponent] = useState('');
  const [matchResult, setMatchResult] = useState('Win');
  const [matchWell, setMatchWell] = useState('');
  const [matchLearn, setMatchLearn] = useState('');

  // --- TAB 3: SUNDAY LAUNCH STATE ---
  const [weeklyAcademic, setWeeklyAcademic] = useState('No');
  const [weeklyWeight, setWeeklyWeight] = useState('Yes');
  const [weeklyRecovery, setWeeklyRecovery] = useState(5);
  const [weeklyGoal, setWeeklyGoal] = useState('');
  // Focus Grid State
  const [focusState, setFocusState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [focusGrid, setFocusGrid] = useState<number[]>([]);
  const [focusNextNumber, setFocusNextNumber] = useState(0);
  const [focusTime, setFocusTime] = useState(0); // Count up timer

  // --- TAB 4: FOUNDATION STATE ---
  const [identityWords, setIdentityWords] = useState(['', '', '', '', '']);
  const [whyLevels, setWhyLevels] = useState(['', '', '']); // Join, Important, Root
  const [purposeStatement, setPurposeStatement] = useState('');
  const [showIdentityExamples, setShowIdentityExamples] = useState(false);

  // --- TAB 5: CONFIDENCE BANK ---
  const [confidenceDeposits, setConfidenceDeposits] = useState<any[]>([]);

  // --- AUTH & PROFILE LOADING ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load Profile (Foundation)
        const docRef = doc(db, "user_profiles", currentUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserProfile(data);
          // Pre-fill foundation form
          if (data.identity) setIdentityWords(data.identity);
          if (data.whys) setWhyLevels(data.whys);
          if (data.purpose) setPurposeStatement(data.purpose);

          // SMART REDIRECT: Only force Foundation tab if they haven't filled out their Identity yet
          if (!data.identity || data.identity[0] === '') {
             setActiveTab('foundation');
          } else {
             setActiveTab('daily');
          }
        } else {
          // No profile doc at all? Send to Foundation tab
          setActiveTab('foundation');
        }
        // Load Confidence Bank
        loadConfidenceBank(currentUser.uid);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadConfidenceBank = async (uid: string) => {
    const q = query(collection(db, "daily_logs"), where("uid", "==", uid), orderBy("timestamp", "desc"), limit(50));
    const snap = await getDocs(q);
    const deposits = snap.docs.map(d => ({ 
      id: d.id, 
      date: d.data().date, 
      improvement: d.data().mentalImprovement 
    })).filter(d => d.improvement); // Only show entries with text
    setConfidenceDeposits(deposits);
  };

  // --- SYNC TO GOOGLE SHEETS ---
  const syncToSheets = async (data: any) => {
    if (!GOOGLE_SCRIPT_URL) return;
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (e) { console.error("Sheet Sync Error", e); }
  };

  // --- HANDLERS ---

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (authView === 'login') {
        await signInWithEmailAndPassword(auth, emailInput, passwordInput);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        // Create initial empty profile doc
        await setDoc(doc(db, "user_profiles", cred.user.uid), { email: emailInput, joined: new Date().toISOString() });
      }
    } catch (err: any) {
      setError(err.message.replace('Firebase:', ''));
    } finally { setLoading(false); }
  };

  // TAB 1: DAILY GRIND SUBMIT
  const submitDaily = async () => {
    if (!energyColor || !sleepHours) { alert("Please fill out Sleep and Energy sections."); return; }
    setLoading(true);
    const data = {
      uid: user.uid,
      email: user.email,
      type: 'daily_log',
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      sleep: { hours: sleepHours, quality: sleepQuality },
      energy: energyColor,
      nutrition,
      hydration,
      balance,
      mentalImprovement,
      mentalTeammate
    };
    await addDoc(collection(db, "daily_logs"), data);
    syncToSheets(data);
    setSuccessMsg("Day Logged! 1% Better.");
    setTimeout(() => setSuccessMsg(''), 3000);
    setLoading(false);
    // Refresh bank
    loadConfidenceBank(user.uid);
  };

  // TAB 2: MATCH SUBMIT
  const submitMatch = async () => {
    if (!matchEvent || !matchOpponent) { alert("Please fill match details."); return; }
    setLoading(true);
    const data = {
      uid: user.uid,
      type: 'match_log',
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      event: matchEvent,
      opponent: matchOpponent,
      result: matchResult,
      reflection: { well: matchWell, learn: matchLearn }
    };
    await addDoc(collection(db, "match_logs"), data);
    syncToSheets(data);
    setSuccessMsg("Match Recorded.");
    setTimeout(() => { setSuccessMsg(''); setMatchOpponent(''); setMatchWell(''); setMatchLearn(''); }, 3000);
    setLoading(false);
  };

  // TAB 3: FOCUS GRID LOGIC
  useEffect(() => {
    let timer: any;
    if (focusState === 'playing') {
      timer = setInterval(() => { setFocusTime(t => t + 1); }, 1000);
    }
    return () => clearInterval(timer);
  }, [focusState]);

  const startFocus = () => {
    const nums = Array.from({length: 100}, (_, i) => i);
    // Shuffle
    for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
    setFocusGrid(nums); setFocusNextNumber(0); setFocusTime(0); setFocusState('playing');
  };

  const tapFocusNumber = (num: number) => {
    if (num === focusNextNumber) {
      if (num === 99) {
        setFocusState('finished');
      } else {
        setFocusNextNumber(n => n + 1);
      }
    }
  };

  // TAB 3: WEEKLY PREP SUBMIT
  const submitWeekly = async () => {
    setLoading(true);
    const data = {
      uid: user.uid,
      type: 'weekly_prep',
      timestamp: new Date().toISOString(),
      date: new Date().toLocaleDateString(),
      focus_time: focusState === 'finished' ? focusTime : 'Did not finish',
      academic_check: weeklyAcademic,
      weight_check: weeklyWeight,
      recovery_score: weeklyRecovery,
      weekly_goal: weeklyGoal
    };
    await addDoc(collection(db, "weekly_prep"), data);
    syncToSheets(data);
    setSuccessMsg("Week Launched!");
    setTimeout(() => setSuccessMsg(''), 3000);
    setLoading(false);
  };

  // TAB 4: FOUNDATION SAVE
  const saveFoundation = async () => {
    setLoading(true);
    const data = {
      identity: identityWords,
      whys: whyLevels,
      purpose: purposeStatement,
      updated: new Date().toISOString()
    };
    await setDoc(doc(db, "user_profiles", user.uid), data, { merge: true });
    setUserProfile({ ...userProfile, ...data });
    setSuccessMsg("Foundation Saved.");
    setTimeout(() => setSuccessMsg(''), 3000);
    setLoading(false);
  };


  // --- VIEWS ---

  if (authLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Loading...</div>;

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6">
        <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
             <Brain className="w-12 h-12 text-pink-500 mx-auto mb-2" />
             <h1 className="text-2xl font-extrabold text-white">Merrill Smart Journal</h1>
             <p className="text-pink-400 text-sm font-bold uppercase tracking-widest">My Mind Masters Me</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <h2 className="text-white font-bold text-lg">{authView === 'login' ? 'Sign In' : 'New Account'}</h2>
            <input type="email" required className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Email" value={emailInput} onChange={e => setEmailInput(e.target.value)} />
            <input type="password" required className="w-full bg-gray-900 border border-gray-600 text-white p-3 rounded-lg" placeholder="Password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
            {error && <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded">{error}</div>}
            <button disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg transition-all">{loading ? '...' : (authView === 'login' ? 'Sign In' : 'Create Account')}</button>
            <div className="text-center text-xs text-gray-400 mt-4">
              <button type="button" onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')} className="text-pink-400 hover:text-pink-300 font-bold">
                {authView === 'login' ? 'Need an account? Sign Up' : 'Have an account? Sign In'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // MAIN APP
  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans pb-24">
      
      {/* HEADER */}
      <div className="bg-gray-900 p-4 border-b border-gray-800 sticky top-0 z-10 shadow-lg flex justify-between items-center">
         <div><h1 className="text-lg font-extrabold text-white">Smart Journal</h1></div>
         <button onClick={() => { signOut(auth); }} className="bg-gray-800 p-2 rounded-full hover:bg-gray-700"><LogOut className="w-4 h-4 text-gray-400"/></button>
      </div>

      {/* SUCCESS POPUP */}
      {successMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-xl z-50 font-bold animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5" /> {successMsg}
        </div>
      )}

      {/* TABS CONTENT */}
      <div className="p-4 max-w-lg mx-auto">

        {/* --- TAB 1: DAILY GRIND --- */}
        {activeTab === 'daily' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500"/> The Daily Grind</h2>
            
            {/* Wellness Section */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">1. Wellness Check</h3>
               
               {/* Sleep */}
               <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                   <label className="text-xs text-gray-500 mb-1 block">Hours Sleep</label>
                   <input type="number" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={sleepHours} onChange={e => setSleepHours(e.target.value)} />
                 </div>
                 <div>
                   <label className="text-xs text-gray-500 mb-1 block">Quality</label>
                   <div className="flex bg-gray-900 rounded border border-gray-600 overflow-hidden">
                     {['Good', 'Bad'].map(q => (
                       <button key={q} onClick={() => setSleepQuality(q)} className={`flex-1 py-2 text-xs font-bold ${sleepQuality === q ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>{q}</button>
                     ))}
                   </div>
                 </div>
               </div>

               {/* Energy Light */}
               <div className="mb-4">
                 <label className="text-xs text-gray-500 mb-2 block">Energy Traffic Light</label>
                 <div className="flex gap-2">
                   <button onClick={() => setEnergyColor('green')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${energyColor === 'green' ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
                     🟢 Explosive
                   </button>
                   <button onClick={() => setEnergyColor('yellow')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${energyColor === 'yellow' ? 'bg-yellow-900/50 border-yellow-500 text-yellow-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
                     🟡 Steady
                   </button>
                   <button onClick={() => setEnergyColor('red')} className={`flex-1 py-3 rounded-lg border-2 text-xs font-bold ${energyColor === 'red' ? 'bg-red-900/50 border-red-500 text-red-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}>
                     🔴 Tired
                   </button>
                 </div>
               </div>

               {/* Nutrition */}
               <div className="mb-4">
                 <label className="text-xs text-gray-500 mb-2 block">Nutrition</label>
                 <div className="grid grid-cols-2 gap-2">
                   {['Veggies', 'Protein', 'Fruit', 'Grain'].map(item => (
                     <button 
                       key={item} 
                       onClick={() => setNutrition({...nutrition, [item.toLowerCase()]: !nutrition[item.toLowerCase() as keyof typeof nutrition]})}
                       className={`py-2 px-3 rounded border text-xs font-bold flex items-center justify-between ${nutrition[item.toLowerCase() as keyof typeof nutrition] ? 'bg-green-900/30 border-green-500 text-green-400' : 'bg-gray-900 border-gray-700 text-gray-500'}`}
                     >
                       {item} {nutrition[item.toLowerCase() as keyof typeof nutrition] && <Check className="w-3 h-3"/>}
                     </button>
                   ))}
                 </div>
               </div>

               {/* Hydration */}
               <div>
                  <label className="text-xs text-gray-500 mb-2 block flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-400"/> Water Bottles</label>
                  <div className="flex items-center gap-4 bg-gray-900 p-2 rounded-lg justify-center">
                    <button onClick={() => setHydration(Math.max(0, hydration - 1))} className="w-8 h-8 bg-gray-700 rounded text-white">-</button>
                    <span className="text-xl font-mono font-bold">{hydration}</span>
                    <button onClick={() => setHydration(hydration + 1)} className="w-8 h-8 bg-gray-700 rounded text-white">+</button>
                  </div>
               </div>
            </div>

            {/* Balance Section */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">2. The 6 Balance Check (1-10)</h3>
               <div className="space-y-4">
                 {[
                   { id: 'faith', label: 'Faith / Spiritual', icon: <BookOpen className="w-4 h-4 text-purple-400"/> },
                   { id: 'family', label: 'Family', icon: <Users className="w-4 h-4 text-blue-400"/> },
                   { id: 'fitness', label: 'Fitness', icon: <Dumbbell className="w-4 h-4 text-red-400"/> },
                   { id: 'finances', label: 'Finances', icon: <DollarSign className="w-4 h-4 text-green-400"/> },
                   { id: 'academics', label: 'Academics', icon: <GraduationCap className="w-4 h-4 text-yellow-400"/> },
                   { id: 'fun', label: 'Fun', icon: <PartyPopper className="w-4 h-4 text-pink-400"/> },
                 ].map(item => (
                   <div key={item.id}>
                     <div className="flex justify-between text-xs mb-1">
                       <span className="flex items-center gap-2 text-gray-300">{item.icon} {item.label}</span>
                       <span className="font-mono text-white">{balance[item.id as keyof typeof balance]}</span>
                     </div>
                     <input 
                       type="range" min="1" max="10" 
                       value={balance[item.id as keyof typeof balance]} 
                       onChange={(e) => setBalance({...balance, [item.id]: parseInt(e.target.value)})}
                       className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                     />
                   </div>
                 ))}
               </div>
            </div>

            {/* Mental Grind */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">3. The Mental Grind</h3>
               <div className="space-y-3">
                 <div>
                   <label className="text-xs text-white block mb-1">What is the 1% specific thing I improved today?</label>
                   <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" value={mentalImprovement} onChange={e => setMentalImprovement(e.target.value)} />
                 </div>
                 <div>
                   <label className="text-xs text-white block mb-1">Teammate Check: Who did I help?</label>
                   <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white" value={mentalTeammate} onChange={e => setMentalTeammate(e.target.value)} />
                 </div>
               </div>
            </div>

            <button onClick={submitDaily} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl shadow-lg">Submit Daily Log</button>
          </div>
        )}

        {/* --- TAB 2: MATCH DAY --- */}
        {activeTab === 'match' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Swords className="w-5 h-5 text-red-500"/> Match Day Review</h2>
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Event Name</label>
                <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" placeholder="e.g. Regional Tournament" value={matchEvent} onChange={e => setMatchEvent(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Opponent</label>
                  <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={matchOpponent} onChange={e => setMatchOpponent(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Result</label>
                  <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={matchResult} onChange={e => setMatchResult(e.target.value)}>
                    <option>Win</option>
                    <option>Loss</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 border-t border-gray-700">
                <h3 className="text-sm font-bold text-white mb-2">Win or Learn</h3>
                <div className="mb-3">
                  <label className="text-xs text-gray-400 block mb-1">What went well?</label>
                  <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white h-20" placeholder="Setups, motion, attitude..." value={matchWell} onChange={e => setMatchWell(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">What did I learn?</label>
                  <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-sm text-white h-20" placeholder="Technical fixes, mindset gaps..." value={matchLearn} onChange={e => setMatchLearn(e.target.value)} />
                </div>
              </div>

              <button onClick={submitMatch} disabled={loading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg">Log Match</button>
            </div>
          </div>
        )}

        {/* --- TAB 3: SUNDAY LAUNCH --- */}
        {activeTab === 'sunday' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-bold text-white flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500"/> Sunday Launch</h2>
            
            {/* Focus Grid Game */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 text-center">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-bold text-white">1. Concentration Grid</h3>
                 {focusState === 'playing' && <span className="font-mono text-xl text-yellow-400">{focusTime}s</span>}
               </div>

               {focusState === 'idle' ? (
                 <button onClick={startFocus} className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 mx-auto"><Play className="w-4 h-4"/> Start Grid (00-99)</button>
               ) : focusState === 'finished' ? (
                 <div>
                   <p className="text-2xl font-bold text-white mb-2">Time: {focusTime}s</p>
                   <button onClick={() => setFocusState('idle')} className="text-gray-400 text-xs underline">Reset</button>
                 </div>
               ) : (
                 <div>
                   <div className="flex justify-between text-xs text-gray-400 mb-2"><span>Find: <b className="text-white text-lg">{focusNextNumber}</b></span></div>
                   <div className="grid grid-cols-10 gap-1">
                     {focusGrid.map(num => (
                       <button key={num} onTouchStart={(e) => { e.preventDefault(); tapFocusNumber(num); }} onClick={() => tapFocusNumber(num)} className={`aspect-square flex items-center justify-center text-[10px] font-bold rounded ${num < focusNextNumber ? 'bg-green-900 text-green-500' : 'bg-gray-700 text-white active:bg-blue-500'}`}>{num}</button>
                     ))}
                   </div>
                 </div>
               )}
            </div>

            {/* Weekly Check In */}
            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 space-y-4">
               <h3 className="text-sm font-bold text-white">2. Weekly Check-In</h3>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="text-xs text-gray-500 block">Big Tests/Projects?</label>
                   <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={weeklyAcademic} onChange={e => setWeeklyAcademic(e.target.value)}><option>Yes</option><option>No</option></select>
                 </div>
                 <div>
                   <label className="text-xs text-gray-500 block">On Weight Target?</label>
                   <select className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={weeklyWeight} onChange={e => setWeeklyWeight(e.target.value)}><option>Yes</option><option>No</option></select>
                 </div>
               </div>
               <div>
                  <label className="text-xs text-gray-500 block mb-1">Body Recovery (1-10)</label>
                  <input type="range" min="1" max="10" className="w-full" value={weeklyRecovery} onChange={e => setWeeklyRecovery(parseInt(e.target.value))} />
                  <div className="text-right font-mono text-blue-400">{weeklyRecovery}</div>
               </div>
               <div>
                  <label className="text-xs text-gray-500 block mb-1">#1 Goal for this week</label>
                  <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white" value={weeklyGoal} onChange={e => setWeeklyGoal(e.target.value)} />
               </div>
               <button onClick={submitWeekly} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg">Submit Launch</button>
            </div>
          </div>
        )}

        {/* --- TAB 4: MY FOUNDATION --- */}
        {activeTab === 'foundation' && (
          <div className="space-y-6 animate-in fade-in">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><Target className="w-5 h-5 text-pink-500"/> My Foundation</h2>
             
             {/* Identity */}
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <div className="flex justify-between items-center mb-3">
                 <h3 className="text-xs font-bold text-gray-400 uppercase">1. My Identity (I am...)</h3>
                 <button onClick={() => setShowIdentityExamples(!showIdentityExamples)} className="text-xs text-blue-400 font-bold flex items-center gap-1 border border-blue-500/30 px-2 py-1 rounded hover:bg-blue-900/20">
                   <Lightbulb className="w-3 h-3"/> {showIdentityExamples ? 'Hide Ideas' : 'Need Ideas?'}
                 </button>
               </div>
               
               {/* Identity Examples Popup */}
               {showIdentityExamples && (
                 <div className="bg-gray-900/90 border border-gray-600 p-3 rounded-lg mb-4 text-xs animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <strong className="text-pink-400 block mb-1">Physical</strong>
                        <ul className="text-gray-400 space-y-1 list-disc pl-3">
                          <li>Strong</li><li>Fast</li><li>Explosive</li><li>Conditioned</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-blue-400 block mb-1">Mental</strong>
                        <ul className="text-gray-400 space-y-1 list-disc pl-3">
                          <li>Calm under pressure</li><li>Confident</li><li>Focused</li><li>Unbreakable</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-yellow-400 block mb-1">Character</strong>
                        <ul className="text-gray-400 space-y-1 list-disc pl-3">
                          <li>Leader</li><li>Hard Working</li><li>Coachable</li><li>Grateful</li>
                        </ul>
                      </div>
                      <div>
                        <strong className="text-green-400 block mb-1">Future</strong>
                        <ul className="text-gray-400 space-y-1 list-disc pl-3">
                          <li>State Champion</li><li>Pins Specialist</li>
                        </ul>
                      </div>
                    </div>
                 </div>
               )}

               <div className="space-y-2">
                 <p className="text-xs text-gray-500 italic mb-2">"Speak it into existence. Who are you?"</p>
                 {identityWords.map((word, i) => (
                   <div key={i} className="flex gap-2 items-center">
                     <span className="text-gray-600 text-xs font-mono">{i+1}.</span>
                     <input type="text" placeholder={`I am...`} className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm" value={word} onChange={e => { const n = [...identityWords]; n[i] = e.target.value; setIdentityWords(n); }} />
                   </div>
                 ))}
               </div>
             </div>

             {/* Whys */}
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">2. Find Your Why</h3>
               <div className="space-y-4">
                 <div>
                   <label className="text-xs text-blue-400 block mb-1 font-bold">Level 1: Why did you join?</label>
                   <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm" value={whyLevels[0]} onChange={e => { const n = [...whyLevels]; n[0] = e.target.value; setWhyLevels(n); }} />
                 </div>
                 <div>
                   <label className="text-xs text-blue-400 block mb-1 font-bold">Level 2: Why is that important to you?</label>
                   <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm" value={whyLevels[1]} onChange={e => { const n = [...whyLevels]; n[1] = e.target.value; setWhyLevels(n); }} />
                 </div>
                 <div>
                   <label className="text-xs text-blue-400 block mb-1 font-bold">Level 3: Why does that matter? (Root Cause)</label>
                   <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm" value={whyLevels[2]} onChange={e => { const n = [...whyLevels]; n[2] = e.target.value; setWhyLevels(n); }} />
                 </div>
               </div>
               <div className="mt-6 pt-4 border-t border-gray-700">
                 <label className="text-xs text-white font-bold block mb-1">My Official Wrestling Purpose Statement</label>
                 <textarea className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-white text-sm" placeholder="I wrestle because..." value={purposeStatement} onChange={e => setPurposeStatement(e.target.value)} />
               </div>
             </div>

             {/* Values (Read Only) */}
             <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 opacity-75">
               <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">3. Team Values</h3>
               <ul className="text-sm text-gray-300 space-y-2 list-none">
                 <li><b className="text-white">Consistent:</b> In routines. Team &gt; Self. 1% Better Daily.</li>
                 <li><b className="text-white">Persistent:</b> Helping others. Sticking with it.</li>
                 <li><b className="text-white">Resilient:</b> Rubber Band Theory. Respond vs React. Opportunity &gt; Obstacle.</li>
                 <li><b className="text-white">Relentless:</b> Waking up & Growing. Attacking the day.</li>
               </ul>
             </div>

             <button onClick={saveFoundation} disabled={loading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-lg">Save Foundation</button>
          </div>
        )}

        {/* --- TAB 5: CONFIDENCE BANK --- */}
        {activeTab === 'bank' && (
           <div className="space-y-6 animate-in fade-in">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500"/> Confidence Bank</h2>
             <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {confidenceDeposits.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Leaf className="w-12 h-12 mx-auto mb-2 opacity-20"/>
                    <p>No deposits yet. Start logging your 1% improvements!</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-700">
                    {confidenceDeposits.map(d => (
                      <div key={d.id} className="p-4">
                        <div className="text-xs text-blue-400 font-mono mb-1">{d.date}</div>
                        <div className="text-white text-sm font-medium">"{d.improvement}"</div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
           </div>
        )}

      </div>

      {/* NAV BAR */}
      <div className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-800 pb-safe pt-2 px-1 flex justify-around items-center z-40">
         <button onClick={() => setActiveTab('daily')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'daily' ? 'text-pink-500' : 'text-gray-500'}`}><Flame className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Daily</span></button>
         <button onClick={() => setActiveTab('match')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'match' ? 'text-pink-500' : 'text-gray-500'}`}><Swords className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Match</span></button>
         <button onClick={() => setActiveTab('sunday')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'sunday' ? 'text-pink-500' : 'text-gray-500'}`}><Zap className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Launch</span></button>
         <button onClick={() => setActiveTab('foundation')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'foundation' ? 'text-pink-500' : 'text-gray-500'}`}><Target className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Profile</span></button>
         <button onClick={() => setActiveTab('bank')} className={`flex flex-col items-center p-2 min-w-[50px] ${activeTab === 'bank' ? 'text-pink-500' : 'text-gray-500'}`}><Trophy className="w-5 h-5"/><span className="text-[9px] mt-1 font-bold">Bank</span></button>
      </div>
    </div>
  );
};

export default App;
