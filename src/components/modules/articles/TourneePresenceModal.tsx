"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, Keyboard, TriangleAlert, X } from "lucide-react";
import { confirmerPresenceParNumero } from "@/services/inv/articles";

/**
 * LA TOURNÉE DE PRÉSENCE — scanner en continu, sans rien toucher entre deux
 * biens.
 *
 * ── LE GESTE QUE CET ÉCRAN REMPLACE ─────────────────────────────────────────
 * Confirmer une présence se faisait bien par bien : chercher l'article dans la
 * liste, cliquer son icône, recommencer. Pour une armoire, cela va ; pour un
 * service de 400 biens, personne ne le fait — et c'est exactement pour ça que
 * 2 694 articles n'ont jamais eu de présence confirmée.
 *
 * Ici la caméra reste ALLUMÉE. On scanne, c'est pointé, on passe au suivant
 * sans quitter des yeux l'étiquette d'après. La boucle est le point : un écran
 * qu'il faut rouvrir entre chaque bien redevient le geste qu'on abandonne.
 *
 * ── POURQUOI AUCUNE LIBRAIRIE ───────────────────────────────────────────────
 * `BarcodeDetector` est fourni par le navigateur (Chrome Android, le téléphone
 * réel des agents). Embarquer un décodeur en JavaScript coûterait quelques
 * centaines de kilo-octets à charger sur le wifi d'un couloir d'hôpital, pour
 * refaire ce que l'appareil sait déjà.
 *
 * Là où l'API manque — iOS Safari notamment — on ne laisse pas l'écran mort :
 * la SAISIE MANUELLE prend le relais, et elle sert aussi aux douchettes USB,
 * qui tapent le numéro comme un clavier. L'un ou l'autre, le reste est
 * identique.
 *
 * ── CE QUI EST ÉCRIT, ET QUAND ──────────────────────────────────────────────
 * Chaque scan part au serveur immédiatement : une tournée interrompue (batterie,
 * appel, ascenseur sans réseau) doit avoir enregistré tout ce qui a été pointé
 * jusque-là. Rien n'est gardé en mémoire pour un envoi groupé à la fin.
 *
 * Le même code relu dans les secondes qui suivent est ignoré : une caméra rend
 * plusieurs images par seconde du même autocollant, et sans ce garde-fou un
 * bien serait envoyé vingt fois pendant qu'on vise le suivant.
 */

/** `BarcodeDetector` n'est pas dans les types du DOM : on décrit ce qu'on utilise. */
interface DetecteurCodes {
  detect(source: CanvasImageSource): Promise<Array<{ rawValue: string }>>;
}
interface FenetreAvecDetecteur {
  BarcodeDetector?: new (options?: { formats?: string[] }) => DetecteurCodes;
}

interface LignePointee {
  num_inventaire: string;
  designation: string;
  localisation: string | null;
  deja_confirme: boolean;
  /** Une erreur (numéro inconnu, hors périmètre) plutôt qu'un succès. */
  erreur?: string;
  cle: number;
}

/** Deux secondes avant d'accepter à nouveau le MÊME code. */
const REPOS_MEME_CODE = 2000;

export default function TourneePresenceModal({
  ouvert, onClose, onTermine,
}: {
  ouvert: boolean;
  onClose: () => void;
  /** Nombre de biens réellement pointés — la liste se recharge si > 0. */
  onTermine: (pointes: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fluxRef = useRef<MediaStream | null>(null);
  const derniersCodes = useRef<Map<string, number>>(new Map());
  const enCours = useRef(false);

  const [camera, setCamera] = useState<"demarrage" | "active" | "indisponible">("demarrage");
  const [motifCamera, setMotifCamera] = useState<string | null>(null);
  const [saisie, setSaisie] = useState("");
  const [lignes, setLignes] = useState<LignePointee[]>([]);
  const [dernier, setDernier] = useState<LignePointee | null>(null);

  const pointes = lignes.filter((l) => !l.erreur).length;

  /** Enregistre un numéro. Utilisé par la caméra ET par la saisie manuelle. */
  const pointer = useCallback(async (num: string) => {
    const code = num.trim();
    if (!code || enCours.current) return;

    const vu = derniersCodes.current.get(code);
    if (vu && Date.now() - vu < REPOS_MEME_CODE) return;
    derniersCodes.current.set(code, Date.now());

    enCours.current = true;
    try {
      const r = await confirmerPresenceParNumero(code);
      const ligne: LignePointee = { ...r, cle: Date.now() };
      setDernier(ligne);
      setLignes((p) => [ligne, ...p]);
      // Un bip court : en tournée on regarde l'étiquette, pas l'écran.
      bip(r.deja_confirme ? 660 : 880);
    } catch (e) {
      const ligne: LignePointee = {
        num_inventaire: code,
        designation: "",
        localisation: null,
        deja_confirme: false,
        erreur: e instanceof Error ? e.message : "Enregistrement impossible.",
        cle: Date.now(),
      };
      setDernier(ligne);
      setLignes((p) => [ligne, ...p]);
      bip(220);
    } finally {
      enCours.current = false;
    }
  }, []);

  // ── La caméra et la boucle de lecture ─────────────────────────────────────
  useEffect(() => {
    if (!ouvert) return;
    let annule = false;
    let minuteur: ReturnType<typeof setInterval> | null = null;

    const Detecteur = (window as unknown as FenetreAvecDetecteur).BarcodeDetector;
    if (!Detecteur) {
      setCamera("indisponible");
      setMotifCamera(
        "Ce navigateur ne sait pas lire un QR depuis la caméra. Saisissez ou scannez le numéro ci-dessous — une douchette USB fonctionne comme un clavier.",
      );
      return;
    }

    void (async () => {
      try {
        // `environment` : la caméra arrière. Sur un téléphone, la frontale
        // filmerait l'agent au lieu de l'armoire.
        const flux = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
        });
        if (annule) { flux.getTracks().forEach((t) => t.stop()); return; }
        fluxRef.current = flux;
        if (videoRef.current) {
          videoRef.current.srcObject = flux;
          await videoRef.current.play();
        }
        setCamera("active");

        const detecteur = new Detecteur({ formats: ["qr_code"] });
        // 250 ms : assez pour attraper un code posé devant l'objectif, assez
        // lent pour ne pas chauffer le téléphone pendant une heure de tournée.
        minuteur = setInterval(async () => {
          const v = videoRef.current;
          const c = canvasRef.current;
          if (!v || !c || v.readyState < 2) return;
          try {
            c.width = v.videoWidth;
            c.height = v.videoHeight;
            const ctx = c.getContext("2d");
            if (!ctx) return;
            ctx.drawImage(v, 0, 0, c.width, c.height);
            const codes = await detecteur.detect(c);
            if (codes.length > 0) void pointer(codes[0].rawValue);
          } catch {
            /* Une image ratée n'est pas une panne : on retentera dans 250 ms. */
          }
        }, 250);
      } catch (e) {
        if (annule) return;
        setCamera("indisponible");
        setMotifCamera(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Accès à la caméra refusé. Autorisez-le dans le navigateur, ou saisissez le numéro ci-dessous."
            : "Caméra inaccessible. Saisissez ou scannez le numéro ci-dessous.",
        );
      }
    })();

    return () => {
      annule = true;
      if (minuteur) clearInterval(minuteur);
      // Libérer la caméra EXPLICITEMENT : sans cela le voyant reste allumé et
      // le téléphone continue de filmer dans la poche.
      fluxRef.current?.getTracks().forEach((t) => t.stop());
      fluxRef.current = null;
    };
  }, [ouvert, pointer]);

  // Remise à zéro à chaque ouverture : une tournée est une tournée.
  useEffect(() => {
    if (!ouvert) return;
    setLignes([]); setDernier(null); setSaisie("");
    setCamera("demarrage"); setMotifCamera(null);
    derniersCodes.current.clear();
  }, [ouvert]);

  if (!ouvert) return null;

  function fermer() {
    onTermine(pointes);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[1200] flex flex-col bg-slate-900">
      <header className="flex shrink-0 items-center justify-between gap-3 bg-slate-900 px-4 py-3 text-white">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold">Tournée de présence</h2>
          <p className="text-[11.5px] text-white/60">
            {pointes === 0
              ? "Visez une étiquette — le pointage est automatique"
              : `${pointes} bien${pointes > 1 ? "s" : ""} pointé${pointes > 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          type="button"
          onClick={fermer}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/20"
        >
          <X size={15} />
          Terminer
        </button>
      </header>

      {/* ── Le viseur ──────────────────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          className="h-full w-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {camera === "active" && (
          /* Une mire : sans repère, on ne sait pas où présenter l'étiquette. */
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-56 w-56 rounded-2xl border-4 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}

        {camera === "demarrage" && (
          <p className="absolute inset-0 flex items-center justify-center gap-2 text-[13px] text-white/70">
            <Camera size={16} /> Ouverture de la caméra…
          </p>
        )}

        {camera === "indisponible" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <CameraOff size={26} className="text-white/50" />
            <p className="max-w-sm text-[12.5px] leading-snug text-white/70">{motifCamera}</p>
          </div>
        )}

        {/* Le dernier résultat, en grand par-dessus l'image : c'est ce qu'on
            regarde du coin de l'œil sans arrêter de viser. */}
        {dernier && (
          <div
            key={dernier.cle}
            className={
              "absolute inset-x-3 bottom-3 rounded-xl px-3.5 py-2.5 shadow-lg " +
              (dernier.erreur
                ? "bg-red-600 text-white"
                : dernier.deja_confirme
                  ? "bg-amber-500 text-white"
                  : "bg-emerald-600 text-white")
            }
          >
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              {dernier.erreur ? <TriangleAlert size={14} /> : <Check size={14} />}
              <span className="font-mono">{dernier.num_inventaire}</span>
              {dernier.deja_confirme && !dernier.erreur && (
                <span className="text-[11px] font-normal">— déjà pointé</span>
              )}
            </p>
            <p className="truncate text-[12px] opacity-90">
              {dernier.erreur ?? dernier.designation}
            </p>
            {!dernier.erreur && dernier.localisation && (
              <p className="truncate text-[11px] opacity-75">{dernier.localisation}</p>
            )}
          </div>
        )}
      </div>

      {/* ── La saisie manuelle : secours, et douchette USB ─────────────────── */}
      <form
        onSubmit={(e) => { e.preventDefault(); void pointer(saisie); setSaisie(""); }}
        className="flex shrink-0 items-center gap-2 bg-slate-800 px-3 py-2.5"
      >
        <Keyboard size={16} className="shrink-0 text-white/40" />
        <input
          value={saisie}
          onChange={(e) => setSaisie(e.target.value)}
          placeholder="N° d'inventaire — ex. 232-002810"
          // autoFocus seulement sans caméra : sur téléphone, il ferait monter
          // le clavier par-dessus le viseur.
          autoFocus={camera === "indisponible"}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 font-mono text-[13px] text-white outline-none placeholder:text-white/30 focus:border-cyan-400"
        />
        <button
          type="submit"
          disabled={!saisie.trim()}
          className="shrink-0 rounded-lg bg-cyan-600 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-40"
        >
          Pointer
        </button>
      </form>

      {/* ── Ce qui vient d'être pointé ─────────────────────────────────────── */}
      {lignes.length > 0 && (
        <ul className="max-h-[26vh] shrink-0 overflow-y-auto bg-slate-900 px-3 pb-3">
          {lignes.map((l) => (
            <li
              key={l.cle}
              className="flex items-center gap-2 border-b border-white/5 py-1.5 text-[12px] last:border-0"
            >
              <span
                className={
                  "h-1.5 w-1.5 shrink-0 rounded-full " +
                  (l.erreur ? "bg-red-400" : l.deja_confirme ? "bg-amber-400" : "bg-emerald-400")
                }
              />
              <span className="shrink-0 font-mono text-white/70">{l.num_inventaire}</span>
              <span className="truncate text-white/50">{l.erreur ?? l.designation}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Un bip court, sans fichier son.
 *
 * Un agent en tournée regarde l'étiquette, pas l'écran : c'est le son qui lui
 * dit que c'est passé. Trois hauteurs — aigu pour un pointage neuf, moyen pour
 * un doublon, grave pour un refus — se distinguent sans qu'on ait à lever les
 * yeux. WebAudio évite d'embarquer trois fichiers à charger.
 */
function bip(frequence: number) {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequence;
    gain.gain.value = 0.06;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => void ctx.close();
  } catch {
    /* Le son est un confort : une tournée reste utilisable sans. */
  }
}
