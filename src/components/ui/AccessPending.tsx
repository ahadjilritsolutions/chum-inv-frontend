"use client";

/**
 * The neutral shell a page shows while its access is being resolved, and for
 * the instant before a refused session is redirected away.
 *
 * Deliberately says nothing about permissions. Two different states land here
 * — "still loading" and "about to be redirected" — and labelling it "accès
 * refusé" would flash an accusation at everyone during the normal load.
 * Whoever genuinely lacks the access ends up on the dashboard, where the empty
 * rail tells the real story.
 */
export default function AccessPending() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
      Chargement…
    </div>
  );
}
