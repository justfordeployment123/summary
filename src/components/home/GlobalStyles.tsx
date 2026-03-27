"use client";

export function GlobalStyles() {
    return (
        <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700;800;900&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: 'Raleway', sans-serif;
        background: #f8fafc;
        color: #0F233F;
        overflow-x: hidden;
      }

      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      @keyframes pulse {
        0%,100% { opacity:1; } 50% { opacity:.5; }
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes gradientShift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes checkPop {
        0%   { transform: scale(0); opacity:0; }
        70%  { transform: scale(1.2); }
        100% { transform: scale(1); opacity:1; }
      }
      @keyframes borderGlow {
        0%,100% { box-shadow: 0 0 0 0 rgba(84,214,212,0); }
        50%      { box-shadow: 0 0 0 6px rgba(84,214,212,0.18); }
      }

      .anim-fadeUp   { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) both; }
      .anim-fadeUp-1 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.08s both; }
      .anim-fadeUp-2 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.16s both; }
      .anim-fadeUp-3 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.24s both; }
      .anim-fadeUp-4 { animation: fadeUp 0.55s cubic-bezier(.22,1,.36,1) 0.32s both; }
      .anim-fadeIn   { animation: fadeIn 0.4s ease both; }

      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #f1f5f9; }
      ::-webkit-scrollbar-thumb { background: #54D6D4; border-radius: 3px; }

      select, input[type="text"], input[type="email"] {
        font-family: 'Raleway', sans-serif;
        width: 100%;
        padding: 14px 16px;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        font-size: 0.9rem;
        font-weight: 500;
        color: #0F233F;
        background: #fff;
        transition: border-color 0.2s, box-shadow 0.2s;
        outline: none;
        appearance: none;
      }
      select:focus, input[type="text"]:focus, input[type="email"]:focus {
        border-color: #54D6D4;
        box-shadow: 0 0 0 3px rgba(84,214,212,0.15);
      }
      input[type="checkbox"] {
        width: 18px; height: 18px;
        border-radius: 5px;
        border: 1.5px solid #cbd5e1;
        accent-color: #12A1A6;
        cursor: pointer;
        flex-shrink: 0;
      }

      .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
      .hover-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(15,35,63,0.1); }

      .hero-mesh {
        background: linear-gradient(135deg, #0F233F 0%, #1a3a5c 40%, #0e4f52 70%, #12A1A6 100%);
        background-size: 300% 300%;
        animation: gradientShift 12s ease infinite;
        position: relative;
        overflow: hidden;
      }
      .hero-mesh::before {
        content: '';
        position: absolute; inset: 0;
        background: radial-gradient(ellipse 60% 80% at 80% 20%, rgba(84,214,212,0.15) 0%, transparent 60%),
                    radial-gradient(ellipse 40% 60% at 10% 80%, rgba(18,161,166,0.12) 0%, transparent 50%);
        pointer-events: none;
      }
      .hero-mesh::after {
        content: '';
        position: absolute; inset: 0;
        background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px);
        background-size: 28px 28px;
        pointer-events: none;
      }

      .glass-card {
        background: rgba(255,255,255,0.92);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255,255,255,0.6);
        border-radius: 20px;
        box-shadow: 0 4px 32px rgba(15,35,63,0.08), 0 1px 0 rgba(255,255,255,0.8) inset;
      }

      .btn-primary {
        display: flex; align-items: center; justify-content: center; gap: 8px;
        width: 100%;
        padding: 16px 24px;
        background: linear-gradient(135deg, #12A1A6, #54D6D4);
        color: #fff;
        font-family: 'Raleway', sans-serif;
        font-weight: 800;
        font-size: 1rem;
        border: none; border-radius: 14px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(.22,1,.36,1);
        box-shadow: 0 4px 16px rgba(18,161,166,0.35);
        position: relative; overflow: hidden;
        letter-spacing: 0.01em;
      }
      .btn-primary::before {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(135deg, #4FCCD2, #54D6D4);
        opacity: 0; transition: opacity 0.25s;
      }
      .btn-primary:hover::before { opacity: 0.3; }
      .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(18,161,166,0.45); }
      .btn-primary:active { transform: translateY(0); }
      .btn-primary:disabled {
        background: #e2e8f0; color: #94a3b8;
        box-shadow: none; cursor: not-allowed; transform: none;
      }
      .btn-primary:disabled::before { display: none; }
      .btn-primary > * { position: relative; z-index: 1; }

      .btn-ghost {
        display: flex; align-items: center; justify-content: center; gap: 6px;
        padding: 10px 20px;
        background: transparent;
        border: 1.5px solid #e2e8f0;
        color: #64748b;
        font-family: 'Raleway', sans-serif;
        font-weight: 600; font-size: 0.85rem;
        border-radius: 10px; cursor: pointer;
        transition: all 0.2s;
      }
      .btn-ghost:hover { border-color: #54D6D4; color: #12A1A6; background: #f0fdfd; }

      .section-divider {
        width: 48px; height: 3px;
        background: linear-gradient(90deg, #54D6D4, #12A1A6);
        border-radius: 2px;
        margin: 0 auto 1rem;
      }

      .feature-chip {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 12px;
        background: rgba(84,214,212,0.12);
        color: #0e6e71;
        border-radius: 100px;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .progress-track {
        width: 100%; height: 4px;
        background: #e2e8f0; border-radius: 99px;
        overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #12A1A6, #54D6D4);
        border-radius: 99px;
        transition: width 0.6s cubic-bezier(.22,1,.36,1);
      }

      .status-info {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 13px 16px;
        background: linear-gradient(135deg, #f0fdfd, #e6faf9);
        border: 1px solid #b2eeec;
        border-radius: 12px;
        font-size: 0.875rem; font-weight: 600; color: #0e6e71;
      }
      .status-error {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 13px 16px;
        background: #fff1f2;
        border: 1px solid #fecdd3;
        border-radius: 12px;
        font-size: 0.875rem; font-weight: 600; color: #be123c;
      }

      .dropzone {
        border: 2px dashed #e2e8f0;
        border-radius: 16px;
        padding: 40px 24px;
        text-align: center;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(.22,1,.36,1);
        position: relative;
        background: #fafbfc;
      }
      .dropzone:hover, .dropzone.dragging {
        border-color: #54D6D4;
        background: #f0fdfd;
        transform: scale(1.01);
      }
      .dropzone.has-file {
        border-color: #54D6D4;
        background: linear-gradient(135deg, #f0fdfd, #e6faf9);
        animation: borderGlow 2s ease infinite;
      }
      .dropzone input[type="file"] {
        position: absolute; inset: 0; width: 100%; height: 100%;
        opacity: 0; cursor: pointer; border: none;
      }

      .upsell-card {
        display: flex; align-items: flex-start; gap: 14px;
        padding: 16px;
        border: 1.5px solid #e2e8f0;
        border-radius: 14px;
        background: #fafbfc;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(.22,1,.36,1);
        text-align: left; width: 100%;
      }
      .upsell-card:hover { border-color: #54D6D4; background: #f0fdfd; }
      .upsell-card.selected {
        border-color: #12A1A6;
        background: linear-gradient(135deg, #f0fdfd, #e6faf9);
        box-shadow: 0 0 0 3px rgba(84,214,212,0.15);
      }

      .step-pill {
        display: flex; align-items: center; gap: 6px;
        padding: 6px 14px;
        border-radius: 100px;
        font-size: 0.78rem; font-weight: 700;
        letter-spacing: 0.02em;
        transition: all 0.3s;
      }
      .step-pill.active { background: linear-gradient(135deg, #12A1A6, #54D6D4); color: #fff; }
      .step-pill.done { background: rgba(84,214,212,0.15); color: #0e6e71; }
      .step-pill.pending { background: #f1f5f9; color: #94a3b8; }

      .check-item {
        display: flex; align-items: flex-start; gap: 10px;
        font-size: 0.875rem; color: #475569; line-height: 1.6;
      }
      .check-icon {
        width: 20px; height: 20px; flex-shrink: 0;
        border-radius: 50%;
        background: linear-gradient(135deg, #12A1A6, #54D6D4);
        display: flex; align-items: center; justify-content: center;
        margin-top: 1px;
      }

      .stat-card {
        text-align: center; padding: 28px 20px;
        border-radius: 20px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.1);
        backdrop-filter: blur(10px);
      }

      .dl-btn {
        display: flex; align-items: center; gap: 8px;
        padding: 12px 20px;
        border: 1.5px solid #e2e8f0;
        border-radius: 12px;
        background: #fff;
        color: #475569;
        font-family: 'Raleway', sans-serif;
        font-size: 0.875rem; font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
      }
      .dl-btn:hover { border-color: #54D6D4; color: #12A1A6; background: #f0fdfd; transform: translateY(-1px); }

      .spin { animation: spin 0.8s linear infinite; }
      .pulse { animation: pulse 1.5s ease infinite; }

      .urgency-badge {
        display: inline-flex; align-items: center; gap: 6px;
        padding: 5px 13px;
        border-radius: 100px;
        font-size: 0.75rem; font-weight: 700;
        border: 1px solid;
        letter-spacing: 0.03em;
      }
      .urgency-dot {
        width: 6px; height: 6px; border-radius: 50%;
      }

      @media (max-width: 640px) {
        .hero-title { font-size: 2rem !important; }
        .two-col { flex-direction: column !important; }
        .stat-row { flex-direction: column !important; gap: 12px !important; }
      }

      .nav-link {
        color: rgba(255,255,255,0.75);
        font-weight: 600; font-size: 0.875rem;
        text-decoration: none;
        transition: color 0.2s;
        cursor: pointer;
      }
      .nav-link:hover { color: #54D6D4; }

      .trust-row {
        display: flex; align-items: center; justify-content: center;
        flex-wrap: wrap; gap: 20px;
        font-size: 0.78rem; color: #94a3b8; font-weight: 600;
      }
      .trust-item { display: flex; align-items: center; gap: 5px; }

      .how-card {
        display: flex; flex-direction: column; gap: 12px;
        padding: 28px 24px;
        border-radius: 20px;
        background: #fff;
        border: 1px solid #e8f4f4;
        box-shadow: 0 2px 16px rgba(15,35,63,0.05);
        position: relative; overflow: hidden;
        transition: all 0.25s;
      }
      .how-card::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 3px;
        background: linear-gradient(90deg, #12A1A6, #54D6D4);
      }
      .how-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(15,35,63,0.1); }

      .faq-item {
        border: 1px solid #e2e8f0; border-radius: 14px;
        overflow: hidden; background: #fff;
        transition: box-shadow 0.2s;
      }
      .faq-item:hover { box-shadow: 0 4px 16px rgba(15,35,63,0.07); }
      .faq-question {
        padding: 18px 22px;
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        cursor: pointer;
        font-weight: 700; font-size: 0.9rem; color: #0F233F;
        background: none; border: none; width: 100%; text-align: left;
        font-family: 'Raleway', sans-serif;
      }
      .faq-answer {
        padding: 0 22px 18px;
        font-size: 0.875rem; color: #64748b; line-height: 1.7;
      }
    `}</style>
    );
}
