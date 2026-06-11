"""
Scene 3 -- Free-body diagram of an "ideal rocket".

Replaces the original video's hand-drawn rocket sketch over a busy
chalk-doodle background with a clean, color-coded free-body diagram on a
faint grid.  Every vector and symbol uses the project-wide color palette
(utils/palette.py) so the same color keeps meaning the same physical
quantity in every later scene -- velocity is always green, the exhaust
velocity is always orange, mass is always blue, and so on.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from manim import *

from utils import palette as pal
from utils.rocket import build_rocket, build_flame, get_nose_point, get_nozzle_point, get_thrust_axis


class FreeBodyDiagramScene(Scene):
    def construct(self):
        self.camera.background_color = pal.SPACE_BG

        # faint background grid for a "scientific notebook" feel without clutter
        grid = NumberPlane(
            x_range=[-8, 8, 1], y_range=[-5, 5, 1],
            background_line_style={"stroke_color": pal.GRID_LINE, "stroke_width": 1,
                                    "stroke_opacity": 0.5},
            axis_config={"stroke_opacity": 0},
        )
        self.add(grid)

        # ------------------------------------------------------------------
        # Title
        # ------------------------------------------------------------------
        title = Text("La ecuación ideal del cohete", font_size=46,
                      weight=BOLD, color=pal.TEXT_PRIMARY)
        self.play(Write(title), run_time=1.2)
        self.play(title.animate.scale(0.6).to_edge(UP, buff=0.4), run_time=0.8)

        # ------------------------------------------------------------------
        # Rocket, tilted, mid-flight
        # ------------------------------------------------------------------
        rocket = build_rocket(height=1.8).rotate(25 * DEGREES)
        rocket.move_to(LEFT * 3.6 + DOWN * 0.6)
        flame = build_flame(rocket)
        rocket_group = VGroup(rocket, flame)
        self.play(FadeIn(rocket_group, scale=0.7), run_time=1.0)

        # ------------------------------------------------------------------
        # Mass label M (inside the body)
        # ------------------------------------------------------------------
        mass_label = MathTex("M", color=pal.COLOR_MASS, font_size=40)
        mass_label.move_to(rocket.body.get_center() + UP * 0.32)
        mass_box = SurroundingRectangle(mass_label, color=pal.COLOR_MASS, buff=0.08,
                                         stroke_width=1.5)
        self.play(FadeIn(mass_label), Create(mass_box), run_time=0.8)

        # ------------------------------------------------------------------
        # Velocity vector u (rocket's direction of motion)
        # ------------------------------------------------------------------
        forward = get_thrust_axis(rocket)
        nose = get_nose_point(rocket)
        u_vec = Arrow(nose, nose + forward * 1.6, buff=0, color=pal.COLOR_VELOCITY,
                      stroke_width=6, max_tip_length_to_length_ratio=0.16)
        u_label = MathTex("u", color=pal.COLOR_VELOCITY, font_size=44)
        u_label.next_to(u_vec.get_end(), UP * 0.3 + RIGHT * 0.2)
        self.play(GrowArrow(u_vec), FadeIn(u_label), run_time=0.8)

        # ------------------------------------------------------------------
        # Acceleration vector a (straight down, offset to the right of body)
        # ------------------------------------------------------------------
        a_start = rocket.body.get_top() + RIGHT * 1.1
        a_vec = Arrow(a_start, a_start + DOWN * 1.3, buff=0, color=pal.COLOR_FORCE,
                      stroke_width=6, max_tip_length_to_length_ratio=0.16)
        a_label = MathTex("a", color=pal.COLOR_FORCE, font_size=44)
        a_label.next_to(a_vec.get_end(), RIGHT, buff=0.15)
        self.play(GrowArrow(a_vec), FadeIn(a_label), run_time=0.8)

        # ------------------------------------------------------------------
        # Exhaust: ejected mass element dm with exhaust velocity v
        # ------------------------------------------------------------------
        nozzle = get_nozzle_point(rocket)
        backward = -forward
        v_vec = Arrow(nozzle, nozzle + backward * 2.0, buff=0.35, color=pal.COLOR_EXHAUST,
                      stroke_width=6, max_tip_length_to_length_ratio=0.13)
        v_label = MathTex("v", color=pal.COLOR_EXHAUST, font_size=44)
        v_label.next_to(v_vec.get_end(), DOWN * 0.3 + LEFT * 0.2)

        dm_dot = Dot(v_vec.get_end() + backward * 0.25, radius=0.07, color=pal.COLOR_EXHAUST)
        dm_label = MathTex("dm", color=pal.COLOR_EXHAUST, font_size=36)
        dm_label.next_to(dm_dot, DOWN, buff=0.15)

        self.play(GrowArrow(v_vec), FadeIn(v_label), run_time=0.8)
        self.play(FadeIn(dm_dot, scale=0.4), FadeIn(dm_label), run_time=0.6)

        # ------------------------------------------------------------------
        # Nozzle exit area A and pressure p
        # ------------------------------------------------------------------
        nozzle_tick = Line(nozzle + UP * 0.18, nozzle + DOWN * 0.18,
                            color=pal.COLOR_PRESSURE, stroke_width=4)
        nozzle_tick.rotate(angle_of_vector(forward) - PI / 2)
        nozzle_tick.move_to(nozzle)
        perp = rotate_vector(forward, -PI / 2)  # points away from the flame
        ap_label = MathTex("A,\\;p", color=pal.COLOR_PRESSURE, font_size=36)
        ap_label.move_to(nozzle + perp * 0.65)
        self.play(Create(nozzle_tick), FadeIn(ap_label), run_time=0.7)

        self.wait(0.5)

        # ------------------------------------------------------------------
        # Legend, built progressively on the right side
        # ------------------------------------------------------------------
        legend_title = Text("Variables", font_size=30, weight=BOLD, color=pal.TEXT_PRIMARY)
        entries = [
            (pal.COLOR_MASS, "M", "masa instantánea del cohete"),
            (pal.COLOR_VELOCITY, "u", "velocidad del cohete"),
            (pal.COLOR_EXHAUST, "v", "velocidad de escape"),
            (pal.COLOR_PRESSURE, "A", "área de salida de la tobera"),
            (pal.COLOR_PRESSURE, "p,\\,p_0", "presión de escape / atmosférica"),
            (pal.COLOR_FORCE, "a", "aceleración del cohete"),
        ]

        rows = VGroup()
        for color, sym, desc in entries:
            swatch = Square(side_length=0.22, fill_color=color, fill_opacity=1, stroke_width=0)
            symbol = MathTex(sym, color=color, font_size=32)
            text = Text(desc, font_size=22, color=pal.TEXT_SECONDARY)
            row = VGroup(swatch, symbol, text).arrange(RIGHT, buff=0.18)
            rows.add(row)

        rows.arrange(DOWN, aligned_edge=LEFT, buff=0.22)
        legend = VGroup(legend_title, rows).arrange(DOWN, aligned_edge=LEFT, buff=0.3)
        legend.to_edge(RIGHT, buff=0.6).shift(DOWN * 0.2)

        panel = SurroundingRectangle(legend, color=pal.GRID_LINE, fill_color=pal.SPACE_BG_LIGHT,
                                      fill_opacity=0.85, buff=0.3, corner_radius=0.15)

        self.play(FadeIn(panel), Write(legend_title), run_time=0.8)
        self.play(LaggedStart(*[FadeIn(row, shift=LEFT * 0.2) for row in rows],
                               lag_ratio=0.18), run_time=2.0)

        self.wait(1.0)

        # ------------------------------------------------------------------
        # Transition out
        # ------------------------------------------------------------------
        everything = VGroup(grid, title, rocket_group, mass_label, mass_box, u_vec, u_label,
                             a_vec, a_label, dm_dot, dm_label, v_vec, v_label, nozzle_tick,
                             ap_label, panel, legend)
        self.play(FadeOut(everything), run_time=0.8)
