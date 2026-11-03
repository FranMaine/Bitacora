"""Genera los íconos de la app y las pantallas de carga (splash) a partir del escudo del club.

Uso: python scripts/generar-iconos.py   (requiere Pillow)
Salida: public/icons/*.png  (se commitean; no hace falta correr esto en el deploy).
"""
import os
from PIL import Image, ImageDraw, ImageFont

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SALIDA = os.path.join(RAIZ, "public", "icons")
os.makedirs(SALIDA, exist_ok=True)

logo = Image.open(os.path.join(RAIZ, "public", "cvsi.webp")).convert("RGBA")
logo = logo.crop(logo.getbbox())  # sin el margen transparente

CLARO = (246, 247, 248)  # mismo fondo que la app en modo claro
OSCURO = (11, 16, 19)  # y en modo oscuro
BLANCO = (255, 255, 255)
TINTA_CLARO = (20, 24, 28)
TINTA_OSCURO = (236, 240, 243)


def fuente(tam):
    for nombre in ("segoeuib.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"):
        for carpeta in ("C:/Windows/Fonts", "/usr/share/fonts/truetype/dejavu", "/Library/Fonts"):
            ruta = os.path.join(carpeta, nombre)
            if os.path.exists(ruta):
                return ImageFont.truetype(ruta, tam)
    return ImageFont.load_default()


def logo_ancho(ancho):
    alto = round(logo.height * ancho / logo.width)
    return logo.resize((ancho, alto), Image.LANCZOS)


def pegar_centrado(lienzo, imagen, cy):
    lienzo.alpha_composite(imagen, ((lienzo.width - imagen.width) // 2, round(cy - imagen.height / 2)))


def icono(lado, ancho_pct, fondo=BLANCO):
    lienzo = Image.new("RGBA", (lado, lado), fondo + (255,))
    pegar_centrado(lienzo, logo_ancho(round(lado * ancho_pct)), lado / 2)
    return lienzo.convert("RGB")


# --- íconos de la app
icono(192, 0.74).save(os.path.join(SALIDA, "icon-192.png"), optimize=True)
icono(512, 0.74).save(os.path.join(SALIDA, "icon-512.png"), optimize=True)
icono(512, 0.58).save(os.path.join(SALIDA, "icon-maskable-512.png"), optimize=True)  # entra en la zona segura circular
icono(180, 0.78).save(os.path.join(SALIDA, "apple-touch-icon.png"), optimize=True)  # iOS le pone las esquinas redondeadas

# --- favicon de la pestaña (sin fondo)
fav = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
pegar_centrado(fav, logo_ancho(60), 32)
fav.save(os.path.join(SALIDA, "favicon.png"), optimize=True)

# --- pantallas de carga de iOS: (ancho, alto) en píxeles y ancho/alto en puntos, con su factor de pixel
TELEFONOS = [
    (1320, 2868, 440, 956, 3),  # 16 Pro Max
    (1206, 2622, 402, 874, 3),  # 16 Pro
    (1290, 2796, 430, 932, 3),  # 14/15 Pro Max, 15 Plus
    (1179, 2556, 393, 852, 3),  # 14/15/16 y Pro
    (1284, 2778, 428, 926, 3),  # 12/13 Pro Max, 14 Plus
    (1170, 2532, 390, 844, 3),  # 12/13/14
    (1125, 2436, 375, 812, 3),  # X/XS/11 Pro, 12/13 mini
    (1242, 2688, 414, 896, 3),  # XS Max, 11 Pro Max
    (828, 1792, 414, 896, 2),  # XR, 11
    (1242, 2208, 414, 736, 3),  # 6/7/8 Plus
    (750, 1334, 375, 667, 2),  # 6/7/8, SE 2/3
    (640, 1136, 320, 568, 2),  # SE 1
]


def splash(ancho, alto, oscuro):
    fondo, tinta = (OSCURO, TINTA_OSCURO) if oscuro else (CLARO, TINTA_CLARO)
    lienzo = Image.new("RGBA", (ancho, alto), fondo + (255,))
    escudo = logo_ancho(round(ancho * 0.44))
    letra = fuente(round(ancho * 0.085))
    texto = "Bitácora"
    caja = ImageDraw.Draw(lienzo).textbbox((0, 0), texto, font=letra)
    texto_ancho, texto_alto = caja[2] - caja[0], caja[3] - caja[1]
    separacion = round(ancho * 0.07)
    conjunto = escudo.height + separacion + texto_alto
    arriba = alto * 0.46 - conjunto / 2  # apenas por encima del centro, como una pantalla de carga nativa
    pegar_centrado(lienzo, escudo, arriba + escudo.height / 2)
    ImageDraw.Draw(lienzo).text(
        ((ancho - texto_ancho) / 2 - caja[0], arriba + escudo.height + separacion - caja[1]), texto, font=letra, fill=tinta
    )
    return lienzo.convert("RGB")


for ancho, alto, _, _, _ in TELEFONOS:
    for oscuro in (False, True):
        splash(ancho, alto, oscuro).save(os.path.join(SALIDA, f"splash-{ancho}x{alto}{'-oscuro' if oscuro else ''}.png"), optimize=True)

print("listo:", len(os.listdir(SALIDA)), "archivos en public/icons")
