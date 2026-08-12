import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import { useSettings } from '../context/SettingsContext';
import { User } from '../types';
import { Shield, Key, Database, RefreshCw, AlertCircle, CheckCircle, UserPlus, Sliders, Trophy } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { refreshSettings } = useSettings();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form for new operator/admin
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'operator'>('operator');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // League Settings
  const [minMatchesQual, setMinMatchesQual] = useState<number>(8);
  const [appName, setAppName] = useState<string>('Ludo League');
  const [savingSettings, setSavingSettings] = useState(false);

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
      await apiRequest('/settings/app', {
        method: 'PUT',
        body: JSON.stringify({
          minMatchesQualification: Number(minMatchesQual),
          appName: appName.trim()
        })
      });
      setSuccessMsg('League settings updated successfully!');
      await refreshSettings();
      fetchLeagueSettings();
    } catch (err: any) {
      setError(err.message || 'Failed to update league settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name || !username || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, username, password, role })
      });

      setSuccessMsg(`User "${username}" created successfully as ${role}.`);
      setName('');
      setUsername('');
      setPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800/80 shadow-xl relative overflow-hidden">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight">Admin & League Settings</h1>
            <p className="text-xs text-zinc-400">Manage league rules, qualification thresholds, operators, and admin credentials</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/30 border border-red-800/60 flex items-center space-x-3 text-red-300 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 flex items-center space-x-3 text-emerald-300 text-xs">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* League Rules & Qualification Threshold Card */}
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800/60">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-zinc-100">League & Qualification Rules</h3>
          </div>

          <form onSubmit={handleSaveLeagueSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                Minimum Matches for Qualification *
              </label>
              <input
                id="input-min-matches-qual"
                type="number"
                min="1"
                max="100"
                value={minMatchesQual}
                onChange={(e) => setMinMatchesQual(Number(e.target.value))}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-bold focus:ring-2 focus:ring-amber-500"
                required
              />
              <p className="text-[11px] text-zinc-500 mt-1">
                Players must play at least this many matches in a calendar month to be marked as <span className="text-emerald-400 font-bold">Qualified</span> on the Monthly Leaderboard.
              </p>
            </div>

            <div>
              <label className="block font-bold text-zinc-300 mb-1">
                League Name *
              </label>
              <input
                id="input-app-name"
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 font-bold focus:ring-2 focus:ring-amber-500"
                required
              />
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
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-zinc-800/60">
            <UserPlus className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-zinc-100">Add League Operator</h3>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-zinc-400 mb-1">Full Name *</label>
              <input
                id="input-setting-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Suresh Patel"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">Username *</label>
              <input
                id="input-setting-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. suresh_op"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">Role *</label>
              <select
                id="select-setting-role"
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:ring-2 focus:ring-amber-500"
              >
                <option value="operator">Operator (Can record matches)</option>
                <option value="admin">Administrator (Full control)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-zinc-400 mb-1">Password *</label>
              <input
                id="input-setting-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 focus:ring-2 focus:ring-amber-500"
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
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-extrabold text-zinc-100">Authorized System Users</h3>
            </div>
            <button
              onClick={fetchUsers}
              className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-lg hover:bg-zinc-800"
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
                  <tr className="border-b border-zinc-800 text-zinc-500 uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Username</th>
                    <th className="py-2.5 px-3">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium text-zinc-300">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-3 font-bold text-zinc-100">{u.name}</td>
                      <td className="py-3 px-3 font-mono text-amber-400">{u.username}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase ${
                            u.role === 'admin'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
