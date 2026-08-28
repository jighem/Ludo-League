import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { useLeague } from '../context/LeagueContext';
import { useAuth } from '../context/AuthContext';
import { User, League } from '../types';
import {
  Shield,
  Key,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Sliders,
  Trophy,
  Crown,
  Plus,
  Edit2,
  X,
  Save,
  Check,
  Trash2,
  Lock,
  Unlock
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { refreshSettings } = useSettings();
  const { leagues, refreshLeagues, activeLeagueId, setActiveLeagueId } = useLeague();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form for new operator/admin
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('operator');
  const [password, setPassword] = useState('');
  const [addLeagueMode, setAddLeagueMode] = useState<'all' | 'specific'>('all');
  const [selectedAllowedLeagues, setSelectedAllowedLeagues] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);

  // Edit User Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserRole, setEditUserRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
  const [editUserActive, setEditUserActive] = useState(true);
  const [editUserLeagueMode, setEditUserLeagueMode] = useState<'all' | 'specific'>('all');
  const [editUserAllowedLeagues, setEditUserAllowedLeagues] = useState<number[]>([]);
  const [editUserPassword, setEditUserPassword] = useState('');
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  // League Settings
  const [minMatchesQual, setMinMatchesQual] = useState<number>(8);
  const [appName, setAppName] = useState<string>('Ludo League Master');
  const [savingSettings, setSavingSettings] = useState(false);

  // New League Form
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueCode, setNewLeagueCode] = useState('');
  const [newLeagueDesc, setNewLeagueDesc] = useState('');
  const [creatingLeague, setCreatingLeague] = useState(false);

  // Edit League Modal State
  const [editingLeague, setEditingLeague] = useState<League | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsDefault, setEditIsDefault] = useState(false);
  const [savingLeagueEdit, setSavingLeagueEdit] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchLeagueSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ users: User[] }>('/auth/users');
      setUsers(res.users);
    } catch (err: any) {
      setError(err.message || 'Failed to load system users.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeagueSettings = async () => {
    try {
      const res = await apiRequest<{ settings: { minMatchesQualification: number; appName: string } }>('/settings');
      if (res.settings) {
        if (res.settings.minMatchesQualification) setMinMatchesQual(res.settings.minMatchesQualification);
        if (res.settings.appName) setAppName(res.settings.appName);
      }
    } catch (err) {
      console.error('Failed to load league settings:', err);
    }
  };

  const handleSaveLeagueSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    try {
      setSavingSettings(true);
      await apiRequest('/settings', {
        method: 'POST',
        body: JSON.stringify({
          minMatchesQualification: minMatchesQual,
          appName: appName.trim()
        })
      });
      setSuccessMsg('League master settings updated successfully.');
      await refreshSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!name.trim() || !username.trim() || !password) {
      setError('Please fill in all user fields (name, username, password).');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    if (role === 'operator' && addLeagueMode === 'specific' && selectedAllowedLeagues.length === 0) {
      setError('Please select at least one league for this operator, or select "All Active Leagues".');
      return;
    }

    try {
      setCreating(true);
      const allowed_leagues = role === 'admin' ? null : (addLeagueMode === 'all' ? null : selectedAllowedLeagues);
      const res = await apiRequest<{ message?: string; user?: any }>('/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim().toLowerCase(),
          role,
          password,
          allowed_leagues
        })
      });
      setSuccessMsg(res.message || `User "${username.trim().toLowerCase()}" created successfully.`);
      setName('');
      setUsername('');
      setPassword('');
      setAddLeagueMode('all');
      setSelectedAllowedLeagues([]);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserRole(u.role);
    setEditUserActive(u.is_active === 1);
    setEditUserPassword('');

    if (u.role === 'admin' || u.allowed_leagues === null || u.allowed_leagues === undefined) {
      setEditUserLeagueMode('all');
      setEditUserAllowedLeagues([]);
    } else {
      setEditUserLeagueMode('specific');
      let parsed: number[] = [];
      if (Array.isArray(u.allowed_leagues)) {
        parsed = u.allowed_leagues.map(Number);
      } else if (typeof u.allowed_leagues === 'string') {
        try {
          parsed = JSON.parse(u.allowed_leagues).map(Number);
        } catch {
          parsed = u.allowed_leagues.split(',').map(Number);
        }
      }
      setEditUserAllowedLeagues(parsed);
    }
    setError('');
    setSuccessMsg('');
  };

  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    setSuccessMsg('');

    if (!editUserName.trim()) {
      setError('Full Name is required.');
      return;
    }

    if (editUserRole === 'operator' && editUserLeagueMode === 'specific' && editUserAllowedLeagues.length === 0) {
      setError('Please select at least one permitted league or choose "All Active Leagues".');
      return;
    }

    try {
      setSavingUserEdit(true);
      const allowed_leagues = editUserRole === 'admin' ? null : (editUserLeagueMode === 'all' ? null : editUserAllowedLeagues);
      const payload: any = {
        name: editUserName.trim(),
        role: editUserRole,
        is_active: editUserActive ? 1 : 0,
        allowed_leagues
      };
      if (editUserPassword.trim()) {
        payload.password = editUserPassword.trim();
      }

      await apiRequest(`/auth/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      setSuccessMsg(`User "${editingUser.username}" updated successfully.`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleToggleUserStatus = async (userToToggle: User) => {
    setError('');
    setSuccessMsg('');
    try {
      const newStatus = userToToggle.is_active ? 0 : 1;
      await apiRequest(`/auth/users/${userToToggle.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_active: newStatus
        })
      });
      setSuccessMsg(`User ${userToToggle.username} ${newStatus ? 'activated' : 'deactivated'} successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to update user status.');
    }
  };

  const handleDeleteUser = async (userToDelete: User) => {
    if (!window.confirm(`Are you sure you want to remove user "${userToDelete.username}"?`)) {
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      await apiRequest(`/auth/users/${userToDelete.id}`, {
        method: 'DELETE'
      });
      setSuccessMsg(`User ${userToDelete.username} deleted successfully.`);
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user.');
    }
  };

  const handleCreateLeague = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!newLeagueName.trim()) {
      setError('Please provide a league name.');
      return;
    }
    try {
      setCreatingLeague(true);
      const res = await apiRequest<{ league: League; message: string }>('/leagues', {
        method: 'POST',
        body: JSON.stringify({
          name: newLeagueName.trim(),
          code: newLeagueCode.trim(),
          description: newLeagueDesc.trim()
        })
      });
      setSuccessMsg(`League "${res.league.name}" created successfully.`);
      setNewLeagueName('');
      setNewLeagueCode('');
      setNewLeagueDesc('');
      await refreshLeagues();
      if (res.league?.id) {
        setActiveLeagueId(res.league.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create new league.');
    } finally {
      setCreatingLeague(false);
    }
  };

  const handleOpenEditLeague = (lg: League) => {
    setEditingLeague(lg);
    setEditName(lg.name);
    setEditCode(lg.code);
    setEditDesc(lg.description || '');
    setEditIsActive(lg.is_active === 1);
    setEditIsDefault(lg.is_default === 1);
    setError('');
    setSuccessMsg('');
  };

  const handleSaveLeagueEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLeague) return;
    setError('');
    setSuccessMsg('');

    if (!editName.trim()) {
      setError('League name is required.');
      return;
    }

    try {
      setSavingLeagueEdit(true);
      await apiRequest(`/leagues/${editingLeague.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editName.trim(),
          code: editCode.trim(),
          description: editDesc.trim(),
          is_active: editIsActive,
          is_default: editIsDefault
        })
      });
      setSuccessMsg(`League "${editName.trim()}" altered and saved successfully.`);
      setEditingLeague(null);
      await refreshLeagues();
    } catch (err: any) {
      setError(err.message || 'Failed to update league.');
    } finally {
      setSavingLeagueEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">System & League Administration</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Alter league titles, manage multiple concurrent leagues, qualification criteria, and authorized operator credentials
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Multi-League Master Management Section */}
      <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">League Master Management</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Create, alter names, and configure multiple concurrent Ludo leagues</p>
            </div>
          </div>
          <button
            onClick={refreshLeagues}
            className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            title="Refresh Leagues"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create League Form */}
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <h4 className="text-xs font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add New League
            </h4>
            <form onSubmit={handleCreateLeague} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">League Name *</label>
                <input
                  id="input-new-league-name"
                  type="text"
                  value={newLeagueName}
                  onChange={(e) => setNewLeagueName(e.target.value)}
                  placeholder="e.g. AC Ludo League 2, Weekend Cup"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">League Code (Optional)</label>
                <input
                  id="input-new-league-code"
                  type="text"
                  value={newLeagueCode}
                  onChange={(e) => setNewLeagueCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ALL2"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Description (Optional)</label>
                <textarea
                  id="input-new-league-desc"
                  value={newLeagueDesc}
                  onChange={(e) => setNewLeagueDesc(e.target.value)}
                  placeholder="e.g. Night tournament or division 2"
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <button
                id="btn-create-league-submit"
                type="submit"
                disabled={creatingLeague}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-zinc-950 font-black rounded-xl shadow-md cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center space-x-1.5"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>{creatingLeague ? 'Creating League...' : 'Add League'}</span>
              </button>
            </form>
          </div>

          {/* Active Leagues List with Alter / Edit Button */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-zinc-500 tracking-wider">
                Configured Leagues ({leagues.length})
              </h4>
              <span className="text-[11px] text-zinc-400">Click &quot;Edit&quot; to alter any league name or code</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {leagues.map((lg) => {
                const isActive = lg.id === activeLeagueId;
                return (
                  <div
                    key={lg.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                      isActive
                        ? 'border-amber-500/50 bg-amber-500/10 dark:bg-amber-500/15 shadow-sm'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 pr-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-sm text-zinc-900 dark:text-zinc-100 truncate">
                              {lg.name}
                            </span>
                            {lg.is_default === 1 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded uppercase font-black bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                Default Master
                              </span>
                            )}
                            {lg.is_active === 0 && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded uppercase font-bold bg-zinc-500/20 text-zinc-500 border border-zinc-500/30">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-zinc-500 mt-0.5">Code: {lg.code}</p>
                          {lg.description && (
                            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                              {lg.description}
                            </p>
                          )}
                          <div className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {lg.total_matches !== undefined ? `${lg.total_matches} matches recorded` : ''}
                          </div>
                        </div>

                        <button
                          id={`btn-edit-league-${lg.id}`}
                          onClick={() => handleOpenEditLeague(lg)}
                          className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer shrink-0"
                          title="Alter / Rename League Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-zinc-200 dark:border-zinc-800/60 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenEditLeague(lg)}
                        className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Alter Name</span>
                      </button>

                      <button
                        onClick={() => setActiveLeagueId(lg.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-amber-500/20'
                        }`}
                      >
                        {isActive ? 'Active' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Alter / Edit League Modal Dialog */}
      {editingLeague && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-w-md w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                  Alter League Details (ID: {editingLeague.id})
                </h3>
              </div>
              <button
                onClick={() => setEditingLeague(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeagueEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">League Name *</label>
                <input
                  id="input-edit-league-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Premier Ludo League"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">League Code *</label>
                <input
                  id="input-edit-league-code"
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ALL1"
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-mono focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                <textarea
                  id="input-edit-league-desc"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={2}
                  placeholder="League description or format..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center space-x-4 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                  />
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">Active</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsDefault}
                    onChange={(e) => setEditIsDefault(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                  />
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">Set as Default Master</span>
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLeague(null)}
                  className="w-1/2 py-2 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-save-edit-league-submit"
                  type="submit"
                  disabled={savingLeagueEdit}
                  className="w-1/2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingLeagueEdit ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* League Rules Settings Card */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">League Rules & Brand Title</h3>
          </div>

          <form onSubmit={handleSaveLeagueSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Application Brand Name *
              </label>
              <input
                id="input-app-name"
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="Ludo League Master"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-amber-500"
                required
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Sets the global title displayed on top navigation and headers.
              </p>
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Minimum Matches for Qualification *
              </label>
              <input
                id="input-min-matches-qual"
                type="number"
                min="1"
                max="100"
                value={minMatchesQual}
                onChange={(e) => setMinMatchesQual(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 font-bold focus:ring-2 focus:ring-amber-500"
                required
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Players must play at least this many matches in a calendar month to be marked as <span className="text-emerald-500 font-bold">Qualified</span> on the Monthly Leaderboard.
              </p>
            </div>

            <button
              id="btn-save-league-settings"
              type="submit"
              disabled={savingSettings}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 transition-all"
            >
              {savingSettings ? 'Saving Changes...' : 'Save League Settings'}
            </button>
          </form>
        </div>

        {/* Create Operator Form Card */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Add League Operator</h3>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-400 mb-1">Full Name *</label>
              <input
                id="input-setting-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Suresh Patel"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-400 mb-1">Username *</label>
              <input
                id="input-setting-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. suresh_op"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-400 mb-1">Role *</label>
              <select
                id="select-setting-role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="operator">Operator (Can record matches)</option>
                <option value="admin">Administrator (Full control)</option>
              </select>
            </div>

            {/* League Access Rights Configuration */}
            {role === 'operator' ? (
              <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-500" /> Permitted Leagues
                  </label>
                  <span className="text-[10px] text-zinc-500 font-semibold">Access Rights</span>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="add_league_mode"
                      checked={addLeagueMode === 'all'}
                      onChange={() => setAddLeagueMode('all')}
                      className="text-amber-500 focus:ring-amber-500 accent-amber-500"
                    />
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">All Active Leagues</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="add_league_mode"
                      checked={addLeagueMode === 'specific'}
                      onChange={() => {
                        setAddLeagueMode('specific');
                        if (selectedAllowedLeagues.length === 0 && leagues.length > 0) {
                          setSelectedAllowedLeagues([leagues[0].id]);
                        }
                      }}
                      className="text-amber-500 focus:ring-amber-500 accent-amber-500"
                    />
                    <span className="font-bold text-zinc-700 dark:text-zinc-300">Specific Leagues</span>
                  </label>
                </div>

                {addLeagueMode === 'specific' && (
                  <div className="space-y-1.5 pt-1.5 border-t border-amber-500/15 max-h-36 overflow-y-auto">
                    {leagues.map((lg) => {
                      const isChecked = selectedAllowedLeagues.includes(lg.id);
                      return (
                        <label
                          key={lg.id}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-amber-500/10 border-amber-500/30 text-zinc-900 dark:text-zinc-100 font-bold'
                              : 'bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAllowedLeagues([...selectedAllowedLeagues, lg.id]);
                                } else {
                                  setSelectedAllowedLeagues(selectedAllowedLeagues.filter((id) => id !== lg.id));
                                }
                              }}
                              className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                            />
                            <span>{lg.name}</span>
                          </div>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                            {lg.code}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>Administrators hold unrestricted system access across all current and future leagues.</span>
              </div>
            )}

            <div>
              <label className="block font-bold text-zinc-700 dark:text-zinc-400 mb-1">Password *</label>
              <input
                id="input-setting-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <button
              id="btn-setting-create-user"
              type="submit"
              disabled={creating}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/10 cursor-pointer disabled:opacity-50 transition-all"
            >
              {creating ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>

        {/* Existing Authorized Accounts Card */}
        <div className="bg-white dark:bg-zinc-900/80 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800/80 shadow-md dark:shadow-xl space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800/60">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">Authorized System Users</h3>
            </div>
            <button
              onClick={fetchUsers}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              title="Refresh Users"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-zinc-500 text-xs">Loading user list...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Permitted Leagues</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60 font-medium text-zinc-700 dark:text-zinc-300">
                  {users.map((u) => {
                    let parsedAllowed: number[] | 'all' = 'all';
                    if (u.role === 'admin') {
                      parsedAllowed = 'all';
                    } else if (u.allowed_leagues === null || u.allowed_leagues === undefined) {
                      parsedAllowed = 'all';
                    } else if (Array.isArray(u.allowed_leagues)) {
                      parsedAllowed = u.allowed_leagues.map(Number);
                    } else if (typeof u.allowed_leagues === 'string') {
                      try {
                        parsedAllowed = JSON.parse(u.allowed_leagues).map(Number);
                      } catch {
                        parsedAllowed = u.allowed_leagues.split(',').map(Number);
                      }
                    }

                    return (
                      <tr key={u.id} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/30">
                        <td className="py-3 px-3 font-bold text-zinc-900 dark:text-zinc-100">
                          {u.name}
                          {currentUser?.id === u.id && (
                            <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-amber-600 dark:text-amber-400">{u.username}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                              u.role === 'admin'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {parsedAllowed === 'all' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                              <Crown className="w-3 h-3 text-amber-500" /> All Leagues
                            </span>
                          ) : parsedAllowed.length === 0 ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-red-500/15 text-red-600 dark:text-red-400">
                              No Leagues Assigned
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {parsedAllowed.map((lid) => {
                                const matchedLg = leagues.find((l) => l.id === lid);
                                return (
                                  <span
                                    key={lid}
                                    className="px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30"
                                    title={matchedLg ? `${matchedLg.name} (${matchedLg.code})` : `League #${lid}`}
                                  >
                                    {matchedLg ? matchedLg.name : `#${lid}`}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              u.is_active
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-red-500/15 text-red-600 dark:text-red-400'
                            }`}
                          >
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenEditUser(u)}
                              className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-amber-500 cursor-pointer"
                              title="Edit User & Permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {currentUser?.id !== u.id && (
                              <>
                                <button
                                  onClick={() => handleToggleUserStatus(u)}
                                  className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
                                  title={u.is_active ? 'Deactivate User' : 'Activate User'}
                                >
                                  {u.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-500 cursor-pointer"
                                  title="Remove User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                  Edit User & League Rights
                </h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Username</label>
                <input
                  type="text"
                  value={editingUser.username}
                  disabled
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-500 dark:text-zinc-400 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">System Role *</label>
                <select
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
                >
                  <option value="operator">Operator (Can record matches in assigned leagues)</option>
                  <option value="admin">Administrator (Unrestricted control)</option>
                </select>
              </div>

              {/* League rights configuration */}
              {editUserRole === 'operator' ? (
                <div className="p-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-extrabold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5 text-amber-500" /> Permitted Leagues
                    </label>
                    <span className="text-[10px] text-zinc-500 font-semibold">Rights Assignment</span>
                  </div>

                  <div className="flex items-center space-x-3 pt-1">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="edit_league_mode"
                        checked={editUserLeagueMode === 'all'}
                        onChange={() => setEditUserLeagueMode('all')}
                        className="text-amber-500 focus:ring-amber-500 accent-amber-500"
                      />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">All Active Leagues</span>
                    </label>
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="edit_league_mode"
                        checked={editUserLeagueMode === 'specific'}
                        onChange={() => {
                          setEditUserLeagueMode('specific');
                          if (editUserAllowedLeagues.length === 0 && leagues.length > 0) {
                            setEditUserAllowedLeagues([leagues[0].id]);
                          }
                        }}
                        className="text-amber-500 focus:ring-amber-500 accent-amber-500"
                      />
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">Specific Leagues</span>
                    </label>
                  </div>

                  {editUserLeagueMode === 'specific' && (
                    <div className="space-y-1.5 pt-1.5 border-t border-amber-500/15 max-h-40 overflow-y-auto">
                      {leagues.map((lg) => {
                        const isChecked = editUserAllowedLeagues.includes(lg.id);
                        return (
                          <label
                            key={lg.id}
                            className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                              isChecked
                                ? 'bg-amber-500/10 border-amber-500/30 text-zinc-900 dark:text-zinc-100 font-bold'
                                : 'bg-white/60 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditUserAllowedLeagues([...editUserAllowedLeagues, lg.id]);
                                  } else {
                                    setEditUserAllowedLeagues(editUserAllowedLeagues.filter((id) => id !== lg.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                              />
                              <span>{lg.name}</span>
                            </div>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold">
                              {lg.code}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-[11px] flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  <span>Administrators hold unrestricted system access across all current and future leagues.</span>
                </div>
              )}

              <div>
                <label className="block font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                  Reset Password <span className="text-zinc-400 font-normal">(leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  placeholder="New password (optional)..."
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editUserActive}
                    onChange={(e) => setEditUserActive(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500"
                  />
                  <span className="font-bold text-zinc-700 dark:text-zinc-300">Account is Active & Enabled</span>
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-1/2 py-2 px-3 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUserEdit}
                  className="w-1/2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-black flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{savingUserEdit ? 'Saving...' : 'Save User Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
