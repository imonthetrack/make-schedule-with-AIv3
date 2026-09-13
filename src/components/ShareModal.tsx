import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Share2,
  Copy,
  Check,
  QrCode,
  Smartphone,
  Tablet,
  Laptop,
  ExternalLink,
  Award,
  Sparkles,
  ShieldCheck,
  Info,
  Globe,
  Code2,
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'shift') => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  onShowToast,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'link' | 'github' | 'devices' | 'competition'>('link');

  // Determine current public URL without Google Login requirement
  // 'ais-dev' links require Google Cloud authentication (private developer sandbox).
  // 'ais-pre' links are public and can be accessed by anyone without any Google login!
  const getPublicShareUrl = (): string => {
    const defaultPublicUrl = 'https://ais-pre-gzo3icrfvdr4z5a7lc42do-622745663415.asia-southeast1.run.app';
    if (typeof window === 'undefined') return defaultPublicUrl;
    try {
      const url = new URL(window.location.href);
      if (url.hostname.includes('ais-dev-')) {
        // Automatically switch to public ais-pre link so no login is required!
        url.hostname = url.hostname.replace('ais-dev-', 'ais-pre-');
        return url.origin;
      }
      return url.origin;
    } catch {
      return defaultPublicUrl;
    }
  };

  const currentUrl = getPublicShareUrl();

  // Generate QR code when modal opens
  useEffect(() => {
    if (isOpen && currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 260,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [isOpen, currentUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        // Fallback for non-secure context or iframe
        const textArea = document.createElement('textarea');
        textArea.value = currentUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      setCopied(true);
      if (onShowToast) {
        onShowToast('Link proyek berhasil disalin ke clipboard!', 'success');
      }
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('Failed to copy via clipboard API:', err);
    }
  };

  const handleOpenNewTab = () => {
    window.open(currentUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150 overflow-y-auto"
    >
      <div className="bg-white rounded-3xl w-full max-w-lg md:max-w-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-4 sm:p-5 text-white relative shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl text-slate-950 shadow-md">
                <Award className="w-5 h-5 font-black" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 id="share-modal-title" className="text-base sm:text-lg font-bold tracking-tight text-white">
                    Akses & Bagikan Proyek Lomba
                  </h2>
                  <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                    Siap Pakai
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Dapat diakses oleh siapa saja yang memiliki tautan ini
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-800 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setActiveTab('link')}
              className={`flex-1 min-h-[36px] py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'link'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Link & QR</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('github')}
              className={`flex-1 min-h-[36px] py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'github'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-blue-500" />
              <span>GitHub Pages</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('devices')}
              className={`flex-1 min-h-[36px] py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'devices'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Perangkat</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('competition')}
              className={`flex-1 min-h-[36px] py-1.5 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'competition'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Untuk Juri</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* How to activate banner if Page Not Found appears */}
              <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-2xl text-amber-950 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xs font-black shrink-0">!</span>
                  <span>Solusi Mudah Jika Muncul &ldquo;Page Not Found&rdquo; atau Diminta Login:</span>
                </div>
                <p className="text-[11px] text-amber-900/90 leading-relaxed pl-7">
                  Tautan publik <strong>bebas login</strong> ini hanya butuh diaktifkan 1 kali melalui menu Google AI Studio:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 pl-1 sm:pl-7">
                  <div className="bg-white/80 border border-amber-200 p-2 rounded-xl text-left">
                    <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Langkah 1</span>
                    <p className="text-[11px] font-bold text-slate-800 mt-1">Klik Tombol &ldquo;Share&rdquo;</p>
                    <p className="text-[10px] text-slate-500">Ada di pojok kanan paling atas layar Google AI Studio.</p>
                  </div>
                  <div className="bg-white/80 border border-amber-200 p-2 rounded-xl text-left">
                    <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">Langkah 2</span>
                    <p className="text-[11px] font-bold text-slate-800 mt-1">Pilih Akses Publik</p>
                    <p className="text-[10px] text-slate-500">Pilih &ldquo;Anyone with link&rdquo; (Siapa saja yang memiliki tautan).</p>
                  </div>
                  <div className="bg-white/80 border border-amber-200 p-2 rounded-xl text-left">
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">Langkah 3</span>
                    <p className="text-[11px] font-bold text-slate-800 mt-1">Selesai &amp; Siap Dinilai!</p>
                    <p className="text-[10px] text-slate-500">Link di bawah langsung aktif tanpa login Google sama sekali.</p>
                  </div>
                </div>
              </div>

              {/* Direct Link Copy Box */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Tautan Resmi Publik (Tanpa Login Google):</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <Check className="w-3 h-3 stroke-[3]" />
                    <span>Bebas Akun Google</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0 bg-slate-100 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 truncate select-all">
                    {currentUrl}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`min-h-[42px] px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0 shadow-xs ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 active:scale-95 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code Section for Fast Mobile Testing */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs shrink-0 flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code Akses Proyek Lomba"
                      className="w-36 h-36 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                      <QrCode className="w-12 h-12 animate-pulse text-slate-300" />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                    <QrCode className="w-3 h-3" />
                    <span>Scan & Coba di HP Sekarang</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Buka Langsung Lewat Kamera HP
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Arahkan kamera smartphone atau tablet Anda ke QR code ini untuk membuka aplikasi tanpa perlu mengetik alamat URL.
                  </p>
                </div>
              </div>

              {/* Standalone New Tab Button */}
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-[0.99]"
              >
                <span>Buka di Tab Baru / Layar Penuh</span>
                <ExternalLink className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-blue-950">
                <Globe className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong>Kenapa Layar Sempat Putih di GitHub Pages?</strong>
                  <p className="text-blue-900/90 mt-1">
                    Di GitHub Pages (contoh: <code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">imonthetrack.github.io/make-schedule-with-AI/</code>), file website berada di dalam subfolder repositori. Jika path asset disetel root (<code className="bg-blue-100 px-1 py-0.5 rounded text-[11px]">/assets/...</code>), peramban gagal menemukan file JavaScript sehingga layar jadi putih polos.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-950">
                <Check className="w-5 h-5 text-emerald-600 stroke-[2.5] shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <strong>Sudah Diperbaiki Otomatis di Proyek Ini:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-emerald-900/90 text-[11px]">
                    <li>Path asset kini diatur relatif (<code className="bg-emerald-100 px-1 py-0.2 rounded font-mono">base: &apos;./&apos;</code>) agar cocok di subfolder GitHub manapun.</li>
                    <li>Ditambahkan <code className="bg-emerald-100 px-1 py-0.2 rounded font-mono">404.html</code> otomatis agar routing SPA tidak putus.</li>
                    <li>Disediakan alur kerja otomatis <code className="bg-emerald-100 px-1 py-0.2 rounded font-mono">.github/workflows/deploy.yml</code>.</li>
                  </ul>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl p-3.5 space-y-3 bg-white">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  <span>2 Cara Mudah Mengaktifkan di GitHub Anda:</span>
                </h4>

                {/* Option 1 */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black bg-blue-600 text-white px-1.5 py-0.5 rounded">Cara 1 (Rekomendasi)</span>
                    <span className="text-xs font-bold text-slate-800">Pakai GitHub Actions (Otomatis)</span>
                  </div>
                  <ol className="list-decimal pl-4 text-[11px] text-slate-600 space-y-1 leading-relaxed">
                    <li>Push kode terbaru dari proyek ini ke repositori GitHub Anda.</li>
                    <li>Buka repositori Anda di web GitHub, masuk ke menu <strong>Settings</strong> &gt; <strong>Pages</strong>.</li>
                    <li>Pada opsi <strong>Build and deployment &gt; Source</strong>, ubah dari <em>&ldquo;Deploy from a branch&rdquo;</em> menjadi <strong>&ldquo;GitHub Actions&rdquo;</strong>.</li>
                    <li>Selesai! GitHub akan otomatis meng-compile dan website Anda langsung aktif tanpa layar putih.</li>
                  </ol>
                </div>

                {/* Option 2 */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black bg-slate-700 text-white px-1.5 py-0.5 rounded">Cara 2 (Manual)</span>
                    <span className="text-xs font-bold text-slate-800">Upload Folder dist/</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Jika Anda meng-upload manual via branch <code className="bg-slate-200 px-1 py-0.5 rounded">gh-pages</code>, jalankan <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">npm run build</code> lalu upload <strong>seluruh isi di dalam folder dist/</strong> (bukan file mentah .tsx).
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'devices' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-600 mb-2">
                Aplikasi ini telah dirancang dengan sistem layout adaptif yang pas di semua jenis perangkat:
              </div>

              {/* 1. Smartphone / HP */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0 mt-0.5">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Smartphone / HP (Android & iPhone)
                    </h4>
                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded">
                      360px - 600px
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tombol sentuh minimal 44px ramah jempol, navigasi satu tangan, audio alarm hobi, dan dapat dipasang ke layar utama HP (PWA).
                  </p>
                </div>
              </div>

              {/* 2. Tablet / iPad */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-700 rounded-xl shrink-0 mt-0.5">
                  <Tablet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Tablet (iPad, iPad Air, Galaxy Tab)
                    </h4>
                    <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded">
                      600px - 1024px
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Layar lapang dengan grid seimbang, kartu jadwal leluasa, dan responsif baik dalam orientasi portrait maupun landscape.
                  </p>
                </div>
              </div>

              {/* 3. Laptop / Komputer */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0 mt-0.5">
                  <Laptop className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Laptop & Komputer Desktop
                    </h4>
                    <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded">
                      1024px - 1920px+
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Bento 2-kolom dengan panel kontrol lengket di sebelah kiri dan daftar aktivitas serta pelacak progres visual di sebelah kanan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'competition' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 leading-relaxed">
                  <strong>Kesiapan Penilaian Lomba:</strong> Aplikasi ini dirancang agar juri atau penguji dapat langsung mencoba seluruh fitur tanpa hambatan teknis.
                </div>
              </div>

              <div className="space-y-2">
                {[
                  {
                    title: 'Bebas Hambatan Login (Zero Barrier)',
                    desc: 'Tidak memerlukan pendaftaran akun atau password. Langsung buka link dan pakai.',
                  },
                  {
                    title: 'Penyimpanan Lokal Terisolasi (Privacy-Safe)',
                    desc: 'Data jadwal & file MP3 tersimpan di memori browser masing-masing. Aktivitas juri satu tidak akan tercampur dengan juri lain.',
                  },
                  {
                    title: 'Rest Guard AI Anti-Malas',
                    desc: 'Micro-Step Notifier & Evaluasi Dinamis berbasis AI Gemini 3.8 Flash dengan fallback otomatis saat offline.',
                  },
                  {
                    title: 'Audio Engine Presisi & Alarm MP3 Kontinu',
                    desc: 'Sintesis nada Web Audio API dan pemutar audio hobi berputar tanpa henti hingga dimatikan.',
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white border border-slate-200 rounded-xl text-left"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 pl-5">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">Siap diuji di semua peramban (Chrome, Safari, Edge)</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[38px] px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
