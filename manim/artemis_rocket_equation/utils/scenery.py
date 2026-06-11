"""
Reusable "scenery" objects: starfield, stylised Earth & Moon, and the
Artemis II free-return trajectory.  These are deliberately simple 2D
VMobject compositions (circles, ellipses, dots) so they render fast while
still reading as "Earth", "Moon" and "orbit" at a glance -- the goal is
visual clarity, not photorealism.
"""

import numpy as np
from manim import *
from . import palette as pal


def make_starfield(n: int = 180, width: float = 16, height: float = 9, seed: int = 7) -> VGroup:
    """A field of small white dots with varying brightness, used as a
    parallax-friendly space backdrop."""
    rng = np.random.default_rng(seed)
    stars = VGroup()
    for _ in range(n):
        x = rng.uniform(-width / 2, width / 2)
        y = rng.uniform(-height / 2, height / 2)
        r = rng.uniform(0.005, 0.022)
        op = rng.uniform(0.2, 1.0)
        stars.add(Dot(point=[x, y, 0], radius=r, color=pal.STAR_COLOR, fill_opacity=op))
    return stars


def make_earth(radius: float = 1.0) -> VGroup:
    """A stylised Earth: ocean sphere + green continents + soft night-side
    shading + thin cloud wisps."""
    ocean = Circle(radius=radius, fill_color=pal.EARTH_BLUE, fill_opacity=1.0, stroke_width=0)

    continents = VGroup()
    blobs = [
        (0.55, 0.35, 0.42, -10), (-0.35, -0.15, 0.55, 25),
        (0.05, -0.55, 0.35, 60), (-0.55, 0.45, 0.30, -35),
    ]
    for bx, by, bs, ang in blobs:
        blob = Ellipse(width=bs * radius, height=bs * 0.7 * radius,
                        fill_color=pal.EARTH_GREEN, fill_opacity=1.0, stroke_width=0)
        blob.rotate(ang * DEGREES)
        blob.move_to(ocean.get_center() + np.array([bx, by, 0]) * radius)
        continents.add(blob)
    # clip continents to the ocean disk so the blobs don't spill over the edge
    clipped = VGroup()
    for blob in continents:
        clipped.add(Intersection(blob, ocean.copy(), fill_color=pal.EARTH_GREEN,
                                  fill_opacity=1.0, stroke_width=0))

    # soft night-side shading (a dim crescent on the right edge)
    shadow = Circle(radius=radius, fill_color=pal.SPACE_BG, fill_opacity=0.45, stroke_width=0)
    shadow.shift(RIGHT * radius * 0.9)
    shadow = Intersection(shadow, ocean.copy(), fill_color=pal.SPACE_BG,
                           fill_opacity=0.45, stroke_width=0)

    rim = Circle(radius=radius, color=pal.EARTH_BLUE, stroke_width=2, fill_opacity=0)

    return VGroup(ocean, clipped, shadow, rim)


def make_moon(radius: float = 0.27) -> VGroup:
    """A stylised, cratered Moon."""
    body = Circle(radius=radius, fill_color=pal.MOON_GRAY, fill_opacity=1.0,
                   stroke_color=pal.MOON_GRAY, stroke_width=1)
    craters = VGroup()
    spots = [(0.3, 0.2, 0.18), (-0.35, -0.1, 0.22), (0.05, -0.35, 0.14), (-0.1, 0.35, 0.12)]
    for cx, cy, cs in spots:
        crater = Circle(radius=cs * radius, fill_color=pal.MOON_SHADOW,
                         fill_opacity=0.6, stroke_width=0)
        crater.move_to(body.get_center() + np.array([cx, cy, 0]) * radius)
        craters.add(crater)
    clipped = VGroup(*[Intersection(c, body.copy(), fill_color=pal.MOON_SHADOW,
                                     fill_opacity=0.6, stroke_width=0) for c in craters])
    return VGroup(body, clipped)


def make_free_return_path(earth_pos, moon_pos, scale: float = 1.0) -> VGroup:
    """A stylised Artemis II "free-return" trajectory, inspired by the
    official NASA flight-path graphic: a lens-shaped translunar coast
    between Earth and Moon, plus a small loop representing the lunar
    fly-by.  Returned as a VGroup of two VMobjects so each can be animated
    (e.g. drawn) independently."""
    earth_pos = np.array(earth_pos)
    moon_pos = np.array(moon_pos)
    direction = moon_pos - earth_pos
    dist = np.linalg.norm(direction)
    u = direction / dist
    perp = np.array([-u[1], u[0], 0])
    mid = (earth_pos + moon_pos) / 2

    # lens-shaped translunar coast: two mirrored arcs between Earth and Moon
    pts = []
    for t in np.linspace(0, 1, 25):
        bulge = np.sin(t * PI) * 0.16 * dist
        pts.append(earth_pos + t * direction + bulge * perp)
    for t in np.linspace(1, 0, 25):
        bulge = -np.sin(t * PI) * 0.16 * dist
        pts.append(earth_pos + t * direction + bulge * perp)
    transit = VMobject()
    transit.set_points_smoothly(pts + [pts[0]])

    # small loop representing the lunar fly-by, anchored at the near point
    loop_r = 0.40 * scale
    loop_pts = [moon_pos + loop_r * (np.cos(t) * u + np.sin(t) * perp)
                for t in np.linspace(0, 2 * PI, 30)]
    loop = VMobject()
    loop.set_points_smoothly(loop_pts + [loop_pts[0]])

    return VGroup(transit, loop)
