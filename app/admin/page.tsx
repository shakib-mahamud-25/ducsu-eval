'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, LogOut, Loader2, Check, X, Download, Trash2 } from 'lucide-react';
import { getFlaggedSubmissions, getLeaderScores, LeaderScore } from '@/lib/firebase';

interface FlaggedSubmission {
  id: string;
  ip_address: string;
  count_from_ip: number;
  fingerprints: string[];
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  createdAt: number;
}

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [flaggedSubmissions, setFlaggedSubmissions] = useState<FlaggedSubmission[]>([]);
  const [leaderScores, setLeaderScores] = useState<Map<string, LeaderScore>>(new Map());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'flagged' | 'results' | 'data'>('flagged');

  // Check if already authenticated via URL
  useEffect(() => {
    const token = searchParams.get('admin_token');
    if (token === process.env.NEXT_PUBLIC_ADMIN_TOKEN) {
      setIsAuthenticated(true);
    }
  }, [searchParams]);

  const [loginLoading, setLoginLoading] = useState(false);

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
    } catch (error) {
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
      const flagged = await getFlaggedSubmissions();
      const scores = await getLeaderScores();

      const flaggedArray = Array.from(flagged.values()).map((f, idx) => ({
        ...f,
        id: idx.toString(),
      }));

      setFlaggedSubmissions(flaggedArray);
      setLeaderScores(scores);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (index: number) => {
    const updated = [...flaggedSubmissions];
    updated[index].status = 'approved';
    setFlaggedSubmissions(updated);
  };

  const handleReject = (index: number) => {
    const updated = [...flaggedSubmissions];
    updated[index].status = 'rejected';
    setFlaggedSubmissions(updated);
  };

  const handleDeleteData = async () => {
    if (window.confirm('Are you sure? This will delete all fraud detection data permanently.')) {
      console.log('Deleting fraud detection data...');
      // In production, call Firebase delete function
    }
  };

  const exportResults = () => {
    const results = Array.from(leaderScores.values()).map((score) => ({
      leaderId: score.leaderId,
      totalVotes: score.totalVotes,
      averageScore: score.averageScore.toFixed(2),
      distribution: score.scoreDistribution,
    }));

    const csv = [
      ['Leader ID', 'Total Votes', 'Average Score', 'Min Score', 'Max Score'],
      ...results.map((r) => [
        r.leaderId,
        r.totalVotes,
        r.averageScore,
        Object.keys(r.distribution)[0],
        Object.keys(r.distribution)[Object.keys(r.distribution).length - 1],
      ]),
    ];

    const csvContent = csv.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ducsu-results-${Date.now()}.csv`;
    a.click();
  };

  // Login Form
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center px-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="flex justify-center mb-6">
            <Shield className="w-12 h-12 text-purple-500" />
          </div>

          <h1 className="text-3xl font-bold text-white text-center mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-400 text-center mb-6">
            DUCSU 2025 Evaluation Management
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter admin password"
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2">{passwordError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 rounded-lg hover:shadow-lg transition disabled:opacity-50"
            >
              {loginLoading ? 'Checking...' : 'Login'}
            </button>
          </form>

          <p className="text-gray-500 text-xs text-center mt-4">
            Password is stored securely and encrypted in transit
          </p>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-purple-100">DUCSU 2025 Evaluation Management</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          {(['flagged', 'results', 'data'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                loadData();
              }}
              className={`px-4 py-3 font-semibold transition ${
                activeTab === tab
                  ? 'text-purple-500 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'flagged' && 'Flagged Submissions'}
              {tab === 'results' && 'Live Results'}
              {tab === 'data' && 'Data Management'}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-gray-400">Loading data...</p>
          </div>
        ) : (
          <>
            {/* Flagged Submissions Tab */}
            {activeTab === 'flagged' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">
                  Flagged IP Addresses ({flaggedSubmissions.length})
                </h2>
                {flaggedSubmissions.length === 0 ? (
                  <p className="text-gray-400">No flagged submissions</p>
                ) : (
                  flaggedSubmissions.map((submission, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition"
                    >
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-gray-400 text-sm">IP Address</p>
                          <p className="text-white font-mono text-sm break-all">{submission.ip_address}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 text-sm">Submissions from IP</p>
                          <p className="text-white text-lg font-bold">
                            {submission.count_from_ip}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-2">Status</p>
                        <p className="text-white text-sm capitalize font-semibold">
                          {submission.status === 'pending' && (
                            <span className="text-yellow-400">● Pending Review</span>
                          )}
                          {submission.status === 'approved' && (
                            <span className="text-green-400">✓ Approved</span>
                          )}
                          {submission.status === 'rejected' && (
                            <span className="text-red-400">✗ Rejected</span>
                          )}
                        </p>
                      </div>

                      <div className="mb-4">
                        <p className="text-gray-400 text-sm mb-2">Fingerprints Detected</p>
                        <p className="text-gray-300 text-xs">
                          {submission.fingerprints.length} unique device(s)
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(idx)}
                          disabled={submission.status === 'approved'}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition ${
                            submission.status === 'approved'
                              ? 'bg-green-600 text-white cursor-default'
                              : 'bg-gray-700 text-gray-300 hover:bg-green-600 hover:text-white'
                          }`}
                        >
                          <Check size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(idx)}
                          disabled={submission.status === 'rejected'}
                          className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-semibold transition ${
                            submission.status === 'rejected'
                              ? 'bg-red-600 text-white cursor-default'
                              : 'bg-gray-700 text-gray-300 hover:bg-red-600 hover:text-white'
                          }`}
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Results Tab */}
            {activeTab === 'results' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">
                    Real-time Voting Results
                  </h2>
                  <button
                    onClick={exportResults}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition"
                  >
                    <Download size={18} />
                    Export CSV
                  </button>
                </div>
                {leaderScores.size === 0 ? (
                  <p className="text-gray-400">No votes yet</p>
                ) : (
                  <div className="space-y-3">
                    {Array.from(leaderScores.values())
                      .sort((a, b) => b.averageScore - a.averageScore)
                      .map((score) => (
                        <div
                          key={score.leaderId}
                          className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-semibold text-sm">{score.leaderId}</p>
                            <span className="text-lg font-bold text-yellow-400">
                              {score.averageScore.toFixed(2)}/5
                            </span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full"
                              style={{
                                width: `${(score.averageScore / 5) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="text-gray-400 text-sm mt-2">
                            {score.totalVotes} vote{score.totalVotes !== 1 ? 's' : ''}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Data Management Tab */}
            {activeTab === 'data' && (
              <div className="space-y-4">
                <h2 className="text-xl font-bold mb-4">Data Management</h2>

                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 mb-4">
                  <p className="text-yellow-200 text-sm">
                    Fraud detection data (IP logs, fingerprints) is automatically deleted after 14 days.
                    You can manually delete earlier if needed.
                  </p>
                </div>

                <div className="space-y-2 bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-300 text-sm">
                    <strong>Flagged Submissions:</strong> {flaggedSubmissions.length}
                  </p>
                  <p className="text-gray-300 text-sm">
                    <strong>Total Leaders Voted:</strong> {leaderScores.size}
                  </p>
                  <p className="text-gray-300 text-sm">
                    <strong>Total Votes:</strong> {Array.from(leaderScores.values()).reduce((sum, s) => sum + s.totalVotes, 0)}
                  </p>
                </div>

                <button
                  onClick={handleDeleteData}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition font-semibold"
                >
                  <Trash2 size={18} />
                  Delete Fraud Detection Data
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminLoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
