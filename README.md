# Anismama
[anime-sama](https://anime-sama.fr) wrapper for scans only
> ⚠️ Projet personnel, non officiel et non affilié à [anime-sama](https://anime-sama.fr) : la qualité du code et le bon fonctionnement ne sont pas garantis

> Le visionnage d'animes n'est pas disponible, seulement les scans

## Fonctionnalités
- Création de comptes
- Enregistrement automatique de la progression
- Mise en favoris de mangas, note et commentaire + mangas similaires
- Recherche de mangas (+ filtre par genre et recherche rapide)
- Système de recommandation
- Interface responsive et propre
- Personnalisation de l'interface de lecture
- Tous les mangas d'anime-sama sont normalement disponibles

## Installation
```bash
git clone https://github.com/SteveBloX/anismama.git
cd anismama
npm install
npx prisma db push
```
### Configuration
Renommez le fichier `.env.example` en `.env` et modifiez la variable `SESSION_SECRET` avec une chaîne de caractères aléatoire

**Exemple**:
```dotenv
DATABASE_URL="file:./dev.db"
SESSION_SECRET="FDBF87G49BNF0SHF09SN490FH4S094"
```

## Démarrage
```bash
npm run build
npm start
```