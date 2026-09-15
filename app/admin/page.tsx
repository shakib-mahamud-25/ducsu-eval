'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, LogOut, Loader2, Trash2, Download, Settings, CheckSquare, Square } from 'lucide-react';
import {
  getFlaggedSubmissions,
  getLeaderScores,
  getVotingWindowConfig,
  setVotingWindowConfig,
  deleteMultipleFlaggedEntries,
  LeaderScore,
  VotingWindowConfig,
  FlaggedSubmission,
} from '@/lib/firebase';

interface FlaggedRow extends FlaggedSubmission {
  flagId: string;
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [flaggedRows, setFlaggedRows] = useState<FlaggedRow[]>([]);
  const [selectedFlagIds, setSelectedFlagIds] = useState<Set<string>>(new Set());
  const [leaderScores, setLeaderScores] = useState<Map<string, LeaderScore>>(new Map());
  const [votingWindow, setVotingWindowState] = useState<VotingWindowConfig>({
    isOpen: true,
    startTime: null,
    endTime: null,
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingWindow, setSavingWindow] = useState(false);
  const [activeTab, setActiveTab] = useState<'flagged' | 'results' | 'settings'>('flagged');

  useEffect(() => {
    const token = searchParams.get('admin_token');
    if (token === process.env.NEXT_PUBLIC_ADMIN_TOKEN) {
      setIsAuthenticated(true);
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setPasswordError('');
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
        setPassword('');
      } else {
        setPasswordError('Invalid password');
      }
    } catch {
      setPasswordError('Login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword('');
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [flagged, scores, window] = await Promise.all([
        getFlaggedSubmissions(),
        getLeaderScores(),
        getVotingWindowConfig(),
      ]);

      const rows: FlaggedRow[] = Array.from(flagged.entries()).map(([flagId, data]) => ({
        ...data,
        flagId,
      }));

      setFlaggedRows(rows);
      setLeaderScores(scores);
      setVotingWindowState(window);
      setSelectedFlagIds(new Set());
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const toggleSelected = (flagId: string) => {
    setSelectedFlagIds((prev) => {
      const next = new Set(prev);
      if (next.has(flagId)) next.delete(flagId);
      else next.add(flagId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFlagIds.size === flaggedRows.length) {
      setSelectedFlagIds(new Set());
    } else {
      setSelectedFlagIds(new Set(flaggedRows.map((r) => r.flagId)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFlagIds.size === 0) return;
    const confirmMsg =
      selectedFlagIds.size === 1
        ? 'Delete this flagged entry and its associated fraud detection records? This cannot be undone.'
        : `Delete ${selectedFlagIds.size} flagged entries and their associated fraud detection records? This cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setDeleting(true);
    try {
      const entries = flaggedRows
        .filter((r) => selectedFlagIds.has(r.flagId))
        .map((r) => ({ flagId: r.flagId, ipAddress: r.ip_address }));
      await deleteMultipleFlaggedEntries(entries);
      await loadData();
    } catch (error) {
      console.error('Failed to delete flagged entries:', error);
      alert('Something went wrong deleting those entries. Check the console for details.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveVotingWindow = async (next: VotingWindowConfig) => {
    setSavingWindow(true);
    try {
      await setVotingWindowConfig(next);
      setVotingWindowState(next);
    } catch (error) {
      console.error('Failed to save voting window:', error);
      alert('Failed to save. Check the console for details.');
    } finally {
      setSavingWindow(false);
    }
  };

  const exportResults = () => {
    const results = Array.from(leaderScores.values()).map((score) => ({
      leaderId: score.leaderId,
      totalVotes: score.totalVotes,
      averageScore: score.averageScore.toFixed(2),
    }));

    const csv = [
      ['Leader ID', 'Total Votes', 'Average Score'],
      ...results.map((r) => [r.leaderId, r.totalVotes, r.averageScore]),
    ];

    const csvContent = csv.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ducsu-results-${Date.now()}.csv`;
    a.click();
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center px-4">
        <div className="bg-navy-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <Shield className="w-11 h-11 text-gold-400" />
          </div>
          <h1 className="font-display text-2xl text-paper text-center mb-1">Admin Dashboard</h1>
          <p className="text-navy-400 text-center text-sm mb-6">DUCSU 2025 Evaluation Management</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-navy-300 text-sm font-medium mb-2">Admin Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter admin password"
                className="w-full bg-navy-700 text-paper px-4 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-maroon-500 placeholder:text-navy-400"
              />
              {passwordError && <p className="text-maroon-400 text-sm mt-2">{passwordError}</p>}
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-maroon-600 text-white font-semibold py-2.5 rounded-lg hover:bg-maroon-700 transition disabled:opacity-50"
            >
              {loginLoading ? 'Checking…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-900 text-paper">
      <div className="bg-navy-800 p-6 border-b border-navy-700">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-display text-2xl">Admin Dashboard</h1>
            <p className="text-navy-400 text-sm">DUCSU 2025 Evaluation Management</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 px-4 py-2 rounded-lg transition text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-1 mb-6 border-b border-navy-700">
          {(['flagged', 'results', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium text-sm transition ${
                activeTab === tab
                  ? 'text-gold-400 border-b-2 border-gold-400'
                  : 'text-navy-400 hover:text-navy-200'
              }`}
            >
              {tab === 'flagged' && 'Flagged Submissions'}
              {tab === 'results' && 'Live Results'}
              {tab === 'settings' && 'Voting Window'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-gold-400 mx-auto mb-3" />
            <p className="text-navy-400 text-sm">Loading…</p>
          </div>
        ) : (
          <>
            {activeTab === 'flagged' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button onClick={toggleSelectAll} className="text-navy-300 hover:text-paper transition">
                      {selectedFlagIds.size === flaggedRows.length && flaggedRows.length > 0 ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <h2 className="text-lg font-medium">
                      Flagged IPs ({flaggedRows.length})
                      {selectedFlagIds.size > 0 && (
                        <span className="text-navy-400 text-sm font-normal"> — {selectedFlagIds.size} selected</span>
                      )}
                    </h2>
                  </div>
                  {selectedFlagIds.size > 0 && (
                    <button
                      onClick={handleDeleteSelected}
                      disabled={deleting}
                      className="flex items-center gap-2 bg-maroon-600 hover:bg-maroon-700 px-4 py-2 rounded-lg transition text-sm font-medium disabled:opacity-50"
                    >
                      <Trash2 size={15} />
                      {deleting ? 'Deleting…' : `Delete ${selectedFlagIds.size}`}
                    </button>
                  )}
                </div>

                {flaggedRows.length === 0 ? (
                  <p className="text-navy-400 text-sm">No flagged submissions.</p>
                ) : (
                  <div className="space-y-2">
                    {flaggedRows.map((row) => (
                      <div
                        key={row.flagId}
                        className={`flex items-center gap-4 bg-navy-800 rounded-lg p-4 border transition ${
                          selectedFlagIds.has(row.flagId) ? 'border-maroon-500' : 'border-navy-700'
                        }`}
                      >
                        <button onClick={() => toggleSelected(row.flagId)} className="text-navy-300 hover:text-paper flex-shrink-0">
                          {selectedFlagIds.has(row.flagId) ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-navy-400 text-xs">IP Address</p>
                            <p className="font-mono text-sm break-all">{row.ip_address}</p>
                          </div>
                          <div>
                            <p className="text-navy-400 text-xs">Submissions</p>
                            <p className="text-sm font-semibold">{row.count_from_ip}</p>
                          </div>
                          <div>
                            <p className="text-navy-400 text-xs">Fingerprints</p>
                            <p className="text-sm">{row.fingerprints.length} device(s)</p>
                          </div>
                          <div>
                            <p className="text-navy-400 text-xs">Status</p>
                            <p className="text-sm capitalize">{row.status}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFlagIds(new Set([row.flagId]));
                            handleDeleteSelected();
                          }}
                          className="text-navy-400 hover:text-maroon-400 transition flex-shrink-0"
                          title="Delete this entry"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'results' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">Real-time Voting Results</h2>
                  <button
                    onClick={exportResults}
                    className="flex items-center gap-2 bg-navy-700 hover:bg-navy-600 px-4 py-2 rounded-lg transition text-sm"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                </div>
                {leaderScores.size === 0 ? (
                  <p className="text-navy-400 text-sm">No votes yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Array.from(leaderScores.values())
                      .sort((a, b) => b.averageScore - a.averageScore)
                      .map((score) => (
                        <div key={score.leaderId} className="bg-navy-800 rounded-lg p-4 border border-navy-700">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-sm">{score.leaderId}</p>
                            <span className="text-gold-400 font-semibold">{score.averageScore.toFixed(2)}/5</span>
                          </div>
                          <div className="w-full bg-navy-700 rounded-full h-1.5">
                            <div
                              className="bg-gold-500 h-1.5 rounded-full"
                              style={{ width: `${(score.averageScore / 5) * 100}%` }}
                            />
                          </div>
                          <p className="text-navy-400 text-xs mt-2">
                            {score.totalVotes} vote{score.totalVotes !== 1 ? 's' : ''}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <VotingWindowPanel
                votingWindow={votingWindow}
                saving={savingWindow}
                onSave={handleSaveVotingWindow}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

function VotingWindowPanel({
  votingWindow,
  saving,
  onSave,
}: {
  votingWindow: VotingWindowConfig;
  saving: boolean;
  onSave: (config: VotingWindowConfig) => void;
}) {
  const [isOpen, setIsOpen] = useState(votingWindow.isOpen);

  useEffect(() => {
    setIsOpen(votingWindow.isOpen);
  }, [votingWindow.isOpen]);

  return (
    <div className="max-w-md">
      <div className="flex items-center gap-2 mb-4">
        <Settings size={18} className="text-navy-400" />
        <h2 className="text-lg font-medium">Voting Window</h2>
      </div>

      <div className="bg-navy-800 rounded-lg p-5 border border-navy-700 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Voting is currently</p>
            <p className={`text-sm ${isOpen ? 'text-gold-400' : 'text-navy-400'}`}>
              {isOpen ? 'Open — students can submit evaluations' : 'Closed — submissions are blocked'}
            </p>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`relative w-12 h-6 rounded-full transition ${isOpen ? 'bg-maroon-600' : 'bg-navy-600'}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                isOpen ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <p className="text-navy-400 text-xs leading-relaxed">
          This takes effect immediately for all students — no redeploy needed. When closed,
          the evaluation button is hidden and the server also rejects new submissions directly.
        </p>

        <button
          onClick={() => onSave({ ...votingWindow, isOpen })}
          disabled={saving || isOpen === votingWindow.isOpen}
          className="w-full bg-maroon-600 hover:bg-maroon-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed text-sm"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  );
}

function AdminLoadingFallback() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <Loader2 className="w-7 h-7 animate-spin text-gold-400" />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<AdminLoadingFallback />}>
      <AdminDashboardContent />
    </Suspense>
  );
}
