/**
 * Bionic Systems — Interactive Cinema Experience & Enterprise Resolution Explorer
 */
(() => {
  "use strict";

  const TOTAL_DURATION = 42.0;

  // =========================================================================
  // 1. CINEMA FILM CONTROLLER (Playback, Scrubber, Audio, Chapters, Captions)
  // =========================================================================
  const video = document.getElementById("bionic-film-video");
  const viewport = document.getElementById("video-viewport");
  const playOverlay = document.getElementById("video-play-overlay");
  const floatingUnmute = document.getElementById("floating-unmute-btn");
  const btnPlayPause = document.getElementById("btn-play-pause");
  const btnReplay = document.getElementById("btn-replay");
  const btnMute = document.getElementById("btn-mute-toggle");
  const btnCaptions = document.getElementById("btn-captions-toggle");
  const timeReadout = document.getElementById("time-readout");
  const timelineTrack = document.getElementById("timeline-track");
  const timelineFill = document.getElementById("timeline-fill");
  const captionBar = document.getElementById("live-caption-bar");
  const captionActTag = document.getElementById("caption-act-tag");
  const captionText = document.getElementById("caption-text");
  const chapterBtns = Array.from(document.querySelectorAll(".chapter-btn"));
  const seekTriggers = Array.from(document.querySelectorAll("[data-seek]"));

  // Synchronized silent-viewing narrative cues (ensures full comprehension without audio!)
  const NARRATIVE_CUES = [
    {
      start: 0.0,
      end: 6.1,
      act: "ACT I · CONTINUOUS OPERATIONS",
      text: "High-velocity enterprise operations running smoothly—until an unexpected disruption strikes at full speed.",
    },
    {
      start: 6.1,
      end: 11.4,
      act: "ACT I · INCIDENT DETECTED",
      text: "Front-left mechanical failure interrupts performance—mirroring a critical IT incident or customer service disruption.",
    },
    {
      start: 11.4,
      end: 15.5,
      act: "ACT II · DIAGNOSIS (UPPER VS. LOWER)",
      text: "Upper: 8 skilled pit specialists stage manual triage. Lower: Bionic Systems autonomous AI isolates root cause instantaneously.",
    },
    {
      start: 15.5,
      end: 21.5,
      act: "ACT II · REMEDIATION & GOVERNANCE",
      text: "Upper: Manual removal and physical handoffs. Lower: Authorized autonomous remediation executes under active human oversight.",
    },
    {
      start: 21.5,
      end: 25.5,
      act: "ACT II · VERIFIED RECOVERY",
      text: "Lower: Bionic Systems validates technical recovery and returns to service while conventional support is still completing checks.",
    },
    {
      start: 25.5,
      end: 31.5,
      act: "ACT II · OPERATIONAL CONTINUITY GAP",
      text: "Bionic Systems is already back at full operating speed while the traditional support crew completes manual release.",
    },
    {
      start: 31.5,
      end: 38.0,
      act: "ACT III · VERIFIED PAYOFF",
      text: "Same turn, verified recovery: the vehicle clears Turn 4 cleanly—confirming validated return to business continuity.",
    },
    {
      start: 38.0,
      end: 45.0,
      act: "BIONIC SYSTEMS · UNIFIED PLATFORM",
      text: "Autonomous technical support and conversational voice customer service—diagnosing issues, executing approved actions, and verifying outcomes.",
    },
  ];

  function fmtTime(sec) {
    const s = Math.max(0, Math.floor(sec || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  function syncPlayerUI() {
    if (!video) return;
    const dur = Number.isFinite(video.duration) && video.duration > 1 ? video.duration : TOTAL_DURATION;
    const cur = video.currentTime || 0;
    const pct = Math.min(100, Math.max(0, (cur / dur) * 100));

    timelineFill.style.width = `${pct}%`;
    timelineTrack.setAttribute("aria-valuenow", String(Math.round(cur)));
    timeReadout.textContent = `${fmtTime(cur)} / ${fmtTime(dur)}`;

    const paused = video.paused;
    btnPlayPause.textContent = paused ? "Play" : "Pause";
    playOverlay.classList.toggle("is-hidden", !paused);
    const pausedMid = paused && cur >= 0.4;
    playOverlay.classList.toggle("is-paused-mid", pausedMid);
    const overlayLabel = playOverlay.querySelector(".play-overlay-label");
    if (overlayLabel) {
      if (video.ended || cur >= dur - 0.5) overlayLabel.textContent = "Replay Film";
      else if (pausedMid) overlayLabel.textContent = "Resume Film";
      else overlayLabel.textContent = "Play 42-Second Film";
    }

    const muted = video.muted;
    btnMute.textContent = muted ? "Sound: Off" : "Sound: On";
    btnMute.classList.toggle("is-active", !muted);
    floatingUnmute.classList.toggle("is-unmuted", !muted || paused);

    // Active chapter highlight
    chapterBtns.forEach((btn) => {
      const target = parseFloat(btn.dataset.seek);
      let active = false;
      if (target < 10) active = cur < 11.4;
      else if (target < 30) active = cur >= 11.4 && cur < 31.4;
      else active = cur >= 31.4;
      btn.classList.toggle("is-current", active);
    });

    // Live narrative caption cue
    const cue = NARRATIVE_CUES.find((c) => cur >= c.start && cur < c.end) || NARRATIVE_CUES[NARRATIVE_CUES.length - 1];
    if (cue) {
      captionActTag.textContent = cue.act;
      captionText.textContent = cue.text;
    }
  }

  const videoStatusPill = document.getElementById("video-status-pill");
  const FALLBACK_SOURCES = [
    { src: "assets/bionic-film.webm", type: 'video/webm; codecs="vp9, opus"' },
    { src: "assets/bionic-film.mp4", type: 'video/mp4; codecs="avc1.4D401F, mp4a.40.2"' },
  ];
  let fallbackIndex = 0;
  let playPending = false;
  let pendingSeek = null;

  function setVideoStatus(msg) {
    if (!videoStatusPill) return;
    if (msg) {
      videoStatusPill.textContent = msg;
      videoStatusPill.classList.add("is-visible");
    } else {
      videoStatusPill.classList.remove("is-visible");
    }
  }

  function applyPendingSeek() {
    if (!video || pendingSeek === null) return;
    if (video.readyState >= 1) {
      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : TOTAL_DURATION;
      video.currentTime = Math.min(dur, Math.max(0, pendingSeek));
      pendingSeek = null;
    }
  }

  function tryFallbackSource(resumePlayback = true) {
    if (!video || fallbackIndex >= FALLBACK_SOURCES.length) {
      setVideoStatus("Video unavailable · Click to retry");
      return;
    }
    const next = FALLBACK_SOURCES[fallbackIndex++];
    // Avoid re-loading the exact same URL that just failed
    if (video.currentSrc && video.currentSrc.endsWith(next.src) && fallbackIndex < FALLBACK_SOURCES.length) {
      return tryFallbackSource(resumePlayback);
    }
    setVideoStatus("Switching video format...");
    video.querySelectorAll("source").forEach((s) => s.remove());
    video.src = next.src;
    video.load();
    if (resumePlayback) {
      playFilm({ unmute: !video.muted });
    }
  }

  async function playFilm({ unmute = false, seekTo = null } = {}) {
    if (!video) return;
    if (seekTo !== null) {
      pendingSeek = seekTo;
      if (video.readyState >= 1) {
        applyPendingSeek();
      }
    }
    if (unmute) {
      video.muted = false;
    }
    if (video.error) {
      video.load();
    }
    playPending = true;
    setVideoStatus(video.readyState < 3 ? "Loading film..." : "");
    try {
      await video.play();
      setVideoStatus("");
    } catch (err) {
      // Fallback to muted playback if browser autoplay policy blocks unmuted playback
      if (!video.muted && (err?.name === "NotAllowedError" || err?.name === "AbortError")) {
        video.muted = true;
        try {
          await video.play();
          setVideoStatus("");
        } catch (err2) {
          if (err2?.name === "NotSupportedError") {
            tryFallbackSource(true);
          } else {
            setVideoStatus("Click to play film");
          }
        }
      } else if (err?.name === "NotSupportedError") {
        tryFallbackSource(true);
      } else if (err?.name !== "AbortError") {
        setVideoStatus("Click to retry playback");
      }
    } finally {
      playPending = false;
    }
    syncPlayerUI();
  }

  function togglePlayPause() {
    if (!video) return;
    if (playPending) return;
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0;
      playFilm();
    } else {
      video.pause();
      setVideoStatus("");
      syncPlayerUI();
    }
  }

  if (viewport) {
    viewport.addEventListener("click", (e) => {
      if (e.target.closest("#floating-unmute-btn")) return;
      togglePlayPause();
    });
  }

  if (btnPlayPause) btnPlayPause.addEventListener("click", togglePlayPause);

  if (btnReplay) {
    btnReplay.addEventListener("click", () => {
      playFilm({ seekTo: 0 });
    });
  }

  if (btnMute) {
    btnMute.addEventListener("click", () => {
      video.muted = !video.muted;
      syncPlayerUI();
    });
  }

  if (floatingUnmute) {
    floatingUnmute.addEventListener("click", (e) => {
      e.stopPropagation();
      video.muted = false;
      if (video.paused) playFilm({ unmute: true });
      else syncPlayerUI();
    });
  }

  if (btnCaptions) {
    btnCaptions.addEventListener("click", () => {
      const collapsed = captionBar.classList.toggle("is-collapsed");
      btnCaptions.textContent = collapsed ? "Captions: Off" : "Captions: On";
      btnCaptions.classList.toggle("is-active", !collapsed);
    });
  }

  // Timeline scrubbing (pointer + keyboard)
  if (timelineTrack) {
    const scrub = (clientX) => {
      const rect = timelineTrack.getBoundingClientRect();
      const frac = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const dur = Number.isFinite(video.duration) && video.duration > 1 ? video.duration : TOTAL_DURATION;
      const target = frac * dur;
      if (video.readyState >= 1) {
        video.currentTime = target;
      } else {
        pendingSeek = target;
      }
      syncPlayerUI();
    };
    let dragging = false;
    timelineTrack.addEventListener("pointerdown", (e) => {
      dragging = true;
      timelineTrack.setPointerCapture(e.pointerId);
      scrub(e.clientX);
    });
    timelineTrack.addEventListener("pointermove", (e) => {
      if (dragging) scrub(e.clientX);
    });
    timelineTrack.addEventListener("pointerup", () => {
      dragging = false;
    });
    timelineTrack.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") {
        video.currentTime = Math.min(TOTAL_DURATION, (video.currentTime || 0) + 3);
        syncPlayerUI();
      } else if (e.key === "ArrowLeft") {
        video.currentTime = Math.max(0, (video.currentTime || 0) - 3);
        syncPlayerUI();
      }
    });
  }

  // Chapter buttons & storyboard jump cards
  seekTriggers.forEach((el) => {
    el.addEventListener("click", () => {
      const targetSec = parseFloat(el.dataset.seek || "0");
      const filmSection = document.getElementById("film");
      if (el.classList.contains("bridge-card") && filmSection) {
        filmSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      playFilm({ seekTo: targetSec });
    });
  });

  // Hero "Watch the 42-Second Film" & Closing "Replay Film" buttons
  const heroWatchBtn = document.getElementById("hero-watch-film-btn");
  if (heroWatchBtn) {
    heroWatchBtn.addEventListener("click", () => {
      document.getElementById("film")?.scrollIntoView({ behavior: "smooth", block: "start" });
      playFilm({ unmute: true, seekTo: 0 });
    });
  }

  const closingReplayBtn = document.getElementById("closing-replay-btn");
  if (closingReplayBtn) {
    closingReplayBtn.addEventListener("click", () => {
      document.getElementById("film")?.scrollIntoView({ behavior: "smooth", block: "start" });
      playFilm({ unmute: true, seekTo: 0 });
    });
  }

  if (video) {
    video.addEventListener("timeupdate", syncPlayerUI);
    video.addEventListener("play", syncPlayerUI);
    video.addEventListener("playing", () => {
      setVideoStatus("");
      syncPlayerUI();
    });
    video.addEventListener("canplay", () => {
      applyPendingSeek();
      setVideoStatus("");
      syncPlayerUI();
    });
    video.addEventListener("waiting", () => {
      if (!video.paused) setVideoStatus("Buffering...");
    });
    video.addEventListener("pause", syncPlayerUI);
    video.addEventListener("ended", () => {
      setVideoStatus("");
      syncPlayerUI();
    });
    video.addEventListener("loadedmetadata", () => {
      applyPendingSeek();
      syncPlayerUI();
    });
    video.addEventListener("error", () => {
      tryFallbackSource(!video.paused || playPending);
    });

    // If the final <source> fails to load, trigger explicit format failover
    const sources = Array.from(video.querySelectorAll("source"));
    if (sources.length > 0) {
      sources[sources.length - 1].addEventListener("error", () => {
        tryFallbackSource(!video.paused || playPending);
      });
    }

    // Auto-start cleanly muted when scrolled into view (once), respecting user intent
    let autoStarted = false;
    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !autoStarted && video.paused && video.currentTime < 1) {
              autoStarted = true;
              video.muted = true;
              playFilm();
            }
          });
        },
        { threshold: 0.45 }
      );
      obs.observe(video);
    }
  }

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (document.getElementById("briefing-modal")?.classList.contains("is-open")) return;
    if (e.key === "m" || e.key === "M") {
      if (video) {
        video.muted = !video.muted;
        syncPlayerUI();
      }
    } else if (e.key === "r" || e.key === "R") {
      playFilm({ seekTo: 0 });
    }
  });

  syncPlayerUI();

  // =========================================================================
  // 2. INTERACTIVE AUTONOMOUS RESOLUTION WALKTHROUGH
  //    Balanced 3 Technical Support (~65%) + 2 Voice Customer Service (~35%)
  // =========================================================================
  const SCENARIOS = {
    vpn: {
      domain: "tech",
      channel: "CHANNEL · TECHNICAL SERVICE DESK & EXECUTIVE VOICE LINE",
      title: "VPN & MFA Lockout During Executive Travel",
      quote:
        "“My corporate VPN keeps dropping with an authentication error at the airport and I have a board review in fifteen minutes.”",
      traditional:
        "Queued for Level-1 intake, handed off to IAM engineer to inspect travel flags, manual MFA token reset, and delayed callback confirmation.",
      bionic:
        "Correlates Okta impossible-travel lock with expired VPN client cert, applies policy-approved remediation, and verifies active tunnel handshake.",
      traceId: "EXECUTION TRACE · TECHNICAL AGENT #BS-IT-104",
      policy: "Policy: IAM-TRAVEL-204 · Pre-Authorized With Identity Check",
      audit: "Audit Trail: Immutable · Okta + Cisco AnyConnect + ServiceNow",
      steps: [
        {
          phase: "01 Diagnose",
          title: "Correlated Okta + Endpoint Telemetry",
          detail:
            "Isolated root cause: automated geo-velocity lock in Okta combined with stale device VPN certificate on managed laptop.",
        },
        {
          phase: "02 Authorize",
          title: "Verified Executive Identity & Travel Policy",
          detail:
            "Confirmed approved corporate travel itinerary and step-up biometric check against IAM security guardrail IAM-TRAVEL-204.",
        },
        {
          phase: "03 Remediate",
          title: "Cleared Lock & Re-Issued VPN Certificate",
          detail:
            "Executed authorized Okta session unlock and pushed renewed PKI certificate silently via Intune MDM API.",
        },
        {
          phase: "04 Verified",
          title: "Active Encrypted Tunnel Confirmed",
          detail:
            "Validated live VPN gateway handshake, zero packet loss, and closed ServiceNow incident with full audit evidence.",
          verified: true,
        },
      ],
    },
    erp: {
      domain: "tech",
      channel: "CHANNEL · ENTERPRISE IT SERVICE PORTAL",
      title: "ERP Production Permission & Role Conflict",
      quote:
        "“Quarter-end close starts in an hour and my finance team is receiving an unauthorized-role error posting journal entries in SAP.”",
      traditional:
        "Ticket routed across help desk, SAP basis, and identity governance—requiring manual role diffing across three separate teams.",
      bionic:
        "Audits RBAC group drift automatically, reconciles missing pre-approved entitlement via IAM, and verifies live write access.",
      traceId: "EXECUTION TRACE · TECHNICAL AGENT #BS-IT-219",
      policy: "Policy: SOX-RBAC-088 · Segregation-of-Duties Validated",
      audit: "Audit Trail: Immutable · SAP + Entra ID + Jira Service Management",
      steps: [
        {
          phase: "01 Diagnose",
          title: "Detected Overnight Identity Sync Drift",
          detail:
            "Identified missing SAP posting sub-role dropped during scheduled directory group synchronization affecting 14 finance users.",
        },
        {
          phase: "02 Authorize",
          title: "Validated SOX Segregation-of-Duties Rules",
          detail:
            "Verified restoration matches approved baseline role matrix with zero privileged escalation conflict under policy SOX-RBAC-088.",
        },
        {
          phase: "03 Remediate",
          title: "Restored Directory Mapping & Re-Synced Tokens",
          detail:
            "Re-applied group entitlement in Microsoft Entra ID and triggered immediate SCIM provisioning to SAP production.",
        },
        {
          phase: "04 Verified",
          title: "Dry-Run Ledger Permission Probe Passed",
          detail:
            "Confirmed valid posting authorization across all 14 affected accounts and notified finance operations lead automatically.",
          verified: true,
        },
      ],
    },
    endpoint: {
      domain: "tech",
      channel: "CHANNEL · PROACTIVE TELEMETRY & SERVICE DESK",
      title: "Endpoint Security Agent Crash & Wi-Fi Cert Expiry",
      quote:
        "“Wi-Fi dropped across multiple engineering workstations right after the morning security update.”",
      traditional:
        "Employees submit duplicate tickets; technicians manually remote into devices one-by-one to restart daemons and reinstall certs.",
      bionic:
        "Detects common telemetry signature, executes signed remediation script across affected fleet, and confirms network health.",
      traceId: "EXECUTION TRACE · TECHNICAL AGENT #BS-IT-308",
      policy: "Policy: MDM-REMEDIATE-112 · Signed Runbook Authorized",
      audit: "Audit Trail: Immutable · Jamf + CrowdStrike + Internal PKI",
      steps: [
        {
          phase: "01 Diagnose",
          title: "Clustered Fleet-Wide Telemetry Fault",
          detail:
            "Matched failing 802.1X handshake errors to an expired intermediate Wi-Fi profile pushed alongside a routine OS patch.",
        },
        {
          phase: "02 Authorize",
          title: "Approved Scoped Fleet Remediation",
          detail:
            "Validated remediation runbook checksum and scoped rollout strictly to the 38 affected engineering endpoints.",
        },
        {
          phase: "03 Remediate",
          title: "Renewed 802.1X Profile & Restarted Network Agent",
          detail:
            "Dispatched signed PKI renewal through Jamf MDM and cleanly restarted the stalled security telemetry daemon.",
        },
        {
          phase: "04 Verified",
          title: "100% Affected Endpoints Reconnected & Healthy",
          detail:
            "Confirmed active 802.1X authentication and security heartbeat on all 38 devices; escalated 0 residual failures.",
          verified: true,
        },
      ],
    },
    refund: {
      domain: "voice",
      channel: "CHANNEL · CONVERSATIONAL AI VOICE AGENT (INBOUND PHONE)",
      title: "Damaged Shipment Return & Instant Refund",
      quote:
        "“Hi, I just received order #88412 and the outer display housing arrived cracked—I’d like to send it back for a refund.”",
      traditional:
        "Caller waits in phone queue, repeats order number across transfers, waits 24–48 hours for manual RMA approval and separate finance refund.",
      bionic:
        "Conversational voice agent authenticates caller naturally, validates return window, issues RMA label and Stripe refund, and confirms receipt.",
      traceId: "EXECUTION TRACE · VOICE AGENT #BS-CS-412",
      policy: "Policy: CS-RETURN-30D · Auto-Authorized Under Threshold",
      audit: "Audit Trail: Immutable · Voice Transcript + Shopify/ERP + Stripe",
      steps: [
        {
          phase: "01 Understand",
          title: "Natural Voice Intake & Caller Verification",
          detail:
            "Authenticated customer seamlessly in conversation and pulled live order #88412 delivery confirmation from ERP.",
        },
        {
          phase: "02 Authorize",
          title: "Validated 30-Day Return & Refund Policy",
          detail:
            "Confirmed item delivered 2 days ago, damage-return eligible, and refund amount falls within autonomous policy CS-RETURN-30D.",
        },
        {
          phase: "03 Execute",
          title: "Generated RMA Label & Triggered Refund",
          detail:
            "Created prepaid return shipment in fulfillment ERP, issued full payment reversal via Stripe API, and updated Zendesk/CRM.",
        },
        {
          phase: "04 Verified",
          title: "Settlement & Customer Confirmation Validated",
          detail:
            "Verified Stripe refund reference ID, delivered return label by SMS/email, and confirmed closure verbally with the customer.",
          verified: true,
        },
      ],
    },
    billing: {
      domain: "voice",
      channel: "CHANNEL · CONVERSATIONAL AI VOICE AGENT (INBOUND PHONE)",
      title: "Duplicate Invoice Inquiry & Billing Credit",
      quote:
        "“I’m looking at our monthly statement and we appear to have been charged twice after upgrading our team plan last week.”",
      traditional:
        "Frontline call-center agent opens a billing escalation ticket; customer waits days for finance operations to reconcile and respond.",
      bionic:
        "Voice agent inspects live NetSuite & Stripe ledgers during the call, confirms proration overlap, applies authorized credit, and verifies balance.",
      traceId: "EXECUTION TRACE · VOICE AGENT #BS-CS-507",
      policy: "Policy: BILLING-ADJ-019 · Verified Duplicate Reversal",
      audit: "Audit Trail: Immutable · Voice Transcript + Salesforce + NetSuite",
      steps: [
        {
          phase: "01 Understand",
          title: "Queried Live Billing Ledger Mid-Conversation",
          detail:
            "Authenticated account owner via voice verification and inspected invoice history across NetSuite and payment gateway.",
        },
        {
          phase: "02 Authorize",
          title: "Confirmed Duplicate Proration Within Policy",
          detail:
            "Detected overlapping renewal charge generated during mid-cycle plan upgrade; authorized automatic credit under BILLING-ADJ-019.",
        },
        {
          phase: "03 Execute",
          title: "Issued Credit Memo & Updated Account Record",
          detail:
            "Posted reversing credit memo in NetSuite, initiated card credit, and logged full breakdown on the Salesforce account.",
        },
        {
          phase: "04 Verified",
          title: "Reconciled Zero-Discrepancy Statement Confirmed",
          detail:
            "Verified updated account balance, sent corrected PDF invoice automatically, and confirmed caller satisfaction before ending call.",
          verified: true,
        },
      ],
    },
  };

  const tabBtns = Array.from(document.querySelectorAll(".scenario-tab"));
  const scChannel = document.getElementById("sc-channel");
  const scTitle = document.getElementById("sc-title");
  const scQuote = document.getElementById("sc-quote");
  const scTraditional = document.getElementById("sc-traditional");
  const scBionic = document.getElementById("sc-bionic");
  const scTraceId = document.getElementById("sc-trace-id");
  const scTraceSteps = document.getElementById("sc-trace-steps");
  const scPolicy = document.getElementById("sc-policy");
  const scAudit = document.getElementById("sc-audit");

  let revealTimers = [];

  function renderScenario(key) {
    const sc = SCENARIOS[key];
    if (!sc || !scTraceSteps) return;

    revealTimers.forEach((id) => clearTimeout(id));
    revealTimers = [];

    tabBtns.forEach((b) => {
      const active = b.dataset.scenario === key;
      b.classList.toggle("is-active", active);
      b.setAttribute("aria-selected", String(active));
    });

    scChannel.textContent = sc.channel;
    scTitle.textContent = sc.title;
    scQuote.textContent = sc.quote;
    scQuote.classList.toggle("scenario-quote--voice", sc.domain === "voice");
    scTraditional.textContent = sc.traditional;
    scBionic.textContent = sc.bionic;
    scTraceId.textContent = sc.traceId;
    scPolicy.textContent = sc.policy;
    scAudit.textContent = sc.audit;

    scTraceSteps.innerHTML = "";
    sc.steps.forEach((st, idx) => {
      const row = document.createElement("div");
      row.className = "trace-step" + (st.verified ? " is-verified" : "");
      row.innerHTML = `
        <div class="trace-phase">${st.phase}</div>
        <div class="trace-detail">
          <strong>${st.title}</strong>
          <span>${st.detail}</span>
        </div>
      `;
      scTraceSteps.appendChild(row);
      const tid = setTimeout(() => row.classList.add("is-revealed"), 60 + idx * 120);
      revealTimers.push(tid);
    });
  }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => renderScenario(btn.dataset.scenario));
  });
  renderScenario("vpn");

  // =========================================================================
  // 3. MOBILE MENU & EXECUTIVE ARCHITECTURE BRIEFING MODAL
  // =========================================================================
  const menuToggle = document.getElementById("mobile-menu-toggle");
  const primaryNav = document.getElementById("primary-nav");
  if (menuToggle && primaryNav) {
    menuToggle.addEventListener("click", () => {
      const open = primaryNav.classList.toggle("is-mobile-open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });
    primaryNav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => {
        primaryNav.classList.remove("is-mobile-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const modal = document.getElementById("briefing-modal");
  const openModalBtns = Array.from(document.querySelectorAll("[data-open-modal]"));
  const closeModalBtn = document.getElementById("modal-close-btn");
  const doneModalBtn = document.getElementById("modal-done-btn");
  const briefingForm = document.getElementById("briefing-form");
  const briefingSuccess = document.getElementById("briefing-success");

  function openModal() {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.getElementById("bf-name")?.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  }

  openModalBtns.forEach((b) => b.addEventListener("click", openModal));
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (doneModalBtn) doneModalBtn.addEventListener("click", closeModal);
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  if (briefingForm && briefingSuccess) {
    briefingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      briefingForm.style.display = "none";
      briefingSuccess.classList.add("is-visible");
    });
  }
})();
