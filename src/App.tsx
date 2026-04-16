import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp,
  where,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, storage, ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from './firebase';
import { useAuth } from './AuthContext';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  BarChart3, 
  Upload, 
  Search, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  Trash2,
  Edit2,
  Download,
  Image as ImageIcon,
  Video,
  Music,
  Plus,
  X,
  Loader2,
  CheckSquare,
  Square,
  FileText,
  Shield,
  Award,
  ChevronDown,
  ChevronUp,
  History,
  Bell,
  Check,
  Info,
  AlertCircle,
  Megaphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { Toaster, toast } from 'sonner';

// --- Types ---

interface GraduationMedia {
  type: 'image' | 'video' | 'audio';
  url: string;
  name: string;
  uploadedAt: any;
}

interface Student {
  id: string;
  name: string;
  studentId?: string;
  email?: string;
  graduationMedia?: GraduationMedia[];
  createdAt: any;
  createdBy: string;
}

interface Tracking {
  id: string;
  studentId: string;
  date: string;
  status: 'In Rwanda' | 'Traveled';
  markedAt: any;
  markedBy: string;
}

interface Leadership {
  id: string;
  name: string;
  position: 'President' | 'Deputy President' | 'Speaker' | 'Deputy Speaker' | 'Secretary General' | 'Treasurer';
  term: string;
  status: 'Current' | 'Former';
  photoUrl?: string;
  bio?: string;
}

interface GovernanceDocument {
  id: string;
  title: string;
  type: 'Constitution' | 'Election Manual';
  fileUrl: string;
  version?: string;
  updatedAt: any;
}

interface Notification {
  id: string;
  userId: string | null;
  title: string;
  message: string;
  type: 'announcement' | 'status_update' | 'system';
  read: boolean;
  createdAt: any;
}

// --- Components ---

export default function App() {
  const { user, isAdmin, loading, isLoggingIn, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'tracking' | 'upload' | 'media' | 'leadership' | 'governance' | 'notifications'>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [tracking, setTracking] = useState<Tracking[]>([]);
  const [leaders, setLeaders] = useState<Leadership[]>([]);
  const [governanceDocs, setGovernanceDocs] = useState<GovernanceDocument[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
  const [isAddingLeader, setIsAddingLeader] = useState(false);

  useEffect(() => {
    if (!loading) {
      setIsAuthReady(true);
    }
  }, [loading]);

  // Real-time data listeners
  useEffect(() => {
    if (!isAuthReady || !user || !isAdmin) return;

    const studentsQuery = query(collection(db, 'students'), orderBy('name', 'asc'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentData);
    }, (error) => handleFirestoreError(error));

    const trackingQuery = query(collection(db, 'tracking'), orderBy('markedAt', 'desc'));
    const unsubscribeTracking = onSnapshot(trackingQuery, (snapshot) => {
      const trackingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tracking));
      setTracking(trackingData);
    }, (error) => handleFirestoreError(error));

    const leadershipQuery = query(collection(db, 'leadership'), orderBy('term', 'desc'));
    const unsubscribeLeadership = onSnapshot(leadershipQuery, (snapshot) => {
      const leadershipData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Leadership));
      setLeaders(leadershipData);
    }, (error) => handleFirestoreError(error));

    const governanceQuery = query(collection(db, 'governance'), orderBy('updatedAt', 'desc'));
    const unsubscribeGovernance = onSnapshot(governanceQuery, (snapshot) => {
      const governanceData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GovernanceDocument));
      setGovernanceDocs(governanceData);
    }, (error) => handleFirestoreError(error));

    const notificationsQuery = query(
      collection(db, 'notifications'), 
      where('userId', 'in', [null, user.uid]),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(notificationData);
    }, (error) => handleFirestoreError(error));

    return () => {
      unsubscribeStudents();
      unsubscribeTracking();
      unsubscribeLeadership();
      unsubscribeGovernance();
      unsubscribeNotifications();
    };
  }, [isAuthReady, user, isAdmin]);

  // Toast for new notifications
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      const isRecent = latest.createdAt?.toDate 
        ? (Date.now() - latest.createdAt.toDate().getTime()) < 10000 
        : true; // If it's a fresh serverTimestamp it might be null initially or very recent

      if (!latest.read && isRecent) {
        toast(latest.title, {
          description: latest.message,
          icon: latest.type === 'announcement' ? <Megaphone size={16} /> : <Bell size={16} />,
          action: {
            label: 'View',
            onClick: () => setActiveTab('notifications')
          }
        });
      }
    }
  }, [notifications]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen login={login} isLoggingIn={isLoggingIn} />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Access Restricted</h2>
          <p className="text-slate-600 mb-6">Your account is pending admin approval. Please contact the system administrator.</p>
          <button onClick={logout} className="text-indigo-600 font-medium hover:underline">Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      <Toaster position="top-right" />
      
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <Users className="text-white w-6 h-6" />
              </div>
              <h1 className="font-bold text-xl text-slate-900 tracking-tight leading-none">Fashoda Students<br/><span className="text-indigo-600 text-sm font-medium">Association in Rwanda</span></h1>
            </div>
            <NotificationBell notifications={notifications} />
          </div>
          
          <nav className="space-y-1">
            <NavItem 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')} 
              icon={<BarChart3 size={18} />} 
              label="Dashboard" 
            />
            <NavItem 
              active={activeTab === 'students'} 
              onClick={() => setActiveTab('students')} 
              icon={<Users size={18} />} 
              label="Students" 
            />
            <NavItem 
              active={activeTab === 'tracking'} 
              onClick={() => setActiveTab('tracking')} 
              icon={<Calendar size={18} />} 
              label="Tracking" 
            />
            <NavItem 
              active={activeTab === 'media'} 
              onClick={() => setActiveTab('media')} 
              icon={<ImageIcon size={18} />} 
              label="Graduation Media" 
            />
            <NavItem 
              active={activeTab === 'leadership'} 
              onClick={() => setActiveTab('leadership')} 
              icon={<Award size={18} />} 
              label="Leadership" 
            />
            <NavItem 
              active={activeTab === 'governance'} 
              onClick={() => setActiveTab('governance')} 
              icon={<Shield size={18} />} 
              label="Governance" 
            />
            <NavItem 
              active={activeTab === 'notifications'} 
              onClick={() => setActiveTab('notifications')} 
              icon={<Bell size={18} />} 
              label="Notifications" 
            />
            <NavItem 
              active={activeTab === 'upload'} 
              onClick={() => setActiveTab('upload')} 
              icon={<Upload size={18} />} 
              label="Import Data" 
            />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <img src={user.photoURL || ''} alt="" className="w-10 h-10 rounded-full border-2 border-white shadow-sm" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-900 truncate">{user.displayName}</p>
              <p className="text-[10px] font-medium text-slate-500 truncate uppercase tracking-wider">Administrator</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-red-600 transition-colors w-full uppercase tracking-widest"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <Dashboard 
                students={students} 
                tracking={tracking} 
                notifications={notifications}
                onNavigate={setActiveTab} 
                onSendAnnouncement={() => setIsSendingAnnouncement(true)}
                onAddLeader={() => setIsAddingLeader(true)}
              />
            )}
            {activeTab === 'students' && (
              <StudentList students={students} />
            )}
            {activeTab === 'tracking' && (
              <TrackingTracker students={students} tracking={tracking} />
            )}
            {activeTab === 'media' && (
              <AllMediaGallery students={students} />
            )}
            {activeTab === 'leadership' && (
              <LeadershipSection leaders={leaders} />
            )}
            {activeTab === 'governance' && (
              <GovernanceSection documents={governanceDocs} />
            )}
            {activeTab === 'notifications' && (
              <NotificationsPage notifications={notifications} />
            )}
            {activeTab === 'upload' && (
              <DataImport />
            )}
          </AnimatePresence>
        </div>
      </main>

      {isSendingAnnouncement && (
        <SendAnnouncementModal onClose={() => setIsSendingAnnouncement(false)} />
      )}
      {isAddingLeader && (
        <AddLeaderModal onClose={() => setIsAddingLeader(false)} />
      )}
    </div>
  );
}

// --- Sub-components ---

function LoginScreen({ login, isLoggingIn }: { login: () => void, isLoggingIn: boolean }) {
  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden">
      <div className="flex-1 bg-indigo-600 p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full -mr-48 -mt-48 blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-700 rounded-full -ml-48 -mb-48 blur-3xl opacity-50"></div>
        
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center mb-8 border border-white/20">
            <Users className="text-white w-6 h-6" />
          </div>
          <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight tracking-tighter">
            Fashoda Students<br/>Association in <span className="text-indigo-200">Rwanda</span>
          </h1>
          <p className="text-indigo-100 text-lg max-w-sm font-medium leading-relaxed">
            A professional student management and tracking system designed for clarity and efficiency.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 text-indigo-200 text-sm font-medium">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map(i => (
                <img key={i} src={`https://picsum.photos/seed/user${i}/100/100`} className="w-8 h-8 rounded-full border-2 border-indigo-600" alt="" />
              ))}
            </div>
            <span>Trusted by community leaders in Rwanda</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-sm w-full">
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/60 p-10 border border-slate-100">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome Back</h2>
              <p className="text-slate-500 text-sm">Sign in to access the administrator portal</p>
            </div>

            <button 
              onClick={login}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 px-4 rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <img src="https://www.google.com/favicon.ico" alt="" className="w-5 h-5 brightness-0 invert" />
              )}
              {isLoggingIn ? 'Signing in...' : 'Continue with Google'}
            </button>

            <div className="mt-10 pt-8 border-t border-slate-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">100%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900 tracking-tight">24/7</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reliable</p>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-8 text-[10px] text-center text-slate-400 uppercase tracking-[0.2em] font-bold">
            Powered by Fashoda Students Association in Rwanda
          </p>
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      aria-label={label}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
        active 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface MediaItemProps {
  item: GraduationMedia & { studentName?: string };
  onRemove?: () => void | Promise<void>;
  showStudent?: boolean;
  key?: React.Key;
}

function MediaItem({ item, onRemove, showStudent = false }: MediaItemProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden group hover:border-indigo-200 transition-all">
      <div className="aspect-video bg-slate-100 relative overflow-hidden">
        {!isLoaded && (
          <div className="absolute inset-0 bg-slate-100 animate-pulse flex items-center justify-center">
            <Loader2 className="animate-spin text-slate-300" size={24} />
          </div>
        )}
        
        {item.type === 'image' && (
          <img 
            src={item.url} 
            alt={item.name} 
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
            referrerPolicy="no-referrer" 
          />
        )}
        
        {item.type === 'video' && (
          <video 
            src={item.url} 
            preload="metadata"
            onLoadedMetadata={() => setIsLoaded(true)}
            className={`w-full h-full object-cover ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
            controls 
          />
        )}
        
        {item.type === 'audio' && (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 p-4">
            <Music size={48} className="text-slate-300" />
            <audio 
              src={item.url} 
              preload="none"
              onLoadedMetadata={() => setIsLoaded(true)}
              className="w-full" 
              controls 
            />
          </div>
        )}

        <div className="absolute top-4 left-4">
          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${
            item.type === 'image' ? 'bg-emerald-500 text-white' : 
            item.type === 'video' ? 'bg-indigo-500 text-white' : 
            'bg-amber-500 text-white'
          }`}>
            {item.type}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="truncate">
            <p className="text-sm font-bold text-slate-900 truncate mb-1">{item.name}</p>
            <div className="flex items-center gap-3">
              {showStudent && item.studentName && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student: {item.studentName}</p>
              )}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {format(new Date(item.uploadedAt), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          {onRemove && (
            <button 
              onClick={onRemove}
              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all shrink-0"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AllMediaGallery({ students }: { students: Student[] }) {
  const allMedia = students.flatMap(s => (s.graduationMedia || []).map(m => ({ ...m, studentName: s.name, studentId: s.id })));
  const [filter, setFilter] = useState<'all' | 'image' | 'video' | 'audio'>('all');
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');

  const filteredMedia = allMedia.filter(m => filter === 'all' || m.type === filter);
  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Graduation Media</h2>
          <p className="text-slate-500 font-medium">All graduation memories across the community</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <button 
            onClick={() => setIsSelectorOpen(true)}
            className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
          >
            <Plus size={18} />
            Upload New Media
          </button>
          <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            {(['all', 'image', 'video', 'audio'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                  filter === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Student Selector Modal */}
      <AnimatePresence>
        {isSelectorOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Select Student</h3>
                <button onClick={() => setIsSelectorOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search student..." 
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredStudents.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setIsSelectorOpen(false);
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 rounded-2xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-bold text-xs group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      {s.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{s.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.studentId || 'No ID'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedStudent && (
        <GraduationGallery 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredMedia.map((item, index) => (
          <MediaItem key={index} item={item} showStudent />
        ))}
      </div>

      {filteredMedia.length === 0 && (
        <div className="text-center py-32 bg-white rounded-[3rem] border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="text-slate-200" size={40} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No media found</h3>
          <p className="text-slate-500 max-w-xs mx-auto">
            {filter === 'all' 
              ? "No graduation memories have been uploaded yet." 
              : `No ${filter} files found in the graduation gallery.`}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function Dashboard({ students, tracking, notifications, onNavigate, onSendAnnouncement, onAddLeader }: { 
  students: Student[], 
  tracking: Tracking[], 
  notifications: Notification[],
  onNavigate: (tab: 'dashboard' | 'students' | 'tracking' | 'upload' | 'media' | 'leadership' | 'governance' | 'notifications') => void,
  onSendAnnouncement: () => void,
  onAddLeader: () => void
}) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const todaysTracking = tracking.filter(a => a.date === today);
  const inRwandaCount = todaysTracking.filter(a => a.status === 'In Rwanda').length;
  const trackingRate = students.length > 0 
    ? Math.round((inRwandaCount / students.length) * 100) 
    : 0;

  const latestAnnouncement = notifications.find(n => n.type === 'announcement');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-10"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Dashboard</h2>
          <p className="text-slate-500 font-medium">Real-time overview of Fashoda Students Association in Rwanda student program</p>
        </div>
        <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center">
            <Calendar size={16} className="text-indigo-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Current Date</span>
            <span className="text-sm font-bold text-slate-700 leading-none">{format(new Date(), 'MMMM d, yyyy')}</span>
          </div>
        </div>
      </header>

      {latestAnnouncement && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20">
              <Megaphone size={32} className="text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">Latest Announcement</span>
                <span className="text-[10px] font-medium text-indigo-100 italic">
                  {format(new Date(latestAnnouncement.createdAt?.toDate ? latestAnnouncement.createdAt.toDate() : latestAnnouncement.createdAt), 'MMMM d, yyyy')}
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-2">{latestAnnouncement.title}</h3>
              <p className="text-indigo-100 leading-relaxed max-w-2xl">{latestAnnouncement.message}</p>
            </div>
            <button 
              onClick={() => onNavigate('notifications')}
              className="px-8 py-4 bg-white text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all active:scale-95 shadow-lg"
            >
              View All Alerts
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          label="Total Students" 
          value={students.length} 
          subValue="Registered members"
          icon={<Users className="text-indigo-600" size={24} />} 
          trend="+12% from last month"
          color="bg-indigo-600" 
        />
        <StatCard 
          label="In Rwanda Today" 
          value={`${inRwandaCount}`} 
          subValue={`${trackingRate}% of total students`}
          icon={<CheckCircle2 className="text-emerald-600" size={24} />} 
          trend="Consistent with average"
          color="bg-emerald-500" 
        />
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Announcements</p>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Broadcast</h3>
            <p className="text-sm text-slate-500 mb-6">Send real-time updates to all students.</p>
          </div>
          <button 
            onClick={onSendAnnouncement}
            className="w-full bg-amber-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-amber-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Megaphone size={16} />
            Send Announcement
          </button>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Graduation</p>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Memories</h3>
            <p className="text-sm text-slate-500 mb-6">Manage graduation photos, videos, and audio.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onNavigate('media')}
              className="flex-1 bg-indigo-50 text-indigo-600 py-3 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all active:scale-95"
            >
              Gallery
            </button>
            <button 
              onClick={() => onNavigate('media')}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Upload
            </button>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between group hover:border-indigo-200 transition-all">
          <div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Leadership</p>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Executive</h3>
            <p className="text-sm text-slate-500 mb-6">Manage former and current association leaders.</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => onNavigate('leadership')}
              className="flex-1 bg-slate-50 text-slate-600 py-3 rounded-xl font-bold text-sm hover:bg-slate-100 transition-all active:scale-95"
            >
              View List
            </button>
            <button 
              onClick={onAddLeader}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Add Leader
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Recent Tracking</h3>
                <p className="text-sm text-slate-500">Latest status updates for today</p>
              </div>
              <button 
                onClick={() => onNavigate('tracking')}
                className="text-indigo-600 text-sm font-bold hover:underline"
              >
                View all
              </button>
            </div>
            
            <div className="space-y-4">
              {tracking.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).slice(0, 5).map((record) => {
                const student = students.find(s => s.id === record.studentId);
                return (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                        record.status === 'In Rwanda' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                      }`}>
                        {student?.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{student?.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{record.status}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {record.markedAt?.toDate ? format(record.markedAt.toDate(), 'HH:mm') : 'Just now'}
                    </span>
                  </div>
                );
              })}
              {tracking.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="mx-auto text-slate-200 mb-4" size={32} />
                  <p className="text-slate-500 text-sm font-medium">No tracking records for today yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Recent Memories</h3>
                <p className="text-sm text-slate-500">Latest graduation media uploads</p>
              </div>
              <button 
                onClick={() => onNavigate('media')}
                className="text-indigo-600 text-sm font-bold hover:underline"
              >
                View gallery
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {students
                .flatMap(s => (s.graduationMedia || []).map(m => ({ ...m, studentName: s.name })))
                .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                .slice(0, 4)
                .map((item, idx) => (
                  <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group cursor-pointer" onClick={() => onNavigate('media')}>
                    {item.type === 'image' ? (
                      <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                        {item.type === 'video' ? <Video className="text-slate-300" /> : <Music className="text-slate-300" />}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="text-[10px] font-bold text-white truncate">{item.studentName}</p>
                    </div>
                  </div>
                ))}
              {students.every(s => !s.graduationMedia || s.graduationMedia.length === 0) && (
                <div className="col-span-full text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <ImageIcon className="mx-auto text-slate-200 mb-4" size={32} />
                  <p className="text-slate-500 text-sm font-medium">No graduation media uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-indigo-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-800 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-4">Community Impact</h3>
              <p className="text-indigo-200 text-sm leading-relaxed mb-8">
                Your dedication to tracking and managing students helps Fashoda Students Association in Rwanda grow and thrive.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{students.length}</p>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Active Students</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                    <BarChart3 size={20} />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{trackingRate}%</p>
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest">Avg. Tracking</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 p-4 bg-white/5 rounded-2xl border border-white/10">
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-2">System Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <p className="text-xs font-medium">All systems operational</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, subValue, icon, trend, color }: { label: string, value: string | number, subValue: string, icon: React.ReactNode, trend: string, color: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
            {icon}
          </div>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
          <p className="text-xs text-slate-500 font-medium">{subValue}</p>
        </div>
      </div>
      <div className={`absolute -bottom-12 -right-12 w-32 h-32 ${color} opacity-[0.03] rounded-full group-hover:scale-150 transition-transform duration-700`}></div>
    </div>
  );
}

function GraduationGallery({ student, onClose }: { student: Student, onClose: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [media, setMedia] = useState<GraduationMedia[]>(student.graduationMedia || []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    
    try {
      const uploadPromises = files.map(async (file: File) => {
        const storageRef = ref(storage, `graduation/${student.id}/${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        return new Promise<GraduationMedia>((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setProgress(p);
            }, 
            (error) => reject(error), 
            async () => {
              const url = await getDownloadURL(uploadTask.snapshot.ref);
              resolve({
                type,
                url,
                name: file.name,
                uploadedAt: new Date().toISOString()
              });
            }
          );
        });
      });

      const results = await Promise.all(uploadPromises);
      const updatedMedia = [...media, ...results];
      
      await updateDoc(doc(db, 'students', student.id), {
        graduationMedia: updatedMedia
      });

      setMedia(updatedMedia);
      toast.success(`Successfully uploaded ${results.length} ${type}${results.length > 1 ? 's' : ''}`);
    } catch (error: any) {
      console.error('Storage Error:', error);
      toast.error(`Upload failed: ${error.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeMedia = async (index: number) => {
    if (!confirm('Are you sure you want to remove this media?')) return;

    const itemToRemove = media[index];
    try {
      // Delete from storage
      const storageRef = ref(storage, itemToRemove.url);
      await deleteObject(storageRef);

      // Delete from firestore
      const updatedMedia = media.filter((_, i) => i !== index);
      await updateDoc(doc(db, 'students', student.id), {
        graduationMedia: updatedMedia
      });
      setMedia(updatedMedia);
      toast.success('Media removed');
    } catch (error) {
      console.error(error);
      toast.error('Failed to remove media');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Graduation Gallery</h3>
            <p className="text-slate-500 font-medium">{student.name}'s graduation memories</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <label className="relative group cursor-pointer">
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => handleUpload(e, 'image')} disabled={uploading} />
              <div className="h-32 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 group-hover:border-indigo-500 group-hover:bg-indigo-50/30 transition-all">
                <ImageIcon className="text-slate-400 group-hover:text-indigo-600" size={24} />
                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">Add Photos</span>
              </div>
            </label>
            <label className="relative group cursor-pointer">
              <input type="file" multiple accept="video/*" className="hidden" onChange={(e) => handleUpload(e, 'video')} disabled={uploading} />
              <div className="h-32 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 group-hover:border-indigo-500 group-hover:bg-indigo-50/30 transition-all">
                <Video className="text-slate-400 group-hover:text-indigo-600" size={24} />
                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">Add Videos</span>
              </div>
            </label>
            <label className="relative group cursor-pointer">
              <input type="file" multiple accept="audio/*" className="hidden" onChange={(e) => handleUpload(e, 'audio')} disabled={uploading} />
              <div className="h-32 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 group-hover:border-indigo-500 group-hover:bg-indigo-50/30 transition-all">
                <Music className="text-slate-400 group-hover:text-indigo-600" size={24} />
                <span className="text-xs font-bold text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">Add Audio</span>
              </div>
            </label>
          </div>

          {uploading && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin text-indigo-600" size={20} />
                  <span className="font-bold text-slate-600 text-sm">Uploading memories...</span>
                </div>
                <span className="text-xs font-bold text-indigo-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {media.map((item, index) => (
              <MediaItem 
                key={index} 
                item={item} 
                onRemove={() => removeMedia(index)} 
              />
            ))}
          </div>

          {media.length === 0 && !uploading && (
            <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <ImageIcon className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-900 font-bold mb-1">No memories yet</p>
              <p className="text-slate-500 text-sm">Start uploading photos, videos, or audio from the graduation.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function StudentList({ students }: { students: Student[] }) {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({ name: '', studentId: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedForMedia, setSelectedForMedia] = useState<Student | null>(null);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                         (s.studentId && s.studentId.toLowerCase().includes(search.toLowerCase()));
    return matchesSearch;
  });

  const handleOpenModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({ 
        name: student.name, 
        studentId: student.studentId || '', 
        email: student.email || '' 
      });
    } else {
      setEditingStudent(null);
      setFormData({ name: '', studentId: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Student name is required');
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        name: formData.name.trim(),
        studentId: formData.studentId.trim() || null,
        email: formData.email.trim() || null,
        updatedAt: serverTimestamp(),
      };

      if (editingStudent) {
        await updateDoc(doc(db, 'students', editingStudent.id), data);
        toast.success('Student updated successfully');
      } else {
        await addDoc(collection(db, 'students'), {
          ...data,
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid,
        });
        toast.success('Student added successfully');
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    try {
      await deleteDoc(doc(db, 'students', id));
      toast.success('Student deleted successfully');
    } catch (error) {
      handleFirestoreError(error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Students</h2>
          <p className="text-slate-500 font-medium">Manage and organize your community student records</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          <UserPlus size={18} />
          Add New Student
        </button>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name or ID..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.15em] border-b border-slate-100">
                <th className="px-8 py-5">Student Profile</th>
                <th className="px-8 py-5">Contact Information</th>
                <th className="px-8 py-5">Registration Date</th>
                <th className="px-8 py-5 text-right">Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredStudents.map((student) => {
                const mediaCount = student.graduationMedia?.length || 0;
                return (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 relative">
                          {student.name.charAt(0)}
                          {mediaCount > 0 && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] border-2 border-white">
                              {mediaCount}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{student.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            {student.studentId && (
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                ID: {student.studentId}
                              </span>
                            )}
                            {mediaCount > 0 && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                                <ImageIcon size={10} /> {mediaCount} Memories
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-medium text-slate-600">
                      {student.email || <span className="text-slate-300 italic">No email provided</span>}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-sm font-medium text-slate-500">
                      {student.createdAt?.toDate ? format(student.createdAt.toDate(), 'MMM d, yyyy') : 'Recently'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => setSelectedForMedia(student)}
                        className={`p-2.5 rounded-xl transition-all ${
                          mediaCount > 0 
                            ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' 
                            : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50'
                        }`}
                        title="Graduation Media"
                      >
                        <ImageIcon size={16} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(student)}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Student"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Student"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="max-w-xs mx-auto">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="text-slate-300" size={32} />
                      </div>
                      <p className="text-slate-900 font-bold mb-1">No students found</p>
                      <p className="text-slate-500 text-sm">Try adjusting your search or add a new student to the community.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Full Name *</label>
                  <input 
                    type="text" 
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. John Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Student ID</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. STU-2024-001"
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="e.g. john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : editingStudent ? 'Update' : 'Add Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {selectedForMedia && (
        <GraduationGallery 
          student={selectedForMedia} 
          onClose={() => setSelectedForMedia(null)} 
        />
      )}
    </motion.div>
  );
}

function TrackingTracker({ students, tracking }: { students: Student[], tracking: Tracking[] }) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.studentId && s.studentId.toLowerCase().includes(search.toLowerCase()))
  );

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudentIds(newSelected);
  };

  const markTracking = async (studentId: string, status: 'In Rwanda' | 'Traveled') => {
    try {
      const existing = tracking.find(a => a.studentId === studentId && a.date === selectedDate);
      
      if (existing) {
        await updateDoc(doc(db, 'tracking', existing.id), {
          status,
          markedAt: serverTimestamp(),
          markedBy: auth.currentUser?.uid
        });
      } else {
        await addDoc(collection(db, 'tracking'), {
          studentId,
          date: selectedDate,
          status,
          markedAt: serverTimestamp(),
          markedBy: auth.currentUser?.uid
        });
      }

      // Add notification
      const student = students.find(s => s.id === studentId);
      await addDoc(collection(db, 'notifications'), {
        userId: null,
        title: 'Status Update',
        message: `${student?.name}'s status was updated to ${status} for ${selectedDate}`,
        type: 'status_update',
        read: false,
        createdAt: serverTimestamp()
      });

      toast.success(`Marked as ${status}`);
    } catch (error) {
      handleFirestoreError(error);
    }
  };

  const bulkMark = async (status: 'In Rwanda' | 'Traveled', targetIds?: string[]) => {
    const idsToMark = targetIds || Array.from(selectedStudentIds);
    if (idsToMark.length === 0) return;

    if (!confirm(`Mark ${idsToMark.length} students as ${status}?`)) return;
    
    try {
      const batch = writeBatch(db);
      
      for (const studentId of idsToMark) {
        const existing = tracking.find(a => a.studentId === studentId && a.date === selectedDate);
        if (existing) {
          batch.update(doc(db, 'tracking', existing.id), {
            status,
            markedAt: serverTimestamp(),
            markedBy: auth.currentUser?.uid
          });
        } else {
          const newDocRef = doc(collection(db, 'tracking'));
          batch.set(newDocRef, {
            studentId,
            date: selectedDate,
            status,
            markedAt: serverTimestamp(),
            markedBy: auth.currentUser?.uid
          });
        }
      }
      
      await batch.commit();
      
      // Add notification for bulk update
      await addDoc(collection(db, 'notifications'), {
        userId: null,
        title: 'Bulk Status Update',
        message: `${idsToMark.length} students were marked as ${status} for ${selectedDate}`,
        type: 'status_update',
        read: false,
        createdAt: serverTimestamp()
      });

      setSelectedStudentIds(new Set());
      toast.success(`Bulk marked ${idsToMark.length} students as ${status}`);
    } catch (error) {
      handleFirestoreError(error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Status Tracker</h2>
          <p className="text-slate-500 font-medium">Track if students are in Rwanda or traveling</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-600" size={16} />
            <input 
              type="date" 
              className="bg-white border border-slate-200 rounded-2xl pl-12 pr-5 py-3 text-sm font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all cursor-pointer"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col lg:flex-row gap-6 items-center">
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <button 
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors"
            >
              {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                <CheckSquare className="text-indigo-600" size={20} />
              ) : (
                <Square size={20} />
              )}
              <span className="text-sm font-bold uppercase tracking-widest">Select All</span>
            </button>
          </div>
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search students to mark..." 
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            {selectedStudentIds.size > 0 ? (
              <>
                <button 
                  onClick={() => bulkMark('In Rwanda')}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                >
                  <CheckCircle2 size={18} />
                  Mark Selected ({selectedStudentIds.size})
                </button>
                <button 
                  onClick={() => bulkMark('Traveled')}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 active:scale-95"
                >
                  <XCircle size={18} />
                  Mark Selected ({selectedStudentIds.size})
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => bulkMark('In Rwanda', filteredStudents.map(s => s.id))}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                >
                  <CheckCircle2 size={18} />
                  All In Rwanda
                </button>
                <button 
                  onClick={() => bulkMark('Traveled', filteredStudents.map(s => s.id))}
                  className="flex-1 lg:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-50 transition-all active:scale-95"
                >
                  <XCircle size={18} />
                  All Traveled
                </button>
              </>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {filteredStudents.map((student) => {
            const record = tracking.find(a => a.studentId === student.id && a.date === selectedDate);
            const isSelected = selectedStudentIds.has(student.id);
            return (
              <div key={student.id} className={`flex items-center justify-between p-6 transition-all group ${isSelected ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'}`}>
                <div className="flex items-center gap-5">
                  <button 
                    onClick={() => toggleSelectStudent(student.id)}
                    className="text-slate-300 hover:text-indigo-600 transition-colors"
                  >
                    {isSelected ? <CheckSquare className="text-indigo-600" size={20} /> : <Square size={20} />}
                  </button>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    record?.status === 'In Rwanda' 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' 
                      : record?.status === 'Traveled'
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-100'
                        : 'bg-slate-100 text-slate-400'
                  }`}>
                    {student.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{student.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{student.studentId || 'No ID Assigned'}</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => markTracking(student.id, 'In Rwanda')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${
                      record?.status === 'In Rwanda'
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                        : 'bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'
                    }`}
                  >
                    In Rwanda
                  </button>
                  <button 
                    onClick={() => markTracking(student.id, 'Traveled')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all ${
                      record?.status === 'Traveled'
                        ? 'bg-amber-600 text-white shadow-lg shadow-amber-100'
                        : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600'
                    }`}
                  >
                    Traveled
                  </button>
                </div>
              </div>
            );
          })}
          {filteredStudents.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-slate-300" size={32} />
              </div>
              <p className="text-slate-900 font-bold mb-1">No students found</p>
              <p className="text-slate-500 text-sm">We couldn't find any students matching your search criteria.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DataImport() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteMode, setPasteMode] = useState(false);
  const [pastedNames, setPastedNames] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPasteMode(false);
      parseFile(selectedFile);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const extension = droppedFile.name.split('.').pop()?.toLowerCase();
      if (['csv', 'xlsx', 'xls'].includes(extension || '')) {
        setFile(droppedFile);
        setPasteMode(false);
        parseFile(droppedFile);
      } else {
        toast.error("Unsupported file format");
      }
    }
  };

  const parseFile = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreview(results.data.slice(0, 10));
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        setPreview(json.slice(0, 10));
      };
      reader.readAsBinaryString(file);
    }
  };

  const downloadTemplate = () => {
    const headers = "Name,ID,Email\nJohn Doe,STU001,john@example.com\nJane Smith,STU002,jane@example.com";
    const blob = new Blob([headers], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'student_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImport = async () => {
    if (!file && !pastedNames) return;
    setImporting(true);
    
    try {
      let data: any[] = [];

      if (pasteMode) {
        data = pastedNames.split('\n')
          .map(name => name.trim())
          .filter(name => name.length > 0)
          .map(name => ({ name }));
      } else if (file) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (extension === 'csv') {
          const results = await new Promise<any>((resolve) => {
            Papa.parse(file, {
              header: true,
              skipEmptyLines: true,
              complete: resolve
            });
          });
          data = results.data;
        } else {
          const reader = new FileReader();
          const workbook = await new Promise<XLSX.WorkBook>((resolve) => {
            reader.onload = (e) => resolve(XLSX.read(e.target?.result, { type: 'binary' }));
            reader.readAsBinaryString(file);
          });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          data = XLSX.utils.sheet_to_json(sheet);
        }
      }

      let currentBatch = writeBatch(db);
      let count = 0;
      let totalCount = 0;

      for (const row of data) {
        const name = row.name || row.Name || row['Full Name'] || row['Student Name'] || row['Student'] || row['names'] || row['Names'];
        if (!name) continue;
        
        const newDocRef = doc(collection(db, 'students'));
        const studentData: any = {
          name: String(name).trim(),
          createdAt: serverTimestamp(),
          createdBy: auth.currentUser?.uid
        };

        const sId = String(row.id || row.ID || row['Student ID'] || row.studentId || '').trim();
        if (sId) studentData.studentId = sId;

        const sEmail = String(row.email || row.Email || row['Email Address'] || '').trim();
        if (sEmail) studentData.email = sEmail;

        currentBatch.set(newDocRef, studentData);
        count++;
        totalCount++;
        
        if (count === 400) {
          await currentBatch.commit();
          currentBatch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await currentBatch.commit();
      }
      
      toast.success(`Successfully imported ${totalCount} students!`);
      setFile(null);
      setPreview([]);
      setPastedNames('');
    } catch (error) {
      console.error("Import failed:", error);
      toast.error("Import failed. Please check your data format.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Import Data</h2>
          <p className="text-slate-500">Add students in bulk via file upload or quick paste</p>
        </div>
        <button 
          onClick={downloadTemplate}
          className="flex items-center gap-2 text-sm font-semibold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all"
        >
          <Download size={18} />
          Download Template
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button 
              onClick={() => setPasteMode(false)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!pasteMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              File Upload
            </button>
            <button 
              onClick={() => setPasteMode(true)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${pasteMode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Quick Paste
            </button>
          </div>

          {!pasteMode ? (
            <div 
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative bg-white p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center min-h-[300px] ${
                isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <Upload className="text-indigo-600" size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Drop your file here</h3>
              <p className="text-sm text-slate-500 mb-6 max-w-xs">
                Drag and drop your .csv or .xlsx file, or click to browse.
              </p>
              
              <label className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95">
                Select File
                <input type="file" className="hidden" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
              </label>
              
              {file && (
                <div className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  {file.name}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Paste Names</h3>
              <p className="text-sm text-slate-500 mb-4">Enter one student name per line.</p>
              <textarea 
                className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none font-mono"
                placeholder="John Doe&#10;Jane Smith&#10;Robert Brown..."
                value={pastedNames}
                onChange={(e) => setPastedNames(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Preview</h3>
            {pasteMode && pastedNames && (
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                {pastedNames.split('\n').filter(n => n.trim()).length} names detected
              </span>
            )}
          </div>
          
          <div className="flex-1 overflow-auto max-h-64 border border-slate-100 rounded-xl">
            {pasteMode ? (
              pastedNames ? (
                <div className="p-4 space-y-2">
                  {pastedNames.split('\n').filter(n => n.trim()).slice(0, 10).map((name, i) => (
                    <div key={i} className="text-sm text-slate-600 flex items-center gap-2">
                      <span className="text-slate-300 font-mono text-xs">{i + 1}.</span>
                      {name}
                    </div>
                  ))}
                  {pastedNames.split('\n').filter(n => n.trim()).length > 10 && (
                    <div className="text-xs text-slate-400 italic pt-2">...and more</div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm italic p-10 text-center">
                  Paste names in the box to see a preview
                </div>
              )
            ) : preview.length > 0 ? (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {Object.keys(preview[0]).map(key => (
                      <th key={key} className="px-3 py-2 font-bold text-slate-500 uppercase">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-3 py-2 text-slate-600 truncate max-w-[100px]">{String(val)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm italic p-10 text-center">
                Select or drop a file to see a preview
              </div>
            )}
          </div>
          
          <button 
            disabled={(!file && !pastedNames) || importing}
            onClick={handleImport}
            className={`mt-6 w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
              (!file && !pastedNames) || importing 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95'
            }`}
          >
            {importing ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 size={20} />
                Confirm & Import
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-amber-50 border border-amber-100 p-6 rounded-3xl">
          <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
            <BarChart3 size={18} />
            Import Tips
          </h4>
          <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside opacity-80">
            <li>Files should have 'Name', 'ID', and 'Email' columns</li>
            <li>Quick Paste is great for simple lists of names</li>
            <li>Templates ensure your data matches the system perfectly</li>
          </ul>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl">
          <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
            <Users size={18} />
            Smart Matching
          </h4>
          <p className="text-sm text-indigo-800 opacity-80">
            The system automatically looks for columns named 'Name', 'ID', and 'Email' to make importing seamless.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function LeadershipSection({ leaders }: { leaders: Leadership[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [expandedStatus, setExpandedStatus] = useState<'Current' | 'Former' | null>('Current');

  const currentLeaders = leaders.filter(l => l.status === 'Current');
  const formerLeaders = leaders.filter(l => l.status === 'Former');

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Leadership</h2>
          <p className="text-slate-500 font-medium">Former and current leaders of the association</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
        >
          <Plus size={18} />
          Add Leader
        </button>
      </header>

      <div className="space-y-6">
        {/* Current Executive */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <button 
            onClick={() => setExpandedStatus(expandedStatus === 'Current' ? null : 'Current')}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                <Award size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-slate-900">Current Executive</h3>
                <p className="text-sm text-slate-500">{currentLeaders.length} active leaders</p>
              </div>
            </div>
            {expandedStatus === 'Current' ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {expandedStatus === 'Current' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentLeaders.map(leader => (
                    <LeaderCard key={leader.id} leader={leader} />
                  ))}
                  {currentLeaders.length === 0 && (
                    <p className="col-span-full text-center py-10 text-slate-400 italic">No current leaders listed.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Former Executive */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <button 
            onClick={() => setExpandedStatus(expandedStatus === 'Former' ? null : 'Former')}
            className="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600">
                <History size={24} />
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-slate-900">Former Executive</h3>
                <p className="text-sm text-slate-500">{formerLeaders.length} past leaders</p>
              </div>
            </div>
            {expandedStatus === 'Former' ? <ChevronUp size={24} className="text-slate-400" /> : <ChevronDown size={24} className="text-slate-400" />}
          </button>
          
          <AnimatePresence>
            {expandedStatus === 'Former' && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 pt-0 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {formerLeaders.map(leader => (
                    <LeaderCard key={leader.id} leader={leader} />
                  ))}
                  {formerLeaders.length === 0 && (
                    <p className="col-span-full text-center py-10 text-slate-400 italic">No former leaders listed.</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {isAdding && (
        <AddLeaderModal onClose={() => setIsAdding(false)} />
      )}
    </motion.div>
  );
}

function LeaderCard({ leader }: { leader: Leadership, key?: React.Key }) {
  return (
    <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:border-indigo-200 transition-all">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
          {leader.photoUrl ? (
            <img src={leader.photoUrl} alt={leader.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <Users size={32} className="text-slate-200" />
          )}
        </div>
        <div>
          <h4 className="font-bold text-slate-900">{leader.name}</h4>
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{leader.position}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{leader.term}</p>
        </div>
      </div>
      {leader.bio && (
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
          {leader.bio}
        </p>
      )}
    </div>
  );
}

function GovernanceSection({ documents }: { documents: GovernanceDocument[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Governance</h2>
          <p className="text-slate-500 font-medium">Official Constitutions and Election Manuals</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
        >
          <Plus size={18} />
          Upload Document
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Constitutions */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Constitutions</h3>
              <p className="text-sm text-slate-500">Foundational rules and principles</p>
            </div>
          </div>
          <div className="space-y-4">
            {documents.filter(d => d.type === 'Constitution').map(doc => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
            {documents.filter(d => d.type === 'Constitution').length === 0 && (
              <p className="text-center py-10 text-slate-400 italic">No constitutions uploaded.</p>
            )}
          </div>
        </div>

        {/* Election Manuals */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Election Manuals</h3>
              <p className="text-sm text-slate-500">Guidelines for democratic processes</p>
            </div>
          </div>
          <div className="space-y-4">
            {documents.filter(d => d.type === 'Election Manual').map(doc => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
            {documents.filter(d => d.type === 'Election Manual').length === 0 && (
              <p className="text-center py-10 text-slate-400 italic">No election manuals uploaded.</p>
            )}
          </div>
        </div>
      </div>

      {isAdding && (
        <AddGovernanceModal onClose={() => setIsAdding(false)} />
      )}
    </motion.div>
  );
}

function DocumentRow({ doc }: { doc: GovernanceDocument, key?: React.Key }) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all">
      <div className="flex items-center gap-4 overflow-hidden">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
          <FileText size={20} />
        </div>
        <div className="overflow-hidden">
          <p className="text-sm font-bold text-slate-900 truncate">{doc.title}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Version {doc.version || '1.0'} • {format(new Date(doc.updatedAt), 'MMM d, yyyy')}
          </p>
        </div>
      </div>
      <a 
        href={doc.fileUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm"
      >
        <Download size={18} />
      </a>
    </div>
  );
}

function AddLeaderModal({ onClose, onSuccess }: { onClose: () => void, onSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    position: 'President',
    term: '',
    status: 'Current',
    bio: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'leadership'), {
        ...formData,
        createdAt: serverTimestamp()
      });
      setIsSuccess(true);
      toast.success('Leader added successfully');
      if (onSuccess) onSuccess();
    } catch (error) {
      handleFirestoreError(error);
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-[2.5rem] w-full max-w-md p-12 text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Leader Added!</h3>
          <p className="text-slate-500 mb-8">The leadership roster has been updated successfully.</p>
          <div className="space-y-3">
            <button 
              onClick={() => {
                setIsSuccess(false);
                setFormData({
                  name: '',
                  position: 'President',
                  term: '',
                  status: 'Current',
                  bio: ''
                });
              }}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
            >
              Add Another Leader
            </button>
            <button 
              onClick={onClose}
              className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
            >
              Return to List
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900">Add Leader</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Position</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={formData.position}
                onChange={e => setFormData({...formData, position: e.target.value as any})}
              >
                <option>President</option>
                <option>Deputy President</option>
                <option>Speaker</option>
                <option>Deputy Speaker</option>
                <option>Secretary General</option>
                <option>Treasurer</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Status</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as any})}
              >
                <option>Current</option>
                <option>Former</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Term (e.g. 2023-2024)</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={formData.term}
              onChange={e => setFormData({...formData, term: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Bio (Optional)</label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none"
              value={formData.bio}
              onChange={e => setFormData({...formData, bio: e.target.value})}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Save Leader'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function AddGovernanceModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'Constitution' as const,
    version: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // Auto-fill title if empty
      if (!formData.title) {
        setFormData(prev => ({ ...prev, title: selectedFile.name.split('.')[0] }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a document to upload');
      return;
    }

    setLoading(true);
    setProgress(0);
    try {
      // 1. Upload to Storage
      const storageRef = ref(storage, `governance/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      const downloadUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on('state_changed', 
          (snapshot) => {
            const p = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setProgress(p);
          }, 
          (error) => reject(error), 
          async () => {
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // 2. Save to Firestore
      await addDoc(collection(db, 'governance'), {
        ...formData,
        fileUrl: downloadUrl,
        updatedAt: serverTimestamp()
      });

      toast.success('Document uploaded successfully');
      onClose();
    } catch (error) {
      handleFirestoreError(error);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-bold text-slate-900">Upload Document</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Document</label>
            <div className="relative group">
              <input 
                type="file" 
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileChange}
                className="hidden" 
                id="gov-file-upload"
              />
              <label 
                htmlFor="gov-file-upload"
                className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                  file ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/30'
                }`}
              >
                <Upload className={file ? 'text-emerald-500' : 'text-slate-400'} size={24} />
                <span className={`mt-2 text-xs font-bold uppercase tracking-widest ${file ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {file ? file.name : 'Choose File'}
                </span>
                <p className="mt-1 text-[10px] text-slate-400">PDF, DOCX, or TXT</p>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document Title</label>
            <input 
              required
              type="text" 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Type</label>
              <select 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="Constitution">Constitution</option>
                <option value="Election Manual">Election Manual</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Version</label>
              <input 
                type="text" 
                placeholder="e.g. 2.1"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                value={formData.version}
                onChange={e => setFormData({...formData, version: e.target.value})}
              />
            </div>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-50 flex flex-col items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" size={20} />
                  <span>Uploading {Math.round(progress)}%</span>
                </div>
                <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden mt-1">
                  <motion.div 
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
              </>
            ) : (
              'Save Document'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function NotificationBell({ notifications }: { notifications: Notification[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            
            {/* Slide-over Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[101] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications</h3>
                  <p className="text-sm text-slate-500 font-medium">You have {unreadCount} unread messages</p>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 px-3 py-2 rounded-lg transition-all"
                    >
                      Mark all read
                    </button>
                  )}
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-200">
                      <Bell size={40} />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">All caught up!</h4>
                    <p className="text-slate-500">No new notifications at the moment.</p>
                  </div>
                ) : (
                  notifications.map(notification => (
                    <motion.div 
                      layout
                      key={notification.id} 
                      className={`p-6 rounded-3xl transition-all cursor-pointer relative group border ${
                        !notification.read 
                          ? 'bg-indigo-50/30 border-indigo-100 shadow-sm' 
                          : 'bg-white border-slate-50 hover:border-slate-200'
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                          notification.type === 'announcement' ? 'bg-amber-100 text-amber-600' :
                          notification.type === 'status_update' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-indigo-100 text-indigo-600'
                        }`}>
                          {notification.type === 'announcement' ? <Megaphone size={20} /> :
                           notification.type === 'status_update' ? <CheckCircle2 size={20} /> :
                           <Info size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-sm font-bold text-slate-900 truncate">{notification.title}</p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                            )}
                          </div>
                          <p className="text-sm text-slate-600 leading-relaxed mb-3">{notification.message}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {format(new Date(notification.createdAt?.toDate ? notification.createdAt.toDate() : notification.createdAt), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
              
              <div className="p-6 border-t border-slate-100 bg-slate-50/30">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                  Close Panel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SendAnnouncementModal({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'notifications'), {
        userId: null,
        title: formData.title,
        message: formData.message,
        type: 'announcement',
        read: false,
        createdAt: serverTimestamp()
      });
      toast.success('Announcement sent to all users');
      onClose();
    } catch (error) {
      handleFirestoreError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <Megaphone size={20} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Send Announcement</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Announcement Title</label>
            <input 
              required
              type="text" 
              placeholder="e.g. Upcoming General Meeting"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Message</label>
            <textarea 
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 h-32 resize-none"
              placeholder="Enter the details of your announcement..."
              value={formData.message}
              onChange={e => setFormData({...formData, message: e.target.value})}
            />
          </div>
          <button 
            disabled={loading}
            className="w-full bg-amber-600 text-white py-4 rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-xl shadow-amber-200 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Broadcast Announcement'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

function NotificationsPage({ notifications }: { notifications: Notification[] }) {
  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (error) {
      handleFirestoreError(error);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read);
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { read: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error);
    }
  };

  const deleteNotification = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notification deleted');
    } catch (error) {
      handleFirestoreError(error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">Notifications</h2>
          <p className="text-slate-500 font-medium">Stay updated with the latest announcements and system alerts</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 active:scale-95"
          >
            <Check size={18} />
            Mark All as Read
          </button>
        )}
      </header>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {notifications.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Bell className="text-slate-200" size={40} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No notifications yet</h3>
              <p className="text-slate-500 max-w-xs mx-auto">When you receive announcements or updates, they will appear here.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`p-8 transition-all flex flex-col md:flex-row gap-6 items-start group ${!notification.read ? 'bg-indigo-50/20' : ''}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                  notification.type === 'announcement' ? 'bg-amber-100 text-amber-600' :
                  notification.type === 'status_update' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-indigo-100 text-indigo-600'
                }`}>
                  {notification.type === 'announcement' ? <Megaphone size={24} /> :
                   notification.type === 'status_update' ? <CheckCircle2 size={24} /> :
                   <Info size={24} />}
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h4 className={`text-lg font-bold ${!notification.read ? 'text-slate-900' : 'text-slate-600'}`}>
                      {notification.title}
                    </h4>
                    {!notification.read && (
                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-widest">New</span>
                    )}
                    <span className="text-xs font-medium text-slate-400">
                      {format(new Date(notification.createdAt?.toDate ? notification.createdAt.toDate() : notification.createdAt), 'MMMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  <p className={`text-slate-600 leading-relaxed ${!notification.read ? 'font-medium' : ''}`}>
                    {notification.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  {!notification.read && (
                    <button 
                      onClick={() => markAsRead(notification.id)}
                      className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                      title="Mark as read"
                    >
                      <Check size={20} />
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(notification.id)}
                    className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    title="Delete"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
