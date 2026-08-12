import React from 'react';
import { BookOpen, Terminal, Shield, CheckCircle, Server, Database, Code, Cpu } from 'lucide-react';

export const InstallationPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800/80 shadow-xl relative overflow-hidden">
        <div className="flex items-center space-x-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight">Installation & Deployment Guide</h1>
            <p className="text-xs text-zinc-400">Step-by-step setup instructions for hosting and configuring Ludo League</p>
          </div>
        </div>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Requirements */}
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 font-black flex items-center justify-center text-sm border border-amber-500/20">
              1
            </div>
            <h3 className="text-base font-extrabold text-zinc-100">Environment Prerequisites</h3>
          </div>

          <ul className="space-y-2 text-xs text-zinc-300">
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Node.js 18.x or higher</strong> installed on your environment or server.</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>SQLite database engine</strong> (embedded automatically via standard node SQLite or SQLite3 binding).</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span><strong>Express / Node server environment</strong> listening on port 3000.</span>
            </li>
          </ul>
        </div>

        {/* Step 2: Commands */}
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 font-black flex items-center justify-center text-sm border border-amber-500/20">
              2
            </div>
            <h3 className="text-base font-extrabold text-zinc-100">Setup Commands</h3>
          </div>

          <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 font-mono text-xs text-amber-400 space-y-2">
            <div># Install project dependencies</div>
            <div className="text-zinc-200">npm install</div>
            <div className="pt-2"># Build frontend and compile server</div>
            <div className="text-zinc-200">npm run build</div>
            <div className="pt-2"># Start production server on port 3000</div>
            <div className="text-zinc-200">npm run start</div>
          </div>
        </div>

        {/* Step 3: Admin Initialization */}
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 font-black flex items-center justify-center text-sm border border-amber-500/20">
              3
            </div>
            <h3 className="text-base font-extrabold text-zinc-100">Initial Setup & Admin Account</h3>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            When launching the application for the first time on a fresh database, the system detects that no administrator account exists. An initialization modal automatically guides you to create the initial super-admin account.
          </p>
        </div>

        {/* Step 4: System Architecture */}
        <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 font-black flex items-center justify-center text-sm border border-amber-500/20">
              4
            </div>
            <h3 className="text-base font-extrabold text-zinc-100">Ranking & Point Formula</h3>
          </div>

          <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
            <p>
              In Ludo League, players score points for each match according to their finishing rank:
            </p>
            <div className="grid grid-cols-2 gap-2 text-center font-bold">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">1st Place: 4 pts</div>
              <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">2nd Place: 3 pts</div>
              <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">3rd Place: 2 pts</div>
              <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300">4th Place: 1 pt</div>
            </div>
            <p className="text-[11px] text-zinc-400 pt-1">
              Standings are ordered primarily by Average Score (Total Points / Matches Played), with total wins as tie-breaker.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
