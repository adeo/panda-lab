---
layout: page
title: Deploy to firebase
permalink: /firebase/
---
# Deploy to firebase

Pandaba est basé sur [firebase](https://firebase.google.com/) afin de proposer une solution facile à mettre en place. Les différents services utilisés sont les suivants : 
* Authentification
* Firestore
* Storage
* Functions

## Authentification
Firebase Authentification va permettre de créer des comptes utilisateurs ainsi que des comptes techniques utilisés par des agents mobile ou desktop.

## Firestore
Firestore va contenir l'ensemble des données afin d'indexer les différentes applications, jobs de tests, rapports de tests, informations utilisateurs etc...

## Storage
Firebase Storage va contenir l'ensemble des apks qui seront utilisés par les agents desktop. Les rapports de tests seront également uploadés, ainsi que les screenshots correspondant.

## Functions
Firebase Functions va être à l'écoute d'un ensemble d'événements comme la création d'une nouvelle application, l'upload d'un test, le changement de statut d'un téléphone etc...

## Create firebase project



```bash
firebase use [PROJECT NAME]
```

```bash
firebase deploy
```

This is the base Jekyll theme. You can find out more info about customizing your Jekyll theme, as well as basic Jekyll usage documentation at [jekyllrb.com](https://jekyllrb.com/)

You can find the source code for Minima at GitHub:
[jekyll][jekyll-organization] /
[minima](https://github.com/jekyll/minima)

You can find the source code for Jekyll at GitHub:
[jekyll][jekyll-organization] /
[jekyll](https://github.com/jekyll/jekyll)


[jekyll-organization]: https://github.com/jekyll

[firebase](https://firebase.google.com/)
