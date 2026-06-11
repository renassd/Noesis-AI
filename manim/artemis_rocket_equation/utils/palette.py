"""
Shared color palette for the "Artemis II - Ideal Rocket Equation" project.

Keeping every color in one place guarantees that a given physical quantity
(e.g. the rocket mass M, or the exhaust velocity v) is always drawn with the
same color across every scene -- a key trick used by 3Blue1Brown-style videos
to build visual intuition for an equation.
"""

from manim import ManimColor

# ---------------------------------------------------------------------------
# Backgrounds / environment
# ---------------------------------------------------------------------------
SPACE_BG = ManimColor("#070912")        # deep space navy (replaces pure black)
SPACE_BG_LIGHT = ManimColor("#0E1326")  # slightly lighter panel background
GRID_LINE = ManimColor("#1B2238")       # faint background grid / formula texture
STAR_COLOR = ManimColor("#FFFFFF")

# ---------------------------------------------------------------------------
# Astronomical bodies
# ---------------------------------------------------------------------------
EARTH_BLUE = ManimColor("#2E86DE")
EARTH_GREEN = ManimColor("#27AE60")
EARTH_CLOUD = ManimColor("#F4F6F7")
MOON_GRAY = ManimColor("#BDC3C7")
MOON_SHADOW = ManimColor("#7F8C8D")
ORBIT_PATH = ManimColor("#5DADE2")
RETURN_PATH = ManimColor("#F4D03F")

# ---------------------------------------------------------------------------
# Rocket geometry
# ---------------------------------------------------------------------------
ROCKET_BODY = ManimColor("#ECF0F1")
ROCKET_SHADOW = ManimColor("#AEB6BF")
ROCKET_STRIPE = ManimColor("#E74C3C")
ROCKET_WINDOW = ManimColor("#5DADE2")
FLAME_OUTER = ManimColor("#FF5E3A")
FLAME_INNER = ManimColor("#FFC93C")

# ---------------------------------------------------------------------------
# Physics quantities -- consistent across every scene
# ---------------------------------------------------------------------------
COLOR_MASS = ManimColor("#4FC3F7")        # M, dM, m_i, m_f  (mass family -> blue)
COLOR_VELOCITY = ManimColor("#69F0AE")    # u, du, Delta v   (rocket velocity -> green)
COLOR_EXHAUST = ManimColor("#FF8A65")     # v, V_eq          (exhaust velocity -> orange)
COLOR_FORCE = ManimColor("#FFD54F")       # thrust / force terms -> yellow
COLOR_PRESSURE = ManimColor("#BA68C8")    # p, p0, A         (pressure thrust -> purple)
COLOR_GRAVITY = ManimColor("#90A4AE")     # Mg cos(theta)    (neglected term -> grey)
COLOR_HIGHLIGHT = ManimColor("#FFC857")   # general emphasis / boxes
COLOR_NEGLECT = ManimColor("#FF5252")     # cross-out color for neglected terms

TEXT_PRIMARY = ManimColor("#F5F6FA")
TEXT_SECONDARY = ManimColor("#9AA3B2")
