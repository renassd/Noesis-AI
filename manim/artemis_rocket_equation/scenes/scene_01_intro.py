"""
Scene 1 -- Intro: "Artemis II" and the Earth-Moon free-return trajectory.

Replaces the original video's static title card + static NASA flight-path
screenshot with a short cinematic sequence: the title appears over a
starfield, the Earth-Moon system fades in, the free-return trajectory draws
itself while a rocket icon travels along it, and the camera finally pushes in
toward the rocket to set up the next scene.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from manim import *

from utils import palette as pal
from utils.scenery import make_starfield, make_earth, make_moon, make_free_return_path
from utils.rocket import build_rocket, build_flame


class IntroScene(MovingCameraScene):
    def construct(self):
        self.camera.background_color = pal.SPACE_BG

        stars = make_starfield(n=220, width=16, height=9)
        self.add(stars)

        # ------------------------------------------------------------------
        # 1. Title card
        # ------------------------------------------------------------------
        title = Text("ARTEMIS II", font_size=96, weight=BOLD, color=pal.TEXT_PRIMARY)
        subtitle = Text(
            "La física detrás del regreso a la Luna",
            font_size=32, color=pal.TEXT_SECONDARY,
        )
        subtitle.next_to(title, DOWN, buff=0.4)

        self.play(FadeIn(title, scale=1.15), run_time=1.2)
        self.play(FadeIn(subtitle, shift=UP * 0.3), run_time=1.0)
        self.wait(0.6)

        # shrink the title block up to the top of the frame
        title_group = VGroup(title, subtitle)
        self.play(
            title_group.animate.scale(0.4).to_edge(UP, buff=0.4),
            run_time=1.2,
        )

        # ------------------------------------------------------------------
        # 2. Earth - Moon system + free-return trajectory
        # ------------------------------------------------------------------
        earth = make_earth(radius=1.3).move_to(LEFT * 4.6)
        moon = make_moon(radius=0.34).move_to(RIGHT * 4.6)

        self.play(FadeIn(earth, shift=RIGHT * 0.3), FadeIn(moon, shift=LEFT * 0.3), run_time=1.2)

        path = make_free_return_path(earth.get_center(), moon.get_center())
        transit, loop = path
        transit.set_stroke(color=pal.ORBIT_PATH, width=3)
        loop.set_stroke(color=pal.RETURN_PATH, width=3)

        self.play(Create(transit), run_time=1.6)
        self.play(Create(loop), run_time=1.0)

        # scale annotation between Earth and Moon
        scale_arrow = DoubleArrow(
            earth.get_center() + UP * 1.6, moon.get_center() + UP * 1.6,
            buff=0, color=pal.TEXT_SECONDARY, stroke_width=2,
        )
        scale_label = Text("≈ 384 400 km", font_size=24, color=pal.TEXT_SECONDARY)
        scale_label.next_to(scale_arrow, UP, buff=0.1)
        self.play(GrowArrow(scale_arrow), FadeIn(scale_label), run_time=1.0)

        # ------------------------------------------------------------------
        # 3. A rocket travels the free-return trajectory
        # ------------------------------------------------------------------
        traveler = Dot(radius=0.07, color=pal.COLOR_HIGHLIGHT)
        traveler.move_to(transit.point_from_proportion(0))
        self.play(FadeIn(traveler, scale=0.3))
        self.play(
            MoveAlongPath(traveler, transit),
            run_time=2.6, rate_func=rate_functions.ease_in_out_sine,
        )
        self.play(MoveAlongPath(traveler, loop), run_time=1.2, rate_func=linear)

        self.wait(0.3)
        self.play(FadeOut(scale_arrow), FadeOut(scale_label))

        # ------------------------------------------------------------------
        # 4. Hook question + cinematic push-in toward the rocket
        # ------------------------------------------------------------------
        question = Text(
            "¿Qué hace posible este viaje?",
            font_size=40, color=pal.TEXT_PRIMARY,
        ).to_edge(DOWN, buff=0.8)
        self.play(Write(question), run_time=1.2)
        self.wait(0.6)

        rocket = build_rocket(height=0.9).rotate(45 * DEGREES)
        rocket.move_to(traveler.get_center())
        flame = build_flame(rocket)
        rocket_group = VGroup(rocket, flame)

        self.play(FadeOut(traveler), FadeIn(rocket_group, scale=0.5), run_time=0.8)
        self.play(FadeOut(question), FadeOut(title_group), run_time=0.6)

        self.play(
            self.camera.frame.animate.scale(0.06).move_to(rocket_group.get_center()),
            run_time=2.4, rate_func=rate_functions.ease_in_quad,
        )
        self.play(FadeOut(VGroup(stars, earth, moon, transit, loop, rocket_group)), run_time=0.6)
        self.camera.frame.move_to(ORIGIN).scale(1 / 0.06)
