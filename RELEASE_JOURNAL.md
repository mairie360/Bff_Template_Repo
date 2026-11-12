# Journal des releases — Bff_Template_Repo

<!-- release-journal-state {"dev": "0aa1727671f161fa482ad9df83159353a46eeeb8", "prod": "eacae3cb95b99504d7b173fbf7c7ba2ecefb4838", "prod_tag": "v1.0.0", "staging": "eacae3cb95b99504d7b173fbf7c7ba2ecefb4838", "updated": {"dev": "2026-11-12 11:43 UTC"}} -->
> Tenu à jour par la CI (`mairie360/CICD`, action `release/release-journal`) à chaque passage en dev, staging et prod. Ne pas modifier à la main : le fichier est réécrit au passage suivant.

| Environnement | Version | Commit | Mis à jour |
| --- | --- | --- | --- |
| prod | v1.0.0 | `eacae3c` | — |
| staging | — | `eacae3c` | — |
| dev | — | `0aa1727` | 2026-11-12 11:43 UTC |

## Ajouté sur main depuis la dernière release prod (v1.0.0)

- chore(deps): update node.js to 116b800 (#55) ([#55](https://github.com/mairie360/Bff_Template_Repo/pull/55))
- fix: MAIR-741 Remove npm from the runtime image of the BFF template (#83) ([#83](https://github.com/mairie360/Bff_Template_Repo/pull/83))
- feat: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#74](https://github.com/mairie360/Bff_Template_Repo/pull/74))
- fix(deps): update typescript dependencies (#76) ([#76](https://github.com/mairie360/Bff_Template_Repo/pull/76))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#78](https://github.com/mairie360/Bff_Template_Repo/pull/78))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#77](https://github.com/mairie360/Bff_Template_Repo/pull/77))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#75](https://github.com/mairie360/Bff_Template_Repo/pull/75))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#72) ([#72](https://github.com/mairie360/Bff_Template_Repo/pull/72))
- chore(deps): pin dependencies (#70) ([#70](https://github.com/mairie360/Bff_Template_Repo/pull/70))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#48) ([#48](https://github.com/mairie360/Bff_Template_Repo/pull/48))
- fix: MAIR-290 Détecter les données personnelles dans les journaux avec un test du marqueur (#45) ([#45](https://github.com/mairie360/Bff_Template_Repo/pull/45))
- feat: MAIR-262 Tests d'intégration - Tests de fonctionnement des APIs, tests métier des BFFs et tests de régression (#66) ([#66](https://github.com/mairie360/Bff_Template_Repo/pull/66))
- chore(ci): MAIR-571 Forward the release-journal inputs to CICD v4.3.1 (#60) ([#60](https://github.com/mairie360/Bff_Template_Repo/pull/60))
- chore(deps): update dependency mairie360/cicd to v4.3.1 (#62) ([#62](https://github.com/mairie360/Bff_Template_Repo/pull/62))
- chore(deps): update dependency mairie360/cicd to v4.3.0 (#61) ([#61](https://github.com/mairie360/Bff_Template_Repo/pull/61))
- feat: MAIR-504 Ajouter la télémétrie OpenTelemetry aux BFFs ([#50](https://github.com/mairie360/Bff_Template_Repo/pull/50))
- chore(deps): update dependency mairie360/cicd to v4.2.2 (#58) ([#58](https://github.com/mairie360/Bff_Template_Repo/pull/58))
- chore(deps): update dependency mairie360/cicd to v4.2.1 (#56) ([#56](https://github.com/mairie360/Bff_Template_Repo/pull/56))
- chore(deps): MAIR-529 APIs/BFFs - Renseigner le rôle dans le JWT et l'exposer aux BFF (#54) ([#54](https://github.com/mairie360/Bff_Template_Repo/pull/54))
- chore: MAIR-525 BFFs - Supprimer les appels en cascade et entre BFF, paralléliser, mettre en cache et relayer les messages en SSE (#52) ([#52](https://github.com/mairie360/Bff_Template_Repo/pull/52))
- chore(deps): update dependency mairie360/cicd to v4.2.0 (#43) ([#43](https://github.com/mairie360/Bff_Template_Repo/pull/43))
- chore(deps): update dependency mairie360/cicd to v4.1.1 (#42) ([#42](https://github.com/mairie360/Bff_Template_Repo/pull/42))
- chore(deps): update dependency mairie360/cicd to v4 (#32) ([#32](https://github.com/mairie360/Bff_Template_Repo/pull/32))
- refactor: MAIR-430 [Audit 02/10] Tous les BFFs : dérive entre template, bffs_lib et BFFs (code commun copié-collé) (#38) ([#38](https://github.com/mairie360/Bff_Template_Repo/pull/38))
- feat: MAIR-431 Fail fast on missing upstream configuration (#37) ([#37](https://github.com/mairie360/Bff_Template_Repo/pull/37))
- refactor: MAIR-429 [Audit 02/10] Tous les BFFs : unifier l'extraction du jeton dans bffs_lib (5 implémentations divergentes) (#36) ([#36](https://github.com/mairie360/Bff_Template_Repo/pull/36))
- chore(deps): update dependency @types/node to v24.19.1 (#30) ([#30](https://github.com/mairie360/Bff_Template_Repo/pull/30))

## Différence dev → staging (en dev, pas encore en staging)

- chore(deps): update node.js to 116b800 (#55) ([#55](https://github.com/mairie360/Bff_Template_Repo/pull/55))
- fix: MAIR-741 Remove npm from the runtime image of the BFF template (#83) ([#83](https://github.com/mairie360/Bff_Template_Repo/pull/83))
- feat: MAIR-497 GDPR - Usage simulation and AI review of logs and database before prod ([#74](https://github.com/mairie360/Bff_Template_Repo/pull/74))
- fix(deps): update typescript dependencies (#76) ([#76](https://github.com/mairie360/Bff_Template_Repo/pull/76))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#78](https://github.com/mairie360/Bff_Template_Repo/pull/78))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#77](https://github.com/mairie360/Bff_Template_Repo/pull/77))
- fix: MAIR-680 [Audit 23/10] Toutes les APIs et BFFs : remplacer le secret JWT HS256 partagé par 12 services (A1) ([#75](https://github.com/mairie360/Bff_Template_Repo/pull/75))
- ci: MAIR-771 APIs, BFFs, Database : monter CICD en v5.2.2 pour activer les contrôles RGPD (#72) ([#72](https://github.com/mairie360/Bff_Template_Repo/pull/72))
- chore(deps): pin dependencies (#70) ([#70](https://github.com/mairie360/Bff_Template_Repo/pull/70))
- ci: MAIR-295 Ajouter une checklist RGPD aux PR et des rappels d'échéances automatiques (#48) ([#48](https://github.com/mairie360/Bff_Template_Repo/pull/48))
- fix: MAIR-290 Détecter les données personnelles dans les journaux avec un test du marqueur (#45) ([#45](https://github.com/mairie360/Bff_Template_Repo/pull/45))
- feat: MAIR-262 Tests d'intégration - Tests de fonctionnement des APIs, tests métier des BFFs et tests de régression (#66) ([#66](https://github.com/mairie360/Bff_Template_Repo/pull/66))
- chore(ci): MAIR-571 Forward the release-journal inputs to CICD v4.3.1 (#60) ([#60](https://github.com/mairie360/Bff_Template_Repo/pull/60))
- chore(deps): update dependency mairie360/cicd to v4.3.1 (#62) ([#62](https://github.com/mairie360/Bff_Template_Repo/pull/62))
- chore(deps): update dependency mairie360/cicd to v4.3.0 (#61) ([#61](https://github.com/mairie360/Bff_Template_Repo/pull/61))
- feat: MAIR-504 Ajouter la télémétrie OpenTelemetry aux BFFs ([#50](https://github.com/mairie360/Bff_Template_Repo/pull/50))
- chore(deps): update dependency mairie360/cicd to v4.2.2 (#58) ([#58](https://github.com/mairie360/Bff_Template_Repo/pull/58))
- chore(deps): update dependency mairie360/cicd to v4.2.1 (#56) ([#56](https://github.com/mairie360/Bff_Template_Repo/pull/56))
- chore(deps): MAIR-529 APIs/BFFs - Renseigner le rôle dans le JWT et l'exposer aux BFF (#54) ([#54](https://github.com/mairie360/Bff_Template_Repo/pull/54))
- chore: MAIR-525 BFFs - Supprimer les appels en cascade et entre BFF, paralléliser, mettre en cache et relayer les messages en SSE (#52) ([#52](https://github.com/mairie360/Bff_Template_Repo/pull/52))
- chore(deps): update dependency mairie360/cicd to v4.2.0 (#43) ([#43](https://github.com/mairie360/Bff_Template_Repo/pull/43))
- chore(deps): update dependency mairie360/cicd to v4.1.1 (#42) ([#42](https://github.com/mairie360/Bff_Template_Repo/pull/42))
- chore(deps): update dependency mairie360/cicd to v4 (#32) ([#32](https://github.com/mairie360/Bff_Template_Repo/pull/32))
- refactor: MAIR-430 [Audit 02/10] Tous les BFFs : dérive entre template, bffs_lib et BFFs (code commun copié-collé) (#38) ([#38](https://github.com/mairie360/Bff_Template_Repo/pull/38))
- feat: MAIR-431 Fail fast on missing upstream configuration (#37) ([#37](https://github.com/mairie360/Bff_Template_Repo/pull/37))
- refactor: MAIR-429 [Audit 02/10] Tous les BFFs : unifier l'extraction du jeton dans bffs_lib (5 implémentations divergentes) (#36) ([#36](https://github.com/mairie360/Bff_Template_Repo/pull/36))
- chore(deps): update dependency @types/node to v24.19.1 (#30) ([#30](https://github.com/mairie360/Bff_Template_Repo/pull/30))

## Différence staging → prod (en staging, pas encore en prod)

_Rien._

> Résumé Claude indisponible pour ce passage : listes brutes des commits.

## Historique des passages

<!-- release-journal-history:start -->
| Date | Environnement | Version | Commit | Run |
| --- | --- | --- | --- | --- |
| 2026-11-12 11:43 UTC | dev | — | `0aa1727` | [run](https://github.com/mairie360/Bff_Template_Repo/actions/runs/43210740650) |
<!-- release-journal-history:end -->
