import { useCallback, useEffect, useRef, useState } from "react";
import { loadAssets } from "@/game/assets";
import { playSfx, setAmbience, setMuted, unlockAudio } from "@/game/audio";
import { setMusic, setMusicEnabled } from "@/game/music";
import { evaluate, type AchievementEvent, type Mode } from "@/game/achievements";
import { CHAPTER_COUNT, chapterAt, ENDLESS_INDEX, LAST_CHAPTER } from "@/game/chapters";
import { DEATH_COOLDOWN_MS, MAX_DT, MAX_SUBSTEPS, STEP } from "@/game/constants";
import { createWorld, resizeWorld, retryChapter, startChapter, step } from "@/game/engine";
import { SURASA_SHRINK } from "@/game/obstacles/registry";
import { burst, createFx, flapFx, hitFx, updateFx, wipeFx } from "@/game/fx";
import { haptic, hapticsSupported, setHapticsEnabled } from "@/game/haptics";
import { render } from "@/game/render";
import { sceneHeroX } from "@/game/render/scene";
import { dailyKey, dailySeed, mulberry32 } from "@/game/rng";
import { shareResult, type ShareData, type ShareOutcome } from "@/game/share";
import {
  bumpChapter,
  DEFAULT_STATS,
  loadSave,
  resetProgress,
  saveGame,
  updateStats,
  type Stats,
} from "@/game/storage";
import type { Assets, GameEvent, Viewport, World } from "@/game/types";
import { applyViewport, computeViewport, DEFAULT_VIEWPORT } from "@/game/viewport";
import { pick, useLang } from "@/i18n";
import { track } from "@/lib/analytics";
import { platform } from "@/platform";
import { cn } from "@/lib/utils";
import { AchievementToast } from "./game/AchievementToast";
import { Hud } from "./game/Hud";
import {
  ChapterClear,
  ChapterIntro,
  EndlessOver,
  FirstRunHint,
  GameOver,
  PauseMenu,
  StartScreen,
  WinScreen,
} from "./game/Screens";
import { SettingsSheet, type Settings } from "./game/SettingsSheet";

type GameState = "ready" | "intro" | "playing" | "chapterClear" | "over" | "won";

/** Flaps before the first-run hint gives up on its own. */
const HINT_FLAPS = 3;
/** Endless Flight and the Daily unlock once this chapter is reachable (Lankini's gate). */
const MODES_UNLOCK_AT = 4;

export default function HanumanLeap({ initialChapter }: { initialChapter?: number }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const assetsRef = useRef<Assets | null>(null);

  // Mutable per-frame state lives in refs; React state only changes on discrete events.
  const vpRef = useRef<Viewport>(DEFAULT_VIEWPORT);
  const worldRef = useRef<World>(createWorld(DEFAULT_VIEWPORT));
  const pendingFlapRef = useRef(false);
  const stateRef = useRef<GameState>("ready");
  const pausedRef = useRef(false);
  const settingsOpenRef = useRef(false);
  const overAtRef = useRef(0);
  const bestRef = useRef(0);
  const mutedRef = useRef(false);
  const easyRef = useRef(false);
  const langRef = useRef<"hi" | "en">("en");
  const hintedRef = useRef(true);
  const hintFlapsRef = useRef(0);
  /** Passes not yet folded into the persisted stats; flushed on death, clear, and win. */
  const unflushedLeapsRef = useRef(0);
  const fxRef = useRef(createFx());
  const lastScaleRef = useRef(1);
  const readyRef = useRef(false);
  const modeRef = useRef<Mode>("story");
  const achievedRef = useRef<Set<string>>(new Set());
  const statsRef = useRef<Stats>(DEFAULT_STATS);
  const deathsAtChapterStartRef = useRef(0);

  const { lang } = useLang();
  langRef.current = lang;
  const [state, setState] = useState<GameState>("ready");
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [passes, setPasses] = useState(0);
  const [punya, setPunya] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [best, setBest] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [settings, setSettings] = useState<Settings>({
    muted: false,
    music: true,
    haptics: true,
    easy: false,
  });
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [hapticsAvailable, setHapticsAvailable] = useState(false);
  const [mode, setMode] = useState<Mode>("story");
  const [endlessBest, setEndlessBest] = useState(0);
  const [daily, setDaily] = useState({ date: "", best: 0 });
  const [modeNewBest, setModeNewBest] = useState(false);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [toasts, setToasts] = useState<string[]>([]);
  const [hinted, setHinted] = useState(true);
  const [hintFlaps, setHintFlaps] = useState(0);
  const [canContinue, setCanContinue] = useState(false);
  /** CSS size of the canvas box once the container has been measured. */
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  stateRef.current = state;
  pausedRef.current = paused;
  settingsOpenRef.current = settingsOpen;
  modeRef.current = mode;
  statsRef.current = stats;

  const drawFrame = useCallback((now: number) => {
    const ctx = ctxRef.current;
    const assets = assetsRef.current;
    if (!ctx || !assets) return;
    const s = stateRef.current;
    render(ctx, worldRef.current, vpRef.current, assets, {
      now,
      idle: s === "ready" || s === "intro",
      fx: fxRef.current,
    });
  }, []);

  const syncHud = useCallback(() => {
    const w = worldRef.current;
    setChapter(w.chapter);
    setPasses(w.passes);
    setPunya(w.punya);
    setDeaths(w.deaths);
  }, []);

  const recordBest = useCallback((value: number) => {
    if (value <= bestRef.current) return;
    bestRef.current = value;
    setBest(value);
    saveGame({ best: value });
  }, []);

  const markHinted = useCallback(() => {
    if (hintedRef.current) return;
    hintedRef.current = true;
    setHinted(true);
    saveGame({ hinted: true });
  }, []);

  /** Fold buffered passes plus one more change into the stored stats. */
  const commitStats = useCallback((fn: (s: Stats) => Stats) => {
    const leaps = unflushedLeapsRef.current;
    unflushedLeapsRef.current = 0;
    const next = updateStats((s) => fn({ ...s, leaps: s.leaps + leaps }));
    statsRef.current = next.stats;
    setStats(next.stats);
  }, []);

  /** Persist and announce newly earned achievements. */
  const award = useCallback((event: AchievementEvent) => {
    const world = worldRef.current;
    const ids = evaluate(
      {
        event,
        world,
        chapter: chapterAt(world.chapter),
        mode: modeRef.current,
        chapterDeaths: world.deaths - deathsAtChapterStartRef.current,
        totalLeaps: statsRef.current.leaps + unflushedLeapsRef.current,
      },
      achievedRef.current,
    );
    if (!ids.length) return;
    for (const id of ids) {
      achievedRef.current.add(id);
      track({ name: "achievement", id });
    }
    const all = [...achievedRef.current];
    setAchievements(all);
    saveGame({ achievements: all });
    setToasts((q) => [...q, ...ids]);
  }, []);

  /** Go to a chapter's intro card. `fresh` starts a brand-new run. */
  const goToChapter = useCallback(
    (index: number, fresh: boolean) => {
      if (fresh) {
        worldRef.current = createWorld(vpRef.current);
        commitStats((s) => ({ ...s, runs: s.runs + 1 }));
        track({
          name: "run_start",
          chapter: index,
          fresh,
          easy: easyRef.current,
          lang: langRef.current,
          mode: "story",
        });
      }
      modeRef.current = "story";
      setMode("story");
      setModeNewBest(false);
      worldRef.current.easy = easyRef.current;
      startChapter(worldRef.current, index, vpRef.current);
      deathsAtChapterStartRef.current = worldRef.current.deaths;
      track({ name: "chapter_start", chapter: index });
      pendingFlapRef.current = false;
      wipeFx(fxRef.current);
      setPaused(false);
      setCanContinue(false);
      syncHud();
      setState("intro");
    },
    [commitStats, syncHud],
  );

  /** Endless Flight (fresh random sea) or Today's Leap (everyone's sea for the IST day). */
  const startMode = useCallback(
    (m: Exclude<Mode, "story">) => {
      const today = dailyKey();
      const rng = m === "daily" ? mulberry32(dailySeed(today)) : Math.random;
      worldRef.current = createWorld(vpRef.current, rng);
      worldRef.current.easy = easyRef.current;
      startChapter(worldRef.current, ENDLESS_INDEX, vpRef.current);
      deathsAtChapterStartRef.current = 0;
      commitStats((s) => ({ ...s, runs: s.runs + 1 }));
      track({
        name: "run_start",
        chapter: ENDLESS_INDEX,
        fresh: true,
        easy: easyRef.current,
        lang: langRef.current,
        mode: m,
      });
      if (m === "daily") setDaily((d) => (d.date === today ? d : { date: today, best: 0 }));
      modeRef.current = m;
      setMode(m);
      setModeNewBest(false);
      pendingFlapRef.current = false;
      wipeFx(fxRef.current);
      setPaused(false);
      setCanContinue(false);
      syncHud();
      setState("intro");
    },
    [commitStats, syncHud],
  );

  const beginPlay = useCallback(() => {
    worldRef.current.running = true;
    pendingFlapRef.current = true;
    flapFx(fxRef.current, vpRef.current.heroX, worldRef.current.y);
    playSfx("flap");
    setState("playing");
  }, []);

  const retry = useCallback(() => {
    if (modeRef.current !== "story") {
      startMode(modeRef.current);
      return;
    }
    retryChapter(worldRef.current, vpRef.current);
    deathsAtChapterStartRef.current = worldRef.current.deaths;
    track({ name: "chapter_start", chapter: worldRef.current.chapter });
    pendingFlapRef.current = false;
    setPaused(false);
    setCanContinue(false);
    syncHud();
    setState("intro");
  }, [startMode, syncHud]);

  const toChapters = useCallback(() => {
    worldRef.current = createWorld(vpRef.current);
    worldRef.current.easy = easyRef.current;
    modeRef.current = "story";
    setMode("story");
    setPaused(false);
    syncHud();
    setState("ready");
  }, [syncHud]);

  const share = useCallback((): Promise<ShareOutcome> => {
    const world = worldRef.current;
    const ch = chapterAt(world.chapter);
    const hero = assetsRef.current?.hero ?? new Image();
    const data: ShareData = {
      mode: modeRef.current,
      lang: langRef.current,
      punya: world.punya,
      passes: world.passes,
      chapter: Math.min(world.chapter, LAST_CHAPTER) + 1,
      chapterTitle: ch.title.hi,
      chapterCount: CHAPTER_COUNT,
      won: stateRef.current === "won",
      verseLine: ch.verse.devanagari.split("\n")[0] ?? "",
      date: dailyKey(),
      hero,
    };
    return shareResult(data);
  }, []);

  const requestFlap = useCallback(() => {
    unlockAudio();
    if (pausedRef.current || settingsOpenRef.current) return;
    switch (stateRef.current) {
      case "playing":
        if (worldRef.current.phase !== "run") return; // finale: hands off
        pendingFlapRef.current = true;
        flapFx(fxRef.current, vpRef.current.heroX, worldRef.current.y);
        playSfx("flap");
        if (!hintedRef.current) {
          hintFlapsRef.current += 1;
          setHintFlaps(hintFlapsRef.current);
          if (hintFlapsRef.current >= HINT_FLAPS) markHinted();
        }
        return;
      case "intro":
        beginPlay();
        return;
      case "ready":
        goToChapter(0, true);
        return;
      case "over":
        if (performance.now() - overAtRef.current >= DEATH_COOLDOWN_MS) retry();
        return;
      default:
        return; // chapterClear / won: use the buttons
    }
  }, [beginPlay, goToChapter, markHinted, retry]);

  const togglePause = useCallback(() => {
    if (stateRef.current !== "playing") return;
    setPaused((p) => !p);
  }, []);

  const applyMuted = useCallback((next: boolean) => {
    mutedRef.current = next;
    setSettings((s) => ({ ...s, muted: next }));
    setMuted(next);
    saveGame({ muted: next });
  }, []);

  const toggleMute = useCallback(() => {
    applyMuted(!mutedRef.current);
    track({ name: "settings", key: "muted", value: String(!mutedRef.current) });
  }, [applyMuted]);

  const changeSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (patch.muted !== undefined) {
        applyMuted(patch.muted);
        track({ name: "settings", key: "muted", value: String(patch.muted) });
      }
      if (patch.music !== undefined) {
        setMusicEnabled(patch.music);
        setSettings((s) => ({ ...s, music: patch.music! }));
        saveGame({ music: patch.music });
        track({ name: "settings", key: "music", value: String(patch.music) });
      }
      if (patch.haptics !== undefined) {
        setHapticsEnabled(patch.haptics);
        setSettings((s) => ({ ...s, haptics: patch.haptics! }));
        saveGame({ haptics: patch.haptics });
        if (patch.haptics) haptic("collect");
        track({ name: "settings", key: "haptics", value: String(patch.haptics) });
      }
      if (patch.easy !== undefined) {
        easyRef.current = patch.easy;
        worldRef.current.easy = patch.easy; // future spawns only; columns on screen stay put
        setSettings((s) => ({ ...s, easy: patch.easy! }));
        saveGame({ easy: patch.easy });
        track({ name: "settings", key: "easy", value: String(patch.easy) });
      }
    },
    [applyMuted],
  );

  const eraseProgress = useCallback(() => {
    const next = resetProgress();
    bestRef.current = 0;
    hintedRef.current = false;
    hintFlapsRef.current = 0;
    unflushedLeapsRef.current = 0;
    setBest(0);
    setUnlocked(0);
    setStats(next.stats);
    statsRef.current = next.stats;
    achievedRef.current = new Set();
    setAchievements([]);
    setEndlessBest(0);
    setDaily({ date: "", best: 0 });
    setHinted(false);
    setHintFlaps(0);
    setSettingsOpen(false);
    toChapters();
  }, [toChapters]);

  // Honour prefers-reduced-motion for shake and wipes.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      fxRef.current.reducedMotion = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Fire ambience only while actually playing Lanka Dahan.
  useEffect(() => {
    const fire = state === "playing" && !paused && chapterAt(chapter).sky === "fire";
    setAmbience(fire ? "fire" : null);
  }, [state, paused, chapter]);

  // Music through the chapter card, the flight and the verse screen; silent when paused or fallen.
  useEffect(() => {
    const on =
      (state === "playing" && !paused) ||
      state === "intro" ||
      state === "chapterClear" ||
      state === "won";
    setMusic(on ? chapterAt(chapter).id : null);
  }, [state, paused, chapter]);
  useEffect(() => () => setMusic(null), []);

  // Persisted values are read on the client only, after hydration.
  useEffect(() => {
    const save = loadSave();
    bestRef.current = save.best;
    mutedRef.current = save.muted;
    easyRef.current = save.easy;
    hintedRef.current = save.hinted;
    worldRef.current.easy = save.easy;
    setBest(save.best);
    setUnlocked(save.unlockedChapter);
    setSettings({ muted: save.muted, music: save.music, haptics: save.haptics, easy: save.easy });
    setStats(save.stats);
    statsRef.current = save.stats;
    setEndlessBest(save.endlessBest);
    setDaily(save.daily);
    achievedRef.current = new Set(save.achievements);
    setAchievements(save.achievements);
    setHinted(save.hinted);
    setMuted(save.muted);
    setMusicEnabled(save.music);
    setHapticsEnabled(save.haptics);
    setHapticsAvailable(hapticsSupported());
    if (initialChapter !== undefined) {
      goToChapter(Math.max(0, Math.min(LAST_CHAPTER, initialChapter)), true);
    }
  }, [initialChapter, goToChapter]);

  // Size the logical viewport from the container; re-run on resize and DPR change.
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;

    const apply = () => {
      const rect = container.getBoundingClientRect();
      const prev = vpRef.current;
      const next = computeViewport(rect.width, rect.height, window.devicePixelRatio, prev.portrait);
      if (
        next.w === prev.w &&
        next.h === prev.h &&
        next.dpr === prev.dpr &&
        next.cssW === prev.cssW &&
        next.cssH === prev.cssH
      ) {
        return;
      }
      resizeWorld(worldRef.current, prev, next);
      vpRef.current = next;
      applyViewport(canvas, ctx, next);
      setBox({ w: next.cssW, h: next.cssH });
      drawFrame(performance.now());
    };

    const ro = new ResizeObserver(apply);
    ro.observe(container);
    apply();

    let mq: MediaQueryList | null = null;
    const onDpr = () => {
      apply();
      watchDpr();
    };
    const watchDpr = () => {
      mq?.removeEventListener("change", onDpr);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener("change", onDpr);
    };
    watchDpr();

    return () => {
      ro.disconnect();
      mq?.removeEventListener("change", onDpr);
    };
  }, [drawFrame]);

  // Main loop: fixed-step simulation, render every animation frame.
  useEffect(() => {
    assetsRef.current = loadAssets();
    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const dispatch = (events: GameEvent[], now: number) => {
      for (const ev of events) {
        const world = worldRef.current;
        switch (ev.type) {
          case "pass":
            setPasses(ev.passes);
            setPunya(ev.punya);
            unflushedLeapsRef.current += 1;
            markHinted();
            playSfx("pass");
            award({ type: "pass", kind: ev.kind });
            break;
          case "collect":
            setPunya(ev.punya);
            burst(fxRef.current, "sparkle", vpRef.current.heroX, world.y, 18);
            playSfx("collect");
            haptic("collect");
            award({ type: "collect" });
            break;
          case "smash":
            setPunya(ev.punya);
            burst(fxRef.current, "leaf", ev.x, ev.y, 22);
            burst(fxRef.current, "spark", ev.x, ev.y, 6);
            playSfx("smash");
            haptic("collect");
            award({ type: "smash" });
            break;
          case "hit": {
            hitFx(fxRef.current);
            overAtRef.current = now;
            setCanContinue(false);
            setDeaths(world.deaths);
            markHinted();
            const m = modeRef.current;
            if (m === "story") {
              recordBest(ev.punya);
              commitStats((s) =>
                bumpChapter({ ...s, deaths: s.deaths + 1 }, world.chapter, "deaths"),
              );
            } else {
              commitStats((s) => ({ ...s, deaths: s.deaths + 1 }));
              if (m === "endless") {
                setEndlessBest((b) => {
                  const nb = Math.max(b, ev.punya);
                  if (nb !== b) saveGame({ endlessBest: nb });
                  setModeNewBest(nb !== b);
                  return nb;
                });
              } else {
                const today = dailyKey();
                setDaily((d) => {
                  const prev = d.date === today ? d.best : 0;
                  const nb = Math.max(prev, ev.punya);
                  const next = { date: today, best: nb };
                  if (nb !== prev) saveGame({ daily: next });
                  setModeNewBest(nb !== prev && nb > 0);
                  return next;
                });
              }
            }
            track({ name: "death", chapter: world.chapter, kind: ev.by, passes: world.passes });
            award({ type: "hit" });
            setState("over");
            playSfx("hit");
            haptic("hit");
            break;
          }
          case "finale":
            break;
          case "chapterClear": {
            setPunya(ev.punya);
            recordBest(ev.punya);
            const next = ev.chapter + 1;
            setUnlocked((u) => {
              const nu = Math.max(u, next);
              if (nu !== u) saveGame({ unlockedChapter: nu });
              return nu;
            });
            commitStats((s) => bumpChapter(s, ev.chapter, "clears"));
            award({ type: "clear" });
            track({
              name: "chapter_clear",
              chapter: ev.chapter,
              deaths: world.deaths,
              punya: ev.punya,
            });
            setState("chapterClear");
            playSfx("chapter");
            haptic("chapter");
            break;
          }
          case "won":
            setPunya(ev.punya);
            setDeaths(ev.deaths);
            recordBest(ev.punya);
            setUnlocked((u) => {
              const nu = Math.max(u, LAST_CHAPTER);
              if (nu !== u) saveGame({ unlockedChapter: nu });
              return nu;
            });
            commitStats((s) =>
              bumpChapter(
                { ...s, wins: s.wins + 1, flawless: s.flawless + (ev.deaths === 0 ? 1 : 0) },
                world.chapter,
                "clears",
              ),
            );
            track({ name: "won", deaths: ev.deaths, punya: ev.punya, easy: world.easy });
            award({ type: "won" });
            setState("won");
            playSfx("win");
            haptic("win");
            break;
        }
      }
    };

    const frame = (now: number) => {
      const wall = Math.min((now - last) / 1000, MAX_DT);
      last = now;

      if (pausedRef.current) {
        acc = 0;
      } else {
        acc += wall;
        const events: GameEvent[] = [];
        let n = 0;
        while (acc >= STEP && n < MAX_SUBSTEPS) {
          const flap = pendingFlapRef.current;
          pendingFlapRef.current = false;
          events.push(...step(worldRef.current, { flap }, STEP, vpRef.current));
          acc -= STEP;
          n++;
        }
        if (n === MAX_SUBSTEPS) acc = 0;
        if (events.length) dispatch(events, now);
      }

      const world = worldRef.current;
      const vp = vpRef.current;
      const ch = chapterAt(world.chapter);
      // Surasa: one cue the moment Hanuman shrinks to a thumb
      if (world.heroScale === SURASA_SHRINK && lastScaleRef.current !== SURASA_SHRINK) {
        playSfx("shrink");
      }
      lastScaleRef.current = world.heroScale;
      updateFx(fxRef.current, pausedRef.current ? 0 : wall, world, vp, {
        heroX: sceneHeroX(world, vp, ch),
        fireSky: ch.sky === "fire",
        running: world.running && !pausedRef.current,
      });
      drawFrame(now);
      if (!readyRef.current) {
        readyRef.current = true;
        platform().ready(); // first frame is up: native splash can go
      }
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [award, commitStats, drawFrame, markHinted, recordBest]);

  // Keyboard: flap / pause / mute. Ignore auto-repeat, the settings sheet, and controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || settingsOpenRef.current) return;
      const t = e.target;
      if (
        t instanceof HTMLElement &&
        t.closest("input, textarea, select, button, [contenteditable=true]")
      ) {
        return;
      }
      switch (e.code) {
        case "Space":
        case "ArrowUp":
        case "Enter":
          e.preventDefault();
          requestFlap();
          break;
        case "KeyP":
        case "Escape":
          togglePause();
          break;
        case "KeyM":
          toggleMute();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestFlap, togglePause, toggleMute]);

  // Hardware back (Android): close what's open, else pause, else back to chapters, else leave.
  useEffect(
    () =>
      platform().onBackButton(() => {
        if (settingsOpenRef.current) {
          setSettingsOpen(false);
          return "handled";
        }
        switch (stateRef.current) {
          case "playing":
            if (!pausedRef.current) setPaused(true);
            else toChapters();
            return "handled";
          case "ready":
            return "exit";
          default:
            toChapters();
            return "handled";
        }
      }),
    [toChapters],
  );

  // Pause when the tab is hidden or the window loses focus.
  useEffect(() => {
    const pauseIfPlaying = () => {
      if (stateRef.current === "playing") setPaused(true);
    };
    const onVisibility = () => {
      if (document.hidden) pauseIfPlaying();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pauseIfPlaying);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pauseIfPlaying);
    };
  }, []);

  // After a hit, hold the game-over screen briefly before a tap can restart.
  useEffect(() => {
    if (state !== "over") return;
    const t = setTimeout(() => setCanContinue(true), DEATH_COOLDOWN_MS);
    return () => clearTimeout(t);
  }, [state]);

  const ch = chapterAt(chapter);
  const showHint = state === "playing" && !paused && !hinted && hintFlaps < HINT_FLAPS;
  const today = dailyKey();
  const modes = {
    unlocked: unlocked >= MODES_UNLOCK_AT,
    endlessBest,
    dailyBest: daily.date === today ? daily.best : 0,
    dailyDate: today,
    onEndless: () => startMode("endless"),
    onDaily: () => startMode("daily"),
  };

  return (
    <div ref={containerRef} className="flex min-h-0 w-full flex-1 items-center justify-center">
      <div
        lang={lang}
        className={cn(
          "relative overflow-hidden bg-[#0d4a57] md:landscape:rounded-2xl md:landscape:border md:landscape:border-border md:landscape:shadow-2xl",
          !box && "aspect-[900/560] w-full max-w-[900px]",
        )}
        style={box ? { width: box.w, height: box.h } : undefined}
        onPointerDown={(e) => {
          e.preventDefault();
          requestFlap();
        }}
      >
        <canvas ref={canvasRef} className="block h-full w-full touch-none select-none" />

        {state !== "ready" && state !== "won" && (
          <Hud
            chapter={ch}
            chapterIndex={chapter}
            passes={passes}
            punya={punya}
            best={mode === "story" ? best : mode === "daily" ? modes.dailyBest : endlessBest}
            muted={settings.muted}
            showPause={state === "playing"}
            onMute={toggleMute}
            onPause={togglePause}
          />
        )}

        {showHint && <FirstRunHint />}
        <AchievementToast queue={toasts} />

        {state === "playing" && !paused && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 max-w-[85%] -translate-x-1/2 rounded-full bg-background/70 px-4 py-1.5 text-center text-xs text-muted-foreground backdrop-blur sm:bottom-4">
            {pick(lang, ch.caption)}
          </div>
        )}

        {state === "playing" && paused && (
          <PauseMenu
            onResume={() => setPaused(false)}
            onRestart={retry}
            onChapters={toChapters}
            onSettings={() => setSettingsOpen(true)}
          />
        )}
        {state === "ready" && (
          <StartScreen
            unlocked={unlocked}
            modes={modes}
            onStart={() => goToChapter(0, true)}
            onSelect={(i) => goToChapter(i, true)}
            onSettings={() => setSettingsOpen(true)}
          />
        )}
        {state === "intro" && (
          <ChapterIntro chapter={ch} index={chapter} mode={mode} date={today} />
        )}
        {state === "chapterClear" && (
          <ChapterClear
            chapter={ch}
            index={chapter}
            punya={punya}
            onContinue={() => goToChapter(chapter + 1, false)}
          />
        )}
        {state === "over" && mode === "story" && (
          <GameOver
            chapter={ch}
            index={chapter}
            punya={punya}
            canContinue={canContinue}
            onRetry={retry}
            onChapters={toChapters}
            onShare={share}
          />
        )}
        {state === "over" && mode !== "story" && (
          <EndlessOver
            mode={mode}
            chapter={ch}
            passes={passes}
            punya={punya}
            best={mode === "daily" ? daily.best : endlessBest}
            newBest={modeNewBest}
            onRetry={retry}
            onChapters={toChapters}
            onShare={share}
          />
        )}
        {state === "won" && (
          <WinScreen
            chapter={ch}
            punya={punya}
            best={best}
            flawless={deaths === 0}
            onPlayAgain={() => goToChapter(0, true)}
            onChapters={toChapters}
            onShare={share}
          />
        )}

        <SettingsSheet
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          hapticsAvailable={hapticsAvailable}
          stats={stats}
          achievements={achievements}
          onChange={changeSettings}
          onReset={eraseProgress}
        />
      </div>
    </div>
  );
}
