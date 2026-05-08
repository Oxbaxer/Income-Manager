# -*- coding: utf-8 -*-
"""
Génération du guide d'installation Income Manager pour débutants.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate
from reportlab.lib.colors import HexColor, white, black
import os

# ── Couleurs ───────────────────────────────────────────────────────────────────
C_BG        = HexColor("#0f1117")
C_SURFACE   = HexColor("#161b27")
C_PRIMARY   = HexColor("#6366f1")
C_PRIMARY_L = HexColor("#818cf8")
C_GREEN     = HexColor("#10b981")
C_AMBER     = HexColor("#f59e0b")
C_RED       = HexColor("#f43f5e")
C_CYAN      = HexColor("#22d3ee")
C_TEXT      = HexColor("#f1f5f9")
C_MUTED     = HexColor("#94a3b8")
C_BORDER    = HexColor("#2d3748")

C_STEP_BG   = HexColor("#1e2535")
C_INFO_BG   = HexColor("#1a1f35")
C_WARN_BG   = HexColor("#2a1f0e")
C_TIP_BG    = HexColor("#0e2a1f")
C_ERR_BG    = HexColor("#2a0e1a")

W, H = A4

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "guide-installation-income-manager.pdf")

# ── Styles ─────────────────────────────────────────────────────────────────────
def build_styles():
    styles = {}

    styles["title_main"] = ParagraphStyle(
        "title_main", fontName="Helvetica-Bold", fontSize=28,
        textColor=white, leading=34, alignment=TA_CENTER, spaceAfter=6
    )
    styles["title_sub"] = ParagraphStyle(
        "title_sub", fontName="Helvetica", fontSize=14,
        textColor=C_PRIMARY_L, leading=20, alignment=TA_CENTER, spaceAfter=4
    )
    styles["title_desc"] = ParagraphStyle(
        "title_desc", fontName="Helvetica", fontSize=11,
        textColor=C_MUTED, leading=16, alignment=TA_CENTER
    )
    styles["h1"] = ParagraphStyle(
        "h1", fontName="Helvetica-Bold", fontSize=20,
        textColor=C_PRIMARY_L, leading=26, spaceBefore=10, spaceAfter=6
    )
    styles["h2"] = ParagraphStyle(
        "h2", fontName="Helvetica-Bold", fontSize=14,
        textColor=white, leading=20, spaceBefore=8, spaceAfter=4
    )
    styles["h3"] = ParagraphStyle(
        "h3", fontName="Helvetica-Bold", fontSize=12,
        textColor=C_CYAN, leading=18, spaceBefore=6, spaceAfter=3
    )
    styles["body"] = ParagraphStyle(
        "body", fontName="Helvetica", fontSize=10.5,
        textColor=C_TEXT, leading=17, spaceAfter=5, alignment=TA_JUSTIFY
    )
    styles["body_center"] = ParagraphStyle(
        "body_center", fontName="Helvetica", fontSize=10.5,
        textColor=C_TEXT, leading=17, spaceAfter=5, alignment=TA_CENTER
    )
    styles["small"] = ParagraphStyle(
        "small", fontName="Helvetica", fontSize=9,
        textColor=C_MUTED, leading=14, spaceAfter=3
    )
    styles["code"] = ParagraphStyle(
        "code", fontName="Courier", fontSize=9.5,
        textColor=C_GREEN, leading=14, spaceAfter=2,
        leftIndent=0, backColor=HexColor("#0d1117")
    )
    styles["step_num"] = ParagraphStyle(
        "step_num", fontName="Helvetica-Bold", fontSize=16,
        textColor=C_PRIMARY, leading=20, alignment=TA_CENTER
    )
    styles["step_title"] = ParagraphStyle(
        "step_title", fontName="Helvetica-Bold", fontSize=12,
        textColor=white, leading=17, spaceAfter=2
    )
    styles["step_body"] = ParagraphStyle(
        "step_body", fontName="Helvetica", fontSize=10,
        textColor=C_TEXT, leading=15, spaceAfter=2, alignment=TA_JUSTIFY
    )
    styles["callout_title"] = ParagraphStyle(
        "callout_title", fontName="Helvetica-Bold", fontSize=10.5,
        textColor=white, leading=15, spaceAfter=2
    )
    styles["callout_body"] = ParagraphStyle(
        "callout_body", fontName="Helvetica", fontSize=10,
        textColor=C_TEXT, leading=15, alignment=TA_JUSTIFY
    )
    styles["toc_num"] = ParagraphStyle(
        "toc_num", fontName="Helvetica-Bold", fontSize=10,
        textColor=C_PRIMARY, leading=14
    )
    styles["toc_label"] = ParagraphStyle(
        "toc_label", fontName="Helvetica", fontSize=10,
        textColor=C_TEXT, leading=14
    )
    styles["toc_page"] = ParagraphStyle(
        "toc_page", fontName="Helvetica", fontSize=10,
        textColor=C_MUTED, leading=14, alignment=TA_CENTER
    )
    styles["glossary_term"] = ParagraphStyle(
        "glossary_term", fontName="Helvetica-Bold", fontSize=10.5,
        textColor=C_CYAN, leading=16, spaceBefore=4
    )
    styles["glossary_def"] = ParagraphStyle(
        "glossary_def", fontName="Helvetica", fontSize=10,
        textColor=C_TEXT, leading=15, leftIndent=12, alignment=TA_JUSTIFY
    )
    styles["footer"] = ParagraphStyle(
        "footer", fontName="Helvetica", fontSize=8,
        textColor=C_MUTED, leading=12, alignment=TA_CENTER
    )
    return styles


# ── Helpers ────────────────────────────────────────────────────────────────────

def hr(color=C_BORDER, thickness=0.5):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceAfter=6, spaceBefore=6)

def sp(h=6):
    return Spacer(1, h)

def callout(s, icon, title, body_text, bg_color, border_color):
    title_p = Paragraph(f"{icon}  {title}", s["callout_title"])
    body_p  = Paragraph(body_text, s["callout_body"])
    tbl = Table([[title_p], [body_p]], colWidths=[16*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0,0), (-1,-1), bg_color),
        ("LEFTPADDING",  (0,0), (-1,-1), 12),
        ("RIGHTPADDING", (0,0), (-1,-1), 12),
        ("TOPPADDING",   (0,0), (0,0),   10),
        ("BOTTOMPADDING",(0,-1),(-1,-1), 10),
        ("TOPPADDING",   (0,1), (-1,-1),  4),
        ("LINECOLOR",    (0,0),  (0,-1), border_color),
        ("LINEBEFORE",   (0,0),  (0,-1), 4, border_color),
        ("ROUNDEDCORNERS", [4]),
    ]))
    return tbl

def info(s, title, body):
    return callout(s, "ℹ", title, body, C_INFO_BG, C_PRIMARY)

def warning(s, title, body):
    return callout(s, "⚠", title, body, C_WARN_BG, C_AMBER)

def tip(s, title, body):
    return callout(s, "✅", title, body, C_TIP_BG, C_GREEN)

def danger(s, title, body):
    return callout(s, "🚫", title, body, C_ERR_BG, C_RED)

def step_block(s, number, title, lines):
    """Un bloc numéroté avec titre et contenu."""
    num_p   = Paragraph(str(number), s["step_num"])
    title_p = Paragraph(title, s["step_title"])
    body_p  = Paragraph(lines, s["step_body"])
    num_cell  = Table([[num_p]], colWidths=[1.2*cm],
                      rowHeights=[None])
    num_cell.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), C_PRIMARY),
        ("TOPPADDING",   (0,0),(-1,-1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ("LEFTPADDING",  (0,0),(-1,-1), 2),
        ("RIGHTPADDING", (0,0),(-1,-1), 2),
        ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
        ("ROUNDEDCORNERS",[4]),
    ]))
    content = Table([[title_p], [body_p]], colWidths=[14.3*cm])
    content.setStyle(TableStyle([
        ("TOPPADDING",   (0,0),(-1,-1), 4),
        ("BOTTOMPADDING",(0,-1),(-1,-1), 6),
        ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ("RIGHTPADDING", (0,0),(-1,-1), 8),
        ("BACKGROUND",   (0,0),(-1,-1), C_STEP_BG),
    ]))
    outer = Table([[num_cell, content]], colWidths=[1.2*cm, 14.3*cm])
    outer.setStyle(TableStyle([
        ("VALIGN",       (0,0),(-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
        ("ROUNDEDCORNERS",[4]),
    ]))
    return outer

def section_header(s, number, title):
    badge = Table([[Paragraph(f"Étape {number}", ParagraphStyle(
        "badge", fontName="Helvetica-Bold", fontSize=9,
        textColor=C_PRIMARY, leading=12, alignment=TA_CENTER
    ))]],  colWidths=[2.2*cm])
    badge.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), HexColor("#1e1f3a")),
        ("TOPPADDING",   (0,0),(-1,-1), 4),
        ("BOTTOMPADDING",(0,0),(-1,-1), 4),
        ("LEFTPADDING",  (0,0),(-1,-1), 6),
        ("RIGHTPADDING", (0,0),(-1,-1), 6),
        ("ROUNDEDCORNERS",[4]),
        ("BOX", (0,0),(-1,-1), 1, C_PRIMARY),
    ]))
    title_p = Paragraph(title, s["h1"])
    row = Table([[badge, title_p]], colWidths=[2.6*cm, 14*cm])
    row.setStyle(TableStyle([
        ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",  (0,0),(-1,-1), 0),
        ("RIGHTPADDING", (0,0),(-1,-1), 0),
        ("TOPPADDING",   (0,0),(-1,-1), 0),
        ("BOTTOMPADDING",(0,0),(-1,-1), 0),
    ]))
    return row

def code_block(s, lines):
    """Bloc de code sur fond sombre."""
    rows = [[Paragraph(line, s["code"])] for line in lines]
    tbl = Table(rows, colWidths=[16*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), HexColor("#0d1117")),
        ("LEFTPADDING",  (0,0),(-1,-1), 12),
        ("RIGHTPADDING", (0,0),(-1,-1), 12),
        ("TOPPADDING",   (0,0),(0,0),   10),
        ("BOTTOMPADDING",(0,-1),(-1,-1),10),
        ("TOPPADDING",   (0,1),(-1,-1), 2),
        ("BOTTOMPADDING",(0,0),(0,-2),  2),
        ("BOX", (0,0),(-1,-1), 1, C_BORDER),
        ("ROUNDEDCORNERS",[4]),
    ]))
    return tbl


# ── Page callbacks ─────────────────────────────────────────────────────────────

def page_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(C_BG)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Bande colorée en haut
    canvas.setFillColor(C_PRIMARY)
    canvas.rect(0, H - 4, W, 4, fill=1, stroke=0)
    # Numéro de page
    if doc.page > 1:
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(C_MUTED)
        canvas.drawCentredString(W / 2, 1.2*cm, f"Income Manager — Guide d'installation  |  Page {doc.page}")
        canvas.setStrokeColor(C_BORDER)
        canvas.setLineWidth(0.5)
        canvas.line(2*cm, 1.6*cm, W - 2*cm, 1.6*cm)
    canvas.restoreState()

def cover_background(canvas, doc):
    canvas.saveState()
    # Fond dégradé simulé par rectangles
    canvas.setFillColor(HexColor("#0a0c14"))
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Bande supérieure
    canvas.setFillColor(C_PRIMARY)
    canvas.rect(0, H - 6, W, 6, fill=1, stroke=0)
    # Grande zone colorée du haut
    canvas.setFillColor(HexColor("#12152a"))
    canvas.rect(0, H * 0.5, W, H * 0.5 - 6, fill=1, stroke=0)
    # Ligne décorative
    canvas.setStrokeColor(C_PRIMARY)
    canvas.setLineWidth(1)
    canvas.line(2*cm, H * 0.5, W - 2*cm, H * 0.5)
    canvas.restoreState()


# ── Contenu ────────────────────────────────────────────────────────────────────

def build_story(s):
    story = []

    # ── PAGE DE COUVERTURE ────────────────────────────────────────────────────
    story.append(Spacer(1, 3.5*cm))
    story.append(Paragraph("Income Manager", s["title_main"]))
    story.append(sp(6))
    story.append(Paragraph("Guide d'installation complet", s["title_sub"]))
    story.append(sp(4))
    story.append(Paragraph("À destination des utilisateurs sans connaissance technique particulière", s["title_desc"]))
    story.append(sp(1.5*cm))

    # Badges cover
    badge_data = [
        [
            Paragraph("🐳  Docker Desktop", ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=10, textColor=C_CYAN, leading=14, alignment=TA_CENTER)),
            Paragraph("🐙  GitHub", ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=10, textColor=C_GREEN, leading=14, alignment=TA_CENTER)),
            Paragraph("🖥  Windows 10/11", ParagraphStyle("b", fontName="Helvetica-Bold", fontSize=10, textColor=C_AMBER, leading=14, alignment=TA_CENTER)),
        ]
    ]
    badge_tbl = Table(badge_data, colWidths=[5*cm, 5*cm, 5*cm])
    badge_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(0,0), HexColor("#0e2233")),
        ("BACKGROUND",   (1,0),(1,0), HexColor("#0e2a1f")),
        ("BACKGROUND",   (2,0),(2,0), HexColor("#2a1f0e")),
        ("TOPPADDING",   (0,0),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("LEFTPADDING",  (0,0),(-1,-1), 6),
        ("RIGHTPADDING", (0,0),(-1,-1), 6),
        ("ROUNDEDCORNERS",[6]),
        ("ALIGN",        (0,0),(-1,-1), "CENTER"),
    ]))
    story.append(badge_tbl)
    story.append(sp(1.5*cm))

    story.append(Paragraph(
        "Ce document vous guide pas à pas depuis zéro, sans aucune connaissance "
        "technique requise. Chaque terme difficile est expliqué. Suivez les étapes "
        "dans l'ordre et vous aurez votre application fonctionnelle en moins de 30 minutes.",
        ParagraphStyle("cover_desc", fontName="Helvetica", fontSize=11,
                       textColor=C_MUTED, leading=18, alignment=TA_CENTER)
    ))
    story.append(sp(2*cm))

    # Encart temps estimé
    time_tbl = Table([[
        Paragraph("⏱  Temps estimé : 20 à 30 minutes", ParagraphStyle(
            "time", fontName="Helvetica-Bold", fontSize=11,
            textColor=C_GREEN, leading=16, alignment=TA_CENTER
        ))
    ]], colWidths=[12*cm])
    time_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), HexColor("#0e2a1f")),
        ("BOX",          (0,0),(-1,-1), 1.5, C_GREEN),
        ("TOPPADDING",   (0,0),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("ALIGN",        (0,0),(-1,-1), "CENTER"),
        ("ROUNDEDCORNERS",[6]),
    ]))
    story.append(time_tbl)

    story.append(Spacer(1, 3*cm))
    story.append(Paragraph("Mai 2026  —  Version 1.0", ParagraphStyle(
        "ver", fontName="Helvetica", fontSize=9, textColor=C_MUTED, alignment=TA_CENTER
    )))
    story.append(PageBreak())

    # ── TABLE DES MATIÈRES ────────────────────────────────────────────────────
    story.append(Paragraph("Table des matières", s["h1"]))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    toc = [
        ("Avant de commencer — Ce dont vous avez besoin", "3"),
        ("Étape 1 — Installer Docker Desktop", "4"),
        ("Étape 2 — Vérifier que Docker fonctionne", "6"),
        ("Étape 3 — Télécharger l'application depuis GitHub", "7"),
        ("Étape 4 — Configurer l'application", "9"),
        ("Étape 5 — Lancer l'application", "11"),
        ("Étape 6 — Créer votre compte", "12"),
        ("Utilisation quotidienne", "13"),
        ("Résolution des problèmes fréquents", "14"),
        ("Glossaire — Définition des termes techniques", "15"),
    ]
    for label, page in toc:
        row = Table([
            [Paragraph("●", ParagraphStyle("dot", fontName="Helvetica-Bold", fontSize=9, textColor=C_PRIMARY, leading=14)),
             Paragraph(label, s["toc_label"]),
             Paragraph(page, s["toc_page"])]
        ], colWidths=[0.5*cm, 13.5*cm, 2*cm])
        row.setStyle(TableStyle([
            ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
            ("TOPPADDING",   (0,0),(-1,-1), 5),
            ("BOTTOMPADDING",(0,0),(-1,-1), 5),
            ("LEFTPADDING",  (0,0),(-1,-1), 4),
            ("LINEBELOW",    (0,0),(-1,-1), 0.3, C_BORDER),
        ]))
        story.append(row)

    story.append(PageBreak())

    # ── AVANT DE COMMENCER ────────────────────────────────────────────────────
    story.append(Paragraph("Avant de commencer", s["h1"]))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "Avant d'installer l'application, vous avez besoin de deux logiciels sur votre ordinateur. "
        "Ne vous inquiétez pas, ils sont gratuits et faciles à installer — les étapes suivantes vous guident en détail.",
        s["body"]
    ))
    story.append(sp(8))

    req_data = [
        [
            Paragraph("🐳  Docker Desktop", ParagraphStyle("rh", fontName="Helvetica-Bold", fontSize=11, textColor=C_CYAN, leading=16)),
            Paragraph("🐙  Git", ParagraphStyle("rh", fontName="Helvetica-Bold", fontSize=11, textColor=C_GREEN, leading=16)),
        ],
        [
            Paragraph(
                "Docker est le programme qui va faire tourner Income Manager. "
                "Pensez-y comme à une «  boîte magique » qui contient tout ce dont l'application "
                "a besoin pour fonctionner, sans rien installer d'autre.",
                s["step_body"]
            ),
            Paragraph(
                "Git est l'outil qui vous permet de télécharger l'application depuis "
                "GitHub (le site où le code est stocké). C'est l'équivalent d'un "
                "gestionnaire de téléchargement pour les applications.",
                s["step_body"]
            ),
        ],
        [
            Paragraph("Gratuit · Site officiel : docker.com", s["small"]),
            Paragraph("Gratuit · Site officiel : git-scm.com", s["small"]),
        ]
    ]
    req_tbl = Table(req_data, colWidths=[8*cm, 8*cm])
    req_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(0,-1), HexColor("#0e2233")),
        ("BACKGROUND",   (1,0),(1,-1), HexColor("#0e2a1f")),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,-1),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-2), 4),
        ("LEFTPADDING",  (0,0),(-1,-1), 12),
        ("RIGHTPADDING", (0,0),(-1,-1), 12),
        ("VALIGN",       (0,0),(-1,-1), "TOP"),
        ("LINEAFTER",    (0,0),(0,-1), 1, C_BORDER),
        ("ROUNDEDCORNERS",[6]),
    ]))
    story.append(req_tbl)
    story.append(sp(10))

    story.append(info(s,
        "Configuration minimale requise",
        "Votre ordinateur doit tourner sous <b>Windows 10</b> ou <b>Windows 11</b> (64 bits). "
        "Il faut au minimum <b>4 Go de RAM</b> et <b>5 Go d'espace libre</b> sur votre disque dur. "
        "Une connexion Internet est nécessaire uniquement pour l'installation — l'application fonctionne ensuite hors ligne."
    ))
    story.append(PageBreak())

    # ── ÉTAPE 1 : DOCKER ─────────────────────────────────────────────────────
    story.append(section_header(s, 1, "Installer Docker Desktop"))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "Docker Desktop est le programme principal dont vous avez besoin. "
        "Suivez exactement les sous-étapes ci-dessous.",
        s["body"]
    ))
    story.append(sp(8))

    sub_steps = [
        ("1.1", "Ouvrir le site officiel de Docker",
         "Ouvrez votre navigateur internet (Chrome, Firefox, Edge…) et tapez dans la barre d'adresse : "
         "<b>https://www.docker.com/products/docker-desktop/</b> puis appuyez sur Entrée."),
        ("1.2", 'Cliquer sur "Download for Windows"',
         'Sur la page qui s\'affiche, cherchez un gros bouton bleu intitulé <b>"Download for Windows"</b>. '
         'Cliquez dessus. Un fichier appelé <b>Docker Desktop Installer.exe</b> va se télécharger '
         '(environ 500 Mo — cela peut prendre quelques minutes selon votre connexion).'),
        ("1.3", "Lancer l'installeur",
         'Une fois le téléchargement terminé, ouvrez votre dossier <b>Téléchargements</b> et '
         'double-cliquez sur le fichier <b>Docker Desktop Installer.exe</b>. '
         'Windows peut vous demander : "Voulez-vous autoriser cette application à apporter des modifications ?". '
         'Cliquez <b>Oui</b>.'),
        ("1.4", "Suivre l'assistant d'installation",
         "L'assistant d'installation s'ouvre. <b>Laissez toutes les options cochées par défaut</b> "
         "et cliquez sur <b>OK</b>, puis sur <b>Installer</b>. L'installation dure 2 à 5 minutes. "
         "Une fois terminée, cliquez sur <b>Close</b>."),
        ("1.5", "Redémarrer l'ordinateur",
         "Docker peut vous demander de redémarrer votre ordinateur. <b>Redémarrez-le</b>. "
         "C'est une étape obligatoire — l'application ne fonctionnera pas correctement sans ce redémarrage."),
        ("1.6", "Lancer Docker Desktop",
         "Après le redémarrage, cherchez <b>Docker Desktop</b> dans le menu Démarrer de Windows "
         "(cliquez sur le bouton Windows en bas à gauche et tapez « Docker »). "
         "Cliquez dessus pour lancer l'application."),
        ("1.7", "Accepter les conditions d'utilisation",
         "Au premier lancement, Docker vous présente ses conditions d'utilisation. "
         'Cliquez sur <b>"Accept"</b> pour continuer. '
         "Docker va ensuite démarrer — vous verrez une animation de chargement."),
    ]
    for num, title, body in sub_steps:
        story.append(step_block(s, num, title, body))
        story.append(sp(6))

    story.append(sp(4))
    story.append(warning(s,
        "Docker est lent au premier démarrage",
        "Le tout premier lancement de Docker Desktop peut prendre <b>2 à 5 minutes</b>. "
        "Vous verrez une petite icône de baleine (🐳) dans la barre des tâches en bas à droite de l'écran. "
        "Attendez qu'elle arrête de s'animer avant de passer à l'étape suivante."
    ))
    story.append(PageBreak())

    # ── ÉTAPE 2 : VÉRIFICATION DOCKER ────────────────────────────────────────
    story.append(section_header(s, 2, "Vérifier que Docker fonctionne"))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "Avant d'aller plus loin, vérifiez que Docker est bien installé et opérationnel.",
        s["body"]
    ))
    story.append(sp(8))

    story.append(step_block(s, "2.1", "Ouvrir le Terminal Windows (PowerShell)",
        'Appuyez simultanément sur les touches <b>Windows + X</b> (la touche avec le logo Windows, '
        'en bas à gauche de votre clavier, et la touche X). '
        'Dans le menu qui apparaît, cliquez sur <b>"Terminal Windows"</b> ou <b>"PowerShell"</b>. '
        'Une fenêtre noire ou bleu foncé s\'ouvre — c\'est tout à fait normal.'))
    story.append(sp(6))

    story.append(step_block(s, "2.2", "Taper la commande de vérification",
        "Dans cette fenêtre noire, tapez exactement la commande suivante et appuyez sur <b>Entrée</b> :"))
    story.append(sp(4))
    story.append(code_block(s, ["docker --version"]))
    story.append(sp(6))

    story.append(step_block(s, "2.3", "Lire le résultat",
        'Si Docker est bien installé, vous devriez voir apparaître quelque chose comme : '
        '<b>Docker version 25.0.3, build 4debf41</b> '
        '(le numéro exact peut être différent, c\'est normal). '
        'Si c\'est le cas : tout est bon, passez à l\'étape suivante !'))
    story.append(sp(8))

    story.append(tip(s,
        "Que faire si une erreur s'affiche ?",
        "Si le texte affiché contient les mots « not recognized » ou « n'est pas reconnu », "
        "cela signifie que Docker n'est pas encore démarré. "
        "Vérifiez que l'icône Docker (🐳) est bien présente dans la barre des tâches et qu'elle ne s'anime plus. "
        "Attendez encore une minute, puis recommencez."
    ))
    story.append(PageBreak())

    # ── ÉTAPE 3 : TÉLÉCHARGEMENT ──────────────────────────────────────────────
    story.append(section_header(s, 3, "Télécharger l'application depuis GitHub"))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "L'application est stockée sur GitHub, un site web qui héberge des logiciels. "
        "Nous allons utiliser Git pour la télécharger proprement.",
        s["body"]
    ))
    story.append(sp(8))

    story.append(Paragraph("3-A  Installer Git", s["h2"]))
    story.append(sp(4))

    git_steps = [
        ("3.1", "Télécharger Git",
         "Ouvrez votre navigateur et allez sur : <b>https://git-scm.com/download/win</b>. "
         "Le téléchargement démarrera automatiquement. Si ce n'est pas le cas, "
         'cliquez sur le lien "Click here to download". '
         "Vous obtiendrez un fichier du type <b>Git-2.xx.x-64-bit.exe</b>."),
        ("3.2", "Installer Git",
         "Double-cliquez sur le fichier téléchargé. Cliquez <b>Oui</b> si Windows demande confirmation. "
         "<b>Cliquez simplement sur Next/Suivant à chaque écran</b> sans rien modifier — "
         "les options par défaut sont parfaites pour notre usage. "
         "Cliquez enfin sur <b>Install</b>, puis sur <b>Finish</b>."),
    ]
    for num, title, body in git_steps:
        story.append(step_block(s, num, title, body))
        story.append(sp(6))

    story.append(sp(4))
    story.append(Paragraph("3-B  Télécharger Income Manager", s["h2"]))
    story.append(sp(4))

    dl_steps = [
        ("3.3", "Choisir un emplacement pour l'application",
         "Décidez où vous souhaitez installer l'application sur votre ordinateur. "
         "Par exemple : <b>C:\\Applications\\</b> ou votre <b>Bureau</b>. "
         "Si le dossier n'existe pas, créez-le (clic droit sur le Bureau → Nouveau → Dossier)."),
        ("3.4", "Ouvrir le Terminal dans ce dossier",
         "Maintenez la touche <b>Shift (⇧)</b> et faites un <b>clic droit</b> dans votre dossier. "
         'Dans le menu contextuel, cliquez sur <b>"Ouvrir la fenêtre PowerShell ici"</b> '
         'ou <b>"Ouvrir dans le Terminal"</b>. '
         "Une fenêtre noire s'ouvre, positionnée dans votre dossier."),
        ("3.5", "Télécharger (cloner) l'application",
         "Tapez exactement la commande suivante dans le terminal et appuyez sur <b>Entrée</b> :"),
    ]
    for num, title, body in dl_steps:
        story.append(step_block(s, num, title, body))
        story.append(sp(6))

    story.append(code_block(s, ["git clone https://github.com/Oxbaxer/Income-Manager.git"]))
    story.append(sp(8))

    story.append(Paragraph(
        "<b>Que se passe-t-il ?</b> Git va télécharger tous les fichiers de l'application. "
        "Vous verrez du texte défiler dans le terminal, c'est normal. "
        "Une fois terminé, un nouveau dossier <b>Income-Manager</b> aura été créé à l'emplacement choisi.",
        s["body"]
    ))
    story.append(sp(6))

    story.append(info(s,
        "Qu'est-ce que « cloner » ?",
        "« Cloner » un dépôt GitHub signifie simplement <b>télécharger une copie complète</b> "
        "de l'application sur votre ordinateur. Le mot « cloner » vient du vocabulaire des développeurs "
        "mais c'est exactement la même chose que télécharger un fichier zip et l'extraire — "
        "en plus pratique, car les mises à jour futures seront plus faciles à récupérer."
    ))
    story.append(PageBreak())

    # ── ÉTAPE 4 : CONFIGURATION ───────────────────────────────────────────────
    story.append(section_header(s, 4, "Configurer l'application"))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "L'application a besoin d'un fichier de configuration contenant des clés secrètes "
        "pour sécuriser vos données. Ne vous inquiétez pas, c'est très simple à faire.",
        s["body"]
    ))
    story.append(sp(8))

    conf_steps_a = [
        ("4.1", "Se déplacer dans le dossier de l'application",
         "Dans votre terminal (toujours ouvert), tapez la commande suivante et appuyez sur <b>Entrée</b> :"),
    ]
    for num, title, body in conf_steps_a:
        story.append(step_block(s, num, title, body))
        story.append(sp(4))

    story.append(code_block(s, ["cd Income-Manager"]))
    story.append(sp(6))

    story.append(Paragraph(
        "<b>Explication :</b> La commande <b>cd</b> signifie « Change Directory » (changer de dossier). "
        "Vous entrez dans le dossier Income-Manager que Git vient de créer.",
        s["small"]
    ))
    story.append(sp(10))

    story.append(step_block(s, "4.2", "Créer le fichier de configuration",
        "Tapez la commande suivante pour créer votre fichier de configuration à partir du modèle fourni :"))
    story.append(sp(4))
    story.append(code_block(s, ["copy .env.example .env"]))
    story.append(sp(6))

    story.append(Paragraph(
        "<b>Explication :</b> Le fichier <b>.env</b> (prononcé « point env ») est un fichier de "
        "configuration qui contient des paramètres secrets. Le fichier <b>.env.example</b> est "
        "le modèle vide fourni avec l'application. Vous venez d'en faire une copie.",
        s["small"]
    ))
    story.append(sp(10))

    story.append(step_block(s, "4.3", "Ouvrir le fichier de configuration",
        "Ouvrez le fichier .env avec le Bloc-notes Windows. Tapez cette commande :"))
    story.append(sp(4))
    story.append(code_block(s, ["notepad .env"]))
    story.append(sp(6))

    story.append(Paragraph(
        "Le Bloc-notes s'ouvre avec un contenu ressemblant à ceci :",
        s["body"]
    ))
    story.append(sp(4))
    story.append(code_block(s, [
        "JWT_SECRET=remplacez_par_une_chaine_aleatoire_longue",
        "JWT_REFRESH_SECRET=remplacez_par_une_autre_chaine_aleatoire",
        "PORT=3001",
        "DATABASE_PATH=./data/income-manager.db",
        "NODE_ENV=production",
    ]))
    story.append(sp(10))

    story.append(step_block(s, "4.4", "Renseigner les clés secrètes",
        "Vous devez remplacer les deux valeurs <b>JWT_SECRET</b> et <b>JWT_REFRESH_SECRET</b> "
        "par des suites de caractères aléatoires longues. Ces clés servent à <b>sécuriser "
        "vos connexions</b> — personne ne peut les deviner."))
    story.append(sp(8))

    story.append(Paragraph(
        "<b>Comment créer une clé sécurisée facilement ?</b>",
        s["h3"]
    ))
    story.append(Paragraph(
        "Rendez-vous sur le site <b>https://passwordsgenerator.net/</b> et générez un mot de passe "
        "de 40 caractères minimum avec lettres, chiffres et symboles. Copiez-le et collez-le "
        "à la place de <i>remplacez_par_une_chaine_aleatoire_longue</i>. "
        "Faites de même pour la deuxième clé (générez-en une différente).",
        s["body"]
    ))
    story.append(sp(6))

    story.append(Paragraph("Votre fichier .env devrait ressembler à ceci (vos clés seront différentes) :", s["body"]))
    story.append(sp(4))
    story.append(code_block(s, [
        "JWT_SECRET=aK9#mP2$xL5vQ8nR3jF7wY1bH6eD4cZ0",
        "JWT_REFRESH_SECRET=tG8!uN5$oI2pA9#sM6kW3yE1dB4xC7",
        "PORT=3001",
        "DATABASE_PATH=./data/income-manager.db",
        "NODE_ENV=production",
    ]))
    story.append(sp(6))

    story.append(step_block(s, "4.5", "Sauvegarder le fichier",
        "Dans le Bloc-notes, cliquez sur <b>Fichier → Enregistrer</b> (ou appuyez sur Ctrl + S). "
        "Fermez ensuite le Bloc-notes."))
    story.append(sp(8))

    story.append(danger(s,
        "Ne partagez jamais votre fichier .env",
        "Le fichier .env contient des clés secrètes. Ne l'envoyez jamais par email, "
        "ne le publiez pas sur Internet et ne le partagez pas. "
        "Si quelqu'un y accède, il pourrait se connecter à votre application."
    ))
    story.append(PageBreak())

    # ── ÉTAPE 5 : LANCEMENT ───────────────────────────────────────────────────
    story.append(section_header(s, 5, "Lancer l'application"))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "C'est le grand moment ! Assurez-vous que Docker Desktop est bien démarré "
        "(icône 🐳 visible dans la barre des tâches), puis suivez ces étapes.",
        s["body"]
    ))
    story.append(sp(8))

    launch_steps = [
        ("5.1", "Vérifier que vous êtes dans le bon dossier",
         "Dans votre terminal, tapez la commande suivante pour voir où vous êtes :"),
    ]
    for num, title, body in launch_steps:
        story.append(step_block(s, num, title, body))
        story.append(sp(4))

    story.append(code_block(s, ["pwd"]))
    story.append(sp(4))
    story.append(Paragraph(
        "Le terminal doit afficher un chemin se terminant par <b>Income-Manager</b>. "
        "Si ce n'est pas le cas, retapez : <b>cd Income-Manager</b>",
        s["small"]
    ))
    story.append(sp(8))

    story.append(step_block(s, "5.2", "Lancer Income Manager",
        "Tapez la commande suivante et appuyez sur Entrée. "
        "<b>C'est la seule commande dont vous aurez besoin à chaque démarrage !</b>"))
    story.append(sp(4))
    story.append(code_block(s, ["docker compose up -d"]))
    story.append(sp(6))

    story.append(Paragraph(
        "<b>Que se passe-t-il ?</b> Docker va télécharger les composants de l'application "
        "(uniquement la première fois, cela peut prendre 3 à 5 minutes). "
        "Lors des lancements suivants, l'application démarre en moins de 10 secondes. "
        "Vous verrez du texte s'afficher, et finalement le message <b>Started</b> apparaître.",
        s["body"]
    ))
    story.append(sp(8))

    story.append(step_block(s, "5.3", "Ouvrir l'application dans le navigateur",
        "Ouvrez votre navigateur internet et tapez dans la barre d'adresse :"))
    story.append(sp(4))
    story.append(code_block(s, ["http://localhost"]))
    story.append(sp(6))

    story.append(Paragraph(
        "La page d'accueil d'Income Manager doit s'afficher. "
        "Si vous voyez une page blanche ou une erreur, attendez 30 secondes et rafraîchissez la page "
        "(touche F5).",
        s["body"]
    ))
    story.append(sp(6))

    story.append(tip(s,
        "Mettez la page en favori !",
        "Une fois l'application ouverte, ajoutez <b>http://localhost</b> dans vos favoris "
        "(Ctrl+D dans la plupart des navigateurs). "
        "Ainsi, vous n'aurez plus besoin de retaper l'adresse à chaque fois."
    ))
    story.append(PageBreak())

    # ── ÉTAPE 6 : CRÉATION COMPTE ─────────────────────────────────────────────
    story.append(section_header(s, 6, "Créer votre compte"))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "Lors du tout premier lancement, l'application vous invite à créer votre espace familial "
        "(appelé « foyer ») et votre compte administrateur.",
        s["body"]
    ))
    story.append(sp(8))

    account_steps = [
        ("6.1", 'Cliquer sur "Créer un foyer"',
         'Sur la page d\'accueil, cliquez sur le bouton <b>"Créer un foyer"</b>. '
         'Un formulaire d\'inscription apparaît.'),
        ("6.2", "Remplir le formulaire d'inscription",
         "Renseignez les informations demandées :<br/>"
         "• <b>Nom du foyer</b> : le nom de votre famille (ex. « Famille Dupont »)<br/>"
         "• <b>Votre prénom</b> : votre prénom<br/>"
         "• <b>Email</b> : votre adresse email (elle servira d'identifiant)<br/>"
         "• <b>Mot de passe</b> : choisissez un mot de passe sécurisé (8 caractères minimum)"),
        ("6.3", "Valider la création",
         'Cliquez sur <b>"Créer le foyer"</b>. Vous êtes automatiquement connecté '
         'et redirigé vers votre tableau de bord. '
         'Vous êtes maintenant <b>administrateur</b> de votre foyer.'),
        ("6.4", "Inviter d'autres membres (optionnel)",
         'Si vous souhaitez que d\'autres membres de votre famille accèdent à l\'application, '
         'allez dans <b>⚙ Paramètres → Membres du foyer → + Inviter un membre</b>. '
         'Renseignez leur nom, email, un mot de passe provisoire et leur rôle.'),
    ]
    for num, title, body in account_steps:
        story.append(step_block(s, num, title, body))
        story.append(sp(6))

    story.append(sp(4))
    story.append(tip(s,
        "Félicitations ! L'application est prête.",
        "Vous pouvez maintenant commencer à saisir vos revenus et dépenses. "
        "L'application tourne entièrement sur votre ordinateur — vos données restent chez vous, "
        "rien n'est envoyé sur Internet."
    ))
    story.append(PageBreak())

    # ── UTILISATION QUOTIDIENNE ───────────────────────────────────────────────
    story.append(Paragraph("Utilisation quotidienne", s["h1"]))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "Une fois l'installation terminée, voici comment utiliser Income Manager au jour le jour.",
        s["body"]
    ))
    story.append(sp(8))

    story.append(Paragraph("Démarrer l'application", s["h2"]))
    daily_data = [
        ["Action", "Comment faire"],
        ["Démarrer\nIncome Manager",
         "1. Assurez-vous que Docker Desktop est lancé (icône 🐳 dans la barre des tâches)\n"
         "2. Ouvrez votre navigateur et allez sur http://localhost\n"
         "   OU ouvrez un terminal dans le dossier Income-Manager et tapez :\n"
         "   docker compose up -d"],
        ["Arrêter\nIncome Manager",
         "Dans un terminal dans le dossier Income-Manager, tapez :\n"
         "docker compose down\n"
         "Cela arrête l'application proprement sans perdre vos données."],
        ["Démarrage\nautomatique",
         "Dans Docker Desktop → Settings → General, cochez :\n"
         "\"Start Docker Desktop when you log in\"\n"
         "L'application démarrera automatiquement à chaque ouverture de session Windows."],
        ["Mettre à jour\nl'application",
         "Dans un terminal dans le dossier Income-Manager, tapez ces 3 commandes :\n"
         "git pull\n"
         "docker compose down\n"
         "docker compose up -d --build"],
        ["Sauvegarder\nvos données",
         "Allez dans ⚙ Paramètres → Export / Import → Exporter JSON.\n"
         "Un fichier .json est téléchargé. Conservez-le en lieu sûr (clé USB, cloud...)."],
    ]
    daily_tbl = Table(daily_data, colWidths=[4*cm, 12*cm])
    daily_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,0), C_PRIMARY),
        ("TEXTCOLOR",    (0,0),(-1,0), white),
        ("FONTNAME",     (0,0),(-1,0), "Helvetica-Bold"),
        ("FONTSIZE",     (0,0),(-1,0), 10),
        ("BACKGROUND",   (0,1),(-1,-1), C_STEP_BG),
        ("BACKGROUND",   (0,2),(-1,2), HexColor("#1a2030")),
        ("BACKGROUND",   (0,4),(-1,4), HexColor("#1a2030")),
        ("FONTNAME",     (0,1),(0,-1), "Helvetica-Bold"),
        ("FONTSIZE",     (0,1),(-1,-1), 9),
        ("FONTNAME",     (1,1),(1,-1), "Courier"),
        ("TEXTCOLOR",    (0,1),(0,-1), C_CYAN),
        ("TEXTCOLOR",    (1,1),(1,-1), C_TEXT),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ("RIGHTPADDING", (0,0),(-1,-1), 10),
        ("VALIGN",       (0,0),(-1,-1), "MIDDLE"),
        ("GRID",         (0,0),(-1,-1), 0.5, C_BORDER),
        ("ROUNDEDCORNERS",[4]),
    ]))
    story.append(daily_tbl)
    story.append(PageBreak())

    # ── RÉSOLUTION PROBLÈMES ──────────────────────────────────────────────────
    story.append(Paragraph("Résolution des problèmes fréquents", s["h1"]))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    problems = [
        ("❌  « http://localhost » n'affiche rien",
         "1. Vérifiez que Docker Desktop est bien lancé (icône 🐳 dans la barre des tâches).<br/>"
         "2. Ouvrez un terminal dans le dossier Income-Manager et tapez : <b>docker compose ps</b><br/>"
         "3. Les deux lignes affichées doivent avoir le statut <b>Up</b>.<br/>"
         "4. Attendez 30 secondes et rafraîchissez la page (F5).",
         C_ERR_BG, C_RED),
        ("❌  Erreur lors de « docker compose up -d »",
         "Vérifiez que Docker Desktop est bien démarré. Attendez que l'animation de la baleine s'arrête. "
         "Relancez la commande.<br/>Si l'erreur persiste, tapez <b>docker compose down</b> puis "
         "réessayez <b>docker compose up -d</b>.",
         C_ERR_BG, C_RED),
        ("❌  « git » n'est pas reconnu comme commande",
         "Git n'est pas installé ou le terminal n'a pas été relancé après l'installation. "
         "<b>Fermez et rouvrez</b> votre terminal PowerShell, puis réessayez.",
         C_ERR_BG, C_RED),
        ("⚠  J'ai oublié mon mot de passe",
         "L'application ne dispose pas de système de récupération par email. "
         "Un administrateur doit créer un nouveau compte pour vous depuis "
         "<b>⚙ Paramètres → Membres du foyer → + Inviter un membre</b>.",
         C_WARN_BG, C_AMBER),
        ("⚠  L'application est lente",
         "Au premier lancement après l'installation, Docker télécharge les images (environ 500 Mo). "
         "C'est normal. Les démarrages suivants sont beaucoup plus rapides (< 10 secondes).",
         C_WARN_BG, C_AMBER),
        ("✅  Réinstallation complète",
         "Pour tout effacer et recommencer :<br/>"
         "1. Tapez : <b>docker compose down</b><br/>"
         "2. Supprimez le dossier <b>backend/data</b> dans le dossier Income-Manager<br/>"
         "3. Tapez : <b>docker compose up -d</b><br/>"
         "L'application repart comme neuve.",
         C_TIP_BG, C_GREEN),
    ]
    for title, body, bg, border in problems:
        t_p = Paragraph(title, ParagraphStyle("pt", fontName="Helvetica-Bold", fontSize=10.5, textColor=white, leading=15))
        b_p = Paragraph(body, s["callout_body"])
        tbl = Table([[t_p], [b_p]], colWidths=[16*cm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND",   (0,0),(-1,-1), bg),
            ("LEFTPADDING",  (0,0),(-1,-1), 12),
            ("RIGHTPADDING", (0,0),(-1,-1), 12),
            ("TOPPADDING",   (0,0),(0,0),   10),
            ("BOTTOMPADDING",(0,-1),(-1,-1), 10),
            ("TOPPADDING",   (0,1),(-1,-1), 4),
            ("LINEBEFORE",   (0,0),(0,-1), 4, border),
            ("ROUNDEDCORNERS",[4]),
        ]))
        story.append(tbl)
        story.append(sp(6))

    story.append(PageBreak())

    # ── GLOSSAIRE ─────────────────────────────────────────────────────────────
    story.append(Paragraph("Glossaire — Définition des termes techniques", s["h1"]))
    story.append(hr(C_PRIMARY, 1))
    story.append(sp(6))

    story.append(Paragraph(
        "Voici les définitions simples de tous les termes techniques utilisés dans ce guide.",
        s["body"]
    ))
    story.append(sp(8))

    terms = [
        ("Terminal / PowerShell",
         "Fenêtre noire ou bleu foncé permettant de taper des commandes texte. "
         "C'est l'équivalent d'une interface de contrôle pour votre ordinateur. "
         "Vous l'ouvrez avec Windows + X → Terminal Windows."),
        ("Docker",
         "Logiciel qui crée des « conteneurs » — des mini-ordinateurs virtuels isolés "
         "qui contiennent tout ce dont une application a besoin pour fonctionner. "
         "Grâce à Docker, Income Manager fonctionne sans installation compliquée."),
        ("Docker Desktop",
         "L'interface graphique (fenêtre avec boutons) qui vous permet de gérer Docker sur Windows. "
         "C'est le programme que vous installez à l'Étape 1."),
        ("Conteneur (Container)",
         "Boîte virtuelle créée par Docker qui contient une application et tout son environnement. "
         "Income Manager utilise deux conteneurs : un pour le serveur (backend) et un pour l'interface (frontend)."),
        ("GitHub",
         "Site web (github.com) où les développeurs stockent et partagent leur code. "
         "C'est là qu'est hébergé Income Manager. Vous n'avez pas besoin de compte GitHub pour l'utiliser."),
        ("Git",
         "Logiciel qui permet de télécharger et gérer des projets hébergés sur GitHub. "
         "La commande git clone télécharge une copie du projet sur votre ordinateur."),
        ("Cloner (git clone)",
         "Télécharger une copie complète d'un projet depuis GitHub sur votre ordinateur. "
         "Équivalent d'un téléchargement+extraction de fichier zip."),
        ("Repository / Dépôt",
         "Dossier de projet stocké sur GitHub, contenant tous les fichiers d'une application. "
         "Le dépôt d'Income Manager est à l'adresse github.com/Oxbaxer/Income-Manager."),
        (".env (fichier d'environnement)",
         "Fichier texte spécial contenant des paramètres de configuration sensibles "
         "(comme des mots de passe ou des clés secrètes). Ce fichier ne doit jamais être partagé."),
        ("JWT (JSON Web Token)",
         "Système de sécurité qui génère des « badges » numériques temporaires pour vérifier "
         "votre identité lors de vos connexions. JWT_SECRET est la clé qui signe ces badges."),
        ("localhost",
         "Adresse spéciale (http://localhost) qui désigne votre propre ordinateur. "
         "Taper http://localhost dans votre navigateur ouvre une application qui tourne "
         "localement sur votre machine — pas sur Internet."),
        ("Port",
         "Numéro de « porte » sur votre ordinateur permettant à plusieurs services "
         "de coexister. Income Manager utilise le port 80 (port standard du web) "
         "et le port 3001 en interne pour son serveur."),
        ("docker compose up -d",
         "Commande pour démarrer Income Manager. "
         "« compose » signifie qu'on démarre plusieurs conteneurs ensemble. "
         "« -d » signifie « en arrière-plan » (detached), "
         "l'application tourne sans bloquer votre terminal."),
        ("docker compose down",
         "Commande pour arrêter Income Manager proprement. "
         "Vos données sont préservées."),
        ("Backend / Frontend",
         "Le backend est la partie « serveur » invisible de l'application (traitement des données). "
         "Le frontend est l'interface visible dans votre navigateur (boutons, graphiques…). "
         "Income Manager a les deux."),
        ("SQLite",
         "Système de base de données léger qui stocke toutes vos données financières "
         "dans un seul fichier sur votre ordinateur (income-manager.db). "
         "Pas besoin de serveur de base de données séparé."),
    ]
    for term, definition in terms:
        story.append(Paragraph(term, s["glossary_term"]))
        story.append(Paragraph(definition, s["glossary_def"]))
        story.append(hr(C_BORDER, 0.3))

    story.append(sp(12))

    # Footer final
    footer_tbl = Table([[
        Paragraph(
            "Income Manager v1.0  —  Guide d'installation pour utilisateurs débutants  —  Mai 2026<br/>"
            "Application disponible sur : github.com/Oxbaxer/Income-Manager",
            s["footer"]
        )
    ]], colWidths=[16*cm])
    footer_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), C_STEP_BG),
        ("TOPPADDING",   (0,0),(-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("ALIGN",        (0,0),(-1,-1), "CENTER"),
        ("ROUNDEDCORNERS",[4]),
    ]))
    story.append(footer_tbl)

    return story


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    doc = BaseDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        leftMargin=2*cm,
        rightMargin=2*cm,
        topMargin=2.5*cm,
        bottomMargin=2.5*cm,
    )

    frame = Frame(
        doc.leftMargin, doc.bottomMargin,
        doc.width, doc.height,
        id="normal"
    )

    cover_template = PageTemplate(id="cover",  frames=[frame], onPage=cover_background)
    main_template  = PageTemplate(id="main",   frames=[frame], onPage=page_background)
    doc.addPageTemplates([cover_template, main_template])

    s = build_styles()
    story = build_story(s)

    # Forcer le template principal à partir de la page 2
    from reportlab.platypus import NextPageTemplate
    story.insert(1, NextPageTemplate("main"))

    doc.build(story)
    print(f"PDF généré : {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
