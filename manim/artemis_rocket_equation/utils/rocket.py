"""
Reusable rocket VMobject + animated exhaust flame.

The rocket is built pointing "up" (+Y, nose up / nozzle down).  Because the
helper functions below locate the nozzle/nose by querying the *current*
position of the `tail` and `nose` submobjects (via `get_critical_point`),
they keep working correctly even after the whole rocket VGroup has been
rotated, scaled or moved -- there is no stale cached coordinate.
"""

from manim import *
from . import palette as pal


def build_rocket(height: float = 2.4, width: float = 0.62) -> VGroup:
    """Return a VGroup representing a simple, modern rocket silhouette.

    The returned group exposes `.body`, `.tail` and `.nose` references so
    that `get_nozzle_point`, `get_nose_point` and `build_flame` can locate
    the rocket's extremities at any later time, even after transforms.
    """
    h, w = height, width

    # --- main body (rounded capsule) -----------------------------------
    body = RoundedRectangle(
        corner_radius=w / 2,
        width=w,
        height=h * 0.62,
        color=pal.ROCKET_BODY,
        fill_color=pal.ROCKET_BODY,
        fill_opacity=1.0,
        stroke_color=pal.ROCKET_SHADOW,
        stroke_width=2,
    )

    # --- nose cone --------------------------------------------------------
    nose = Triangle(color=pal.ROCKET_BODY, fill_color=pal.ROCKET_BODY, fill_opacity=1.0,
                     stroke_color=pal.ROCKET_SHADOW, stroke_width=2)
    nose.stretch_to_fit_width(w)
    nose.stretch_to_fit_height(h * 0.30)
    nose.next_to(body, UP, buff=0)

    # --- tail / engine skirt ----------------------------------------------
    tail_h = h * 0.10
    tail = Polygon(
        np.array([-w / 2, tail_h, 0]), np.array([w / 2, tail_h, 0]),
        np.array([w * 0.39, 0, 0]), np.array([-w * 0.39, 0, 0]),
        color=pal.ROCKET_SHADOW, fill_color=pal.ROCKET_SHADOW, fill_opacity=1.0,
        stroke_width=0,
    )
    tail.next_to(body, DOWN, buff=0)

    # --- racing stripe ------------------------------------------------------
    stripe = Rectangle(
        width=w, height=h * 0.07,
        fill_color=pal.ROCKET_STRIPE, fill_opacity=1.0, stroke_width=0,
    )
    stripe.move_to(body.get_center() + UP * h * 0.06)

    # --- window ---------------------------------------------------------
    window = Circle(radius=w * 0.22, color=pal.ROCKET_WINDOW,
                     fill_color=pal.ROCKET_WINDOW, fill_opacity=1.0, stroke_width=0)
    window.move_to(body.get_center() + UP * h * 0.18)

    # --- fins -------------------------------------------------------------
    fin_template = Polygon(
        ORIGIN, RIGHT * w * 0.55, DOWN * h * 0.16 + RIGHT * w * 0.05,
        color=pal.ROCKET_STRIPE, fill_color=pal.ROCKET_STRIPE, fill_opacity=1.0, stroke_width=0,
    )
    left_fin = fin_template.copy().flip(UP).next_to(tail, LEFT, buff=-0.02, aligned_edge=UP)
    right_fin = fin_template.copy().next_to(tail, RIGHT, buff=-0.02, aligned_edge=UP)

    rocket = VGroup(left_fin, right_fin, tail, body, stripe, window, nose)
    rocket.body = body
    rocket.tail = tail
    rocket.nose = nose
    return rocket


def get_nozzle_point(rocket: VGroup):
    """Current location of the rocket's nozzle exit (works after rotation)."""
    direction = normalize(rocket.tail.get_center() - rocket.body.get_center())
    return rocket.tail.get_critical_point(direction)


def get_nose_point(rocket: VGroup):
    """Current location of the rocket's nose tip (works after rotation)."""
    direction = normalize(rocket.nose.get_center() - rocket.body.get_center())
    return rocket.nose.get_critical_point(direction)


def get_thrust_axis(rocket: VGroup):
    """Unit vector pointing from the nozzle toward the nose (the rocket's
    current "forward" direction)."""
    return normalize(get_nose_point(rocket) - get_nozzle_point(rocket))


def _signed_angle(v_from, v_to):
    return np.arctan2(v_to[1], v_to[0]) - np.arctan2(v_from[1], v_from[0])


def _make_flame_shape(scale: float) -> VGroup:
    """Build a two-tone flame, pointing DOWN, with its flat base at the
    local origin (so it can be rotated/placed against the nozzle)."""
    outer = Triangle(fill_color=pal.FLAME_OUTER, fill_opacity=0.9, stroke_width=0)
    outer.stretch_to_fit_width(0.34)
    outer.stretch_to_fit_height(max(0.85 * scale, 1e-3))
    outer.rotate(PI)

    inner = Triangle(fill_color=pal.FLAME_INNER, fill_opacity=0.95, stroke_width=0)
    inner.stretch_to_fit_width(0.16)
    inner.stretch_to_fit_height(max(0.55 * scale, 1e-3))
    inner.rotate(PI)
    inner.move_to(outer.get_center() + UP * 0.08)

    flame = VGroup(outer, inner)
    flame.shift(-outer.get_top())  # flat base now sits at the origin
    return flame


def build_flame(rocket: VGroup, scale_tracker: ValueTracker = None) -> VGroup:
    """Return an exhaust flame attached to `rocket`'s nozzle, oriented along
    the rocket's current thrust axis.

    If `scale_tracker` (a ValueTracker, typically in [0, 1]) is supplied, the
    flame is wrapped in `always_redraw` so its length pulses with the
    tracker's value -- use this to simulate engine ignition / throttling.
    """

    def make_flame(scale=1.0):
        flame = _make_flame_shape(scale)
        direction = -get_thrust_axis(rocket)  # exhaust points opposite to "forward"
        angle = _signed_angle(DOWN, direction)
        flame.rotate(angle, about_point=ORIGIN)
        flame.shift(get_nozzle_point(rocket))
        return flame

    if scale_tracker is None:
        return make_flame()

    return always_redraw(lambda: make_flame(scale_tracker.get_value()))
