"use client";

import type { GroupeImpression } from "@/services/inv/impression";
import type { LocalisationOption } from "@/types/inv/reference";

/**
 * LE CARNET D'INVENTAIRE — le registre d'un service, bureau par bureau.
 *
 * Reprise fidèle de `sortie/rcah.php`, que les services connaissent depuis des
 * années et classent dans un carnet relié. La mise en page n'est donc pas une
 * préférence : c'est ce que le responsable de service signe.
 *
 *   • UN TABLEAU PAR BUREAU, titre du bureau en bandeau gris.
 *   • QUATRE COLONNES : N° · Désignation · N°-Inventaire · Observation.
 *   • LA NUMÉROTATION EST CONTINUE d'un bureau à l'autre — elle compte les
 *     biens du SERVICE, pas ceux de la pièce. C'est ce qui permet de dire
 *     « le service en a 25 » en lisant la dernière ligne.
 *   • LA DÉSIGNATION EST COMPOSÉE : libellé-marque-n° de série, les parties
 *     vides étant omises. D'où « PC-DE-BUREAU-DELL » et
 *     « IMPRIMANTE-CANON-LBP-6030 » sur le carnet papier.
 *   • LA COLONNE OBSERVATION RESTE VIDE. Elle est là pour le stylo : c'est sur
 *     le carnet qu'on annote ce qu'on trouve en passant.
 *
 * ── LES BUREAUX VIDES SONT IMPRIMÉS ─────────────────────────────────────────
 * Un bureau sans aucun bien sort quand même, avec son en-tête et rien dessous.
 * Ce n'est pas un oubli : le carnet atteste qu'on est passé dans CHAQUE pièce
 * du service. Un bureau absent de la liste ne dit pas s'il est vide ou s'il a
 * été sauté.
 *
 * ── CE QUI DIFFÈRE DU LEGACY, ET POURQUOI ───────────────────────────────────
 * Le legacy n'imprimait que `cod_pays = 'OUI'`, c'est-à-dire les biens
 * explicitement marqués présents. Ici, seuls les biens explicitement ABSENTS
 * sont écartés. La nuance compte : dans le legacy le formulaire posait OUI par
 * défaut, donc tout nouveau bien sortait ; chez nous la présence peut rester
 * « non vérifiée », et reprendre la règle à la lettre ferait disparaître du
 * registre officiel tout article saisi mais pas encore pointé.
 */
export default function CarnetInventaire({
  groupes, locaux, service, periode,
}: {
  /** Les articles, déjà ventilés par localisation par l'API. */
  groupes: GroupeImpression[];
  /** TOUS les locaux du service — y compris ceux qui n'ont aucun bien. */
  locaux: LocalisationOption[];
  service: string | null;
  /** « 11/2026 ». */
  periode: string;
}) {
  const parLoc = new Map(groupes.map((g) => [g.id_localisation, g]));

  // Le compteur traverse les bureaux : il numérote le service.
  let n = 0;

  return (
    <div className="carnet">
      <div className="carnet-entete">
        <p>RÉPUBLIQUE ALGÉRIENNE DÉMOCRATIQUE ET POPULAIRE</p>
        <p>CENTRE HOSPITALO-UNIVERSITAIRE MUSTAPHA</p>
      </div>

      <h1 className="carnet-titre">CARNET D&apos;INVENTAIRE</h1>
      <p className="carnet-periode">{periode}</p>
      {service && <p className="carnet-service">{service}</p>}

      {locaux.map((l) => {
        const g = parLoc.get(l.id_localisation);
        const lignes = g?.lignes ?? [];
        return (
          <section key={l.id_localisation} className="carnet-bloc">
            <div className="carnet-bureau">{l.libelle}</div>
            <table className="carnet-table">
              <thead>
                <tr>
                  <th style={{ width: "8%" }}>N°</th>
                  <th>Désignation</th>
                  <th style={{ width: "20%" }}>N°-Inventaire</th>
                  <th style={{ width: "22%" }}>Observation</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((a) => {
                  n += 1;
                  return (
                    <tr key={a.id_article}>
                      <td style={{ textAlign: "center" }}>{n}</td>
                      <td>{designation(a)}</td>
                      <td style={{ textAlign: "center" }}>{a.num_inventaire}</td>
                      {/* Vide : c'est la colonne du stylo. */}
                      <td />
                    </tr>
                  );
                })}
                {lignes.length === 0 && (
                  <tr>
                    <td />
                    <td />
                    <td />
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        );
      })}

      <p className="carnet-signature">Responsable du Service</p>
    </div>
  );
}

/**
 * « PC-DE-BUREAU-DELL », « IMPRIMANTE-CANON-LBP-6030 ».
 *
 * Le legacy concaténait libellé, modèle et n° de série avec des tirets, en
 * sautant les parties nulles (`lib_art-model_art-ns_art`). Notre `marque` EST
 * le `model_art` du legacy — le champ du formulaire s'appelait « MARQUE ».
 */
function designation(a: {
  designation: string; marque: string | null; num_serie: string | null;
}): string {
  return [a.designation, a.marque, a.num_serie]
    .map((x) => (x ?? "").trim())
    .filter((x) => x !== "")
    .join("-");
}
