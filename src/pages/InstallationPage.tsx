import React, { useState } from 'react';
import { BookOpen, Terminal, CheckCircle, Server, Database, Globe, Layers, Cpu, ShieldCheck } from 'lucide-react';

export const InstallationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'standard' | 'plesk'>('standard');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800/80 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight">Installation & Hosting Guide</h1>
              <p className="text-xs text-zinc-400">Step-by-step documentation for deploying Ludo League on Linux VPS or Plesk Control Panel</p>
            </div>
          </div>

          {/* Deploy Mode Switcher */}
          <div className="flex items-center p-1 bg-zinc-950 rounded-2xl border border-zinc-800/80 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('standard')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-2 ${
                activeTab === 'standard'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Standard VPS / PM2</span>
            </button>
            <button
              onClick={() => setActiveTab('plesk')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center space-x-2 ${
                activeTab === 'plesk'
                  ? 'bg-amber-500 text-zinc-950 shadow-md'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Plesk Hosting Panel</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'standard' ? (
        /* Standard VPS / Node.js Deployment */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1: Requirements */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/20">
                1
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">Prerequisites</h3>
            </div>

            <ul className="space-y-3 text-xs text-zinc-300">
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Node.js 18.x or 20.x LTS</strong> with npm installed on Linux / macOS / Windows server.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Database Options:</strong> Standalone MySQL 8+ or embedded file-backed SQLite database engine.</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Application Server:</strong> Express backend proxying Vite SPA frontend on Port 3000.</span>
              </li>
            </ul>
          </div>

          {/* Step 2: Commands */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/20">
                2
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">CLI Build & Launch Commands</h3>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 font-mono text-xs text-amber-400 space-y-2">
              <div className="text-zinc-500"># 1. Install dependencies</div>
              <div className="text-zinc-200">npm install</div>
              <div className="text-zinc-500 pt-2"># 2. Compile bundle</div>
              <div className="text-zinc-200">npm run build</div>
              <div className="text-zinc-500 pt-2"># 3. Start production server</div>
              <div className="text-zinc-200">npm run start</div>
            </div>
          </div>

          {/* Step 3: PM2 Process Management */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/20">
                3
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">PM2 Process Daemon</h3>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 font-mono text-xs text-amber-400 space-y-1.5">
              <div className="text-zinc-500"># Install PM2 process manager</div>
              <div className="text-zinc-200">npm install -g pm2</div>
              <div className="text-zinc-500 pt-2"># Daemonize Ludo League service</div>
              <div className="text-zinc-200">pm2 start dist/server.cjs --name "ludo-league"</div>
              <div className="text-zinc-200">pm2 save && pm2 startup</div>
            </div>
          </div>

          {/* Step 4: Admin Initialization */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/20">
                4
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">First-Time Setup</h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              When booting up on a fresh database, the application automatically detects the absence of user accounts and prompts you with a setup wizard to create the initial **Super Administrator** credentials.
            </p>
          </div>
        </div>
      ) : (
        /* Plesk Control Panel Installation */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Step 1: Database Setup in Plesk */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/20">
                1
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">Plesk Database Provisioning</h3>
            </div>

            <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside leading-relaxed">
              <li>Log in to your <strong>Plesk Control Panel</strong>.</li>
              <li>Go to <strong>Databases</strong> &rarr; <strong>Add Database</strong>.</li>
              <li>Set database name to <code>ludo_league</code>, create a database user and strong password.</li>
              <li>Click <strong>Import Dump</strong> (or open phpMyAdmin) and import <code>server/schema.sql</code>.</li>
            </ol>
          </div>

          {/* Step 2: Node.js Extension Setup */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/20">
                2
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">Plesk Node.js Settings</h3>
            </div>

            <div className="space-y-2 text-xs text-zinc-300 leading-relaxed">
              <p>Under <strong>Websites & Domains</strong> &rarr; <strong>Node.js</strong>:</p>
              <ul className="space-y-1 list-disc list-inside text-zinc-400 font-mono">
                <li><strong className="text-zinc-200">Node.js Version:</strong> 18.x, 20.x, or 24.x</li>
                <li><strong className="text-zinc-200">Application Mode:</strong> production</li>
                <li><strong className="text-zinc-200">Application Root:</strong> /ludo.udaanhost.com</li>
                <li><strong className="text-zinc-200">Document Root:</strong> /ludo.udaanhost.com/dist <span className="text-amber-400 font-sans font-bold">(CRITICAL)</span></li>
                <li><strong className="text-zinc-200">Application Startup File:</strong> dist/server.cjs</li>
              </ul>
            </div>
          </div>

          {/* Step 3: Environment Variables in Plesk */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/20">
                3
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">Plesk Environment Variables</h3>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 font-mono text-[11px] text-amber-400 space-y-1">
              <div>JWT_SECRET=your_jwt_secret_key</div>
              <div>MYSQL_HOST=127.0.0.1</div>
              <div>MYSQL_PORT=3306</div>
              <div>MYSQL_USER=your_plesk_db_user</div>
              <div>MYSQL_PASSWORD=your_plesk_db_password</div>
              <div>MYSQL_DATABASE=ludo_league</div>
            </div>
          </div>

          {/* Step 4: Build & Restart */}
          <div className="bg-zinc-900/80 rounded-3xl p-6 border border-zinc-800/80 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-zinc-800/60">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 font-black flex items-center justify-center text-sm border border-amber-500/20">
                4
              </div>
              <h3 className="text-base font-extrabold text-zinc-100">Install, Build & Launch</h3>
            </div>

            <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside leading-relaxed">
              <li>Upload application files into your domain's <code>httpdocs</code> directory.</li>
              <li>In Plesk Node.js panel, click <strong>NPM Install</strong>.</li>
              <li>Click <strong>Run Script</strong> &rarr; <code>build</code> (or run <code>npm run build</code> via SSH).</li>
              <li>Click <strong>Restart App</strong> to activate your application live on your domain.</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

