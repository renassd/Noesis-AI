"""
Scene 2 -- Launch: a cinematic ascent.

Replaces the original video's two static launch photographs with a short
animated ascent: the rocket ignites on the pad (with a flickering flame and
a brief shake), climbs through a blue sky that gradually fades into the
black of space, and leaves the question "what makes this possible?" hanging
as it disappears off-frame -- setting up the physics derivation that follows.

Implementation note: instead of moving a camera, the whole "world" (sky,
ground, tower, rocket) is shifted downward while a fixed full-frame "space"
rectangle fades in on top -- this gives the same sense of ascent while
keeping the animation graph simple and fast to render.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from manim import *

from utils import palette as pal
from utils.scenery import make_starfield
from utils.rocket import build_rocket, build_flame


class LaunchScene(Scene):
    def construct(self):
        self.camera.background_color = pal.SPACE_BG

        # ------------------------------------------------------------------
        # Backgrounds: sky (bottom layer) -> space (fades in on top, fixed)
        # ------------------------------------------------------------------
        sky = Rectangle(width=config.frame_width, height=config.frame_height,
                         stroke_width=0)
        sky.set_fill(color=[pal.EARTH_BLUE, pal.SPACE_BG_LIGHT], opacity=1)
        sky.set_sheen_direction(UP)

        space = Rectangle(width=config.frame_width, height=config.frame_height,
                           fill_color=pal.SPACE_BG, fill_opacity=0, stroke_width=0)
        stars = make_starfield(n=90, width=config.frame_width, height=config.frame_height)
        stars.set_opacity(0)

        ground = Rectangle(width=config.frame_width, height=2, fill_color=pal.MOON_SHADOW,
                            fill_opacity=1, stroke_width=0).to_edge(DOWN, buff=-1)
        tower = Rectangle(width=0.18, height=2.6, fill_color=pal.TEXT_SECONDARY,
                           fill_opacity=1, stroke_width=0)
        tower.next_to(ground, UP, buff=0).shift(RIGHT * 1.4 + UP * 1.3)

        self.add(space, sky, ground, tower, stars)

        # ------------------------------------------------------------------
        # Rocket on the pad
        # ------------------------------------------------------------------
        rocket = build_rocket(height=1.6)
        rocket.move_to(ground.get_top() + UP * (rocket.height / 2))

        flame_tracker = ValueTracker(0.0)
        flame = build_flame(rocket, flame_tracker)
        rocket_group = VGroup(rocket, flame)

        title = Text("Despegue", font_size=44, weight=BOLD, color=pal.TEXT_PRIMARY)
        title.to_edge(UP, buff=0.6)

        self.play(FadeIn(rocket_group, shift=UP * 0.2), Write(title), run_time=1.0)
        self.play(FadeOut(title), run_time=0.5)

        # ------------------------------------------------------------------
        # Ignition: flame grows + brief shake
        # ------------------------------------------------------------------
        world = VGroup(sky, ground, tower, rocket_group)

        self.play(flame_tracker.animate.set_value(1.0), run_time=0.3)
        self.play(world.animate.shift(RIGHT * 0.06), run_time=0.06)
        self.play(world.animate.shift(LEFT * 0.12), run_time=0.06)
        self.play(world.animate.shift(RIGHT * 0.06), run_time=0.06)

        # ------------------------------------------------------------------
        # Lift-off: the world drops away (rocket appears to climb), sky
        # crossfades into space and stars fade in
        # ------------------------------------------------------------------
        self.play(
            world.animate.shift(DOWN * 6),
            flame_tracker.animate.set_value(1.25),
            space.animate.set_fill(opacity=1),
            stars.animate.set_opacity(1),
            run_time=2.6, rate_func=rate_functions.ease_in_quad,
        )
        self.play(
            world.animate.shift(DOWN * 9).scale(0.85, about_point=rocket_group.get_center()),
            flame_tracker.animate.set_value(0.9),
            run_time=2.2, rate_func=rate_functions.ease_in_quad,
        )

        # ------------------------------------------------------------------
        # Hand-off to the physics explanation
        # ------------------------------------------------------------------
        question = Text(
            "Pero, ¿qué hace posible esta hazaña?",
            font_size=40, color=pal.TEXT_PRIMARY,
        )
        self.play(FadeIn(question, shift=UP * 0.2), run_time=1.0)
        self.wait(0.6)
        self.play(
            FadeOut(question),
            FadeOut(world),
            run_time=0.8,
        )
