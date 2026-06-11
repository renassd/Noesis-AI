"""
Scene 6 -- The Tsiolkovsky rocket equation: integration and a live demo.

Picks up exactly where Scene 5 left off (du = -V_eq dM/M), integrates both
sides between the rocket's initial state (full tanks, at rest) and final
state (empty tanks, at speed Delta v), and arrives at the famous result

    Delta v = V_eq * ln(m_i / m_f)

The back half of the scene turns this formula into something tangible: a
ValueTracker-driven "mass ratio" dial simultaneously drains a fuel tank,
grows a velocity arrow on a small rocket, and traces a live point along a
Delta v vs. mass-ratio curve -- so the viewer can *see* why burning more
fuel (a bigger mass ratio) buys diminishing returns in speed (a logarithm).
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
from manim import *

from utils import palette as pal
from utils.rocket import build_rocket, build_flame


class TsiolkovskyScene(Scene):
    def construct(self):
        self.camera.background_color = pal.SPACE_BG

        title = Text("La ecuación de Tsiolkovsky", font_size=44,
                      weight=BOLD, color=pal.TEXT_PRIMARY)
        self.play(Write(title), run_time=1.0)
        self.play(title.animate.scale(0.6).to_edge(UP, buff=0.4), run_time=0.7)

        # ------------------------------------------------------------------
        # Step 1: recap the differential relation from Scene 5
        # ------------------------------------------------------------------
        recap = MathTex(
            "du", "=", "-\\,V_{eq}\\,\\dfrac{dM}{M}"
        ).set_color_by_tex_to_color_map({
            "du": pal.COLOR_VELOCITY, "-\\,V_{eq}\\,\\dfrac{dM}{M}": pal.COLOR_HIGHLIGHT,
        })
        recap.next_to(title, DOWN, buff=0.6)
        self.play(FadeIn(recap, shift=UP * 0.2), run_time=0.8)
        self.wait(0.3)

        # ------------------------------------------------------------------
        # Step 2: integrate both sides between the initial and final states
        # ------------------------------------------------------------------
        integral = MathTex(
            r"\int_{u_i}^{u_f} du", "=", "-\\,V_{eq}", r"\int_{m_i}^{m_f} \dfrac{dM}{M}"
        ).set_color_by_tex_to_color_map({
            r"\int_{u_i}^{u_f} du": pal.COLOR_VELOCITY, "-\\,V_{eq}": pal.COLOR_HIGHLIGHT,
            r"\int_{m_i}^{m_f} \dfrac{dM}{M}": pal.COLOR_MASS,
        })
        integral.move_to(recap)
        self.play(TransformMatchingTex(recap, integral), run_time=1.2)
        self.wait(0.3)

        note = MathTex("u_i = 0", color=pal.TEXT_SECONDARY)
        note_caption = Text("el cohete parte del reposo", font_size=22, color=pal.TEXT_SECONDARY)
        note_group = VGroup(note, note_caption).arrange(RIGHT, buff=0.3)
        note_group.next_to(integral, DOWN, buff=0.5)
        self.play(FadeIn(note_group, shift=UP * 0.2), run_time=0.7)
        self.wait(0.5)

        # ------------------------------------------------------------------
        # Step 3: evaluate both integrals
        # ------------------------------------------------------------------
        evaluated = MathTex(
            "u_f", "-", "u_i", "=", "-\\,V_{eq}", r"\left(\ln m_f - \ln m_i\right)"
        ).set_color_by_tex_to_color_map({
            "u_f": pal.COLOR_VELOCITY, "u_i": pal.COLOR_VELOCITY,
            "-\\,V_{eq}": pal.COLOR_HIGHLIGHT,
            r"\left(\ln m_f - \ln m_i\right)": pal.COLOR_MASS,
        })
        evaluated.move_to(integral)

        self.play(
            FadeOut(note_group),
            TransformMatchingTex(integral, evaluated),
            run_time=1.2,
        )
        self.wait(0.4)

        # ------------------------------------------------------------------
        # Step 4: flip the logarithm -> mass ratio m_i / m_f
        # ------------------------------------------------------------------
        flipped = MathTex(
            r"\Delta v", "=", "V_{eq}", r"\ln\!\left(\dfrac{m_i}{m_f}\right)"
        ).set_color_by_tex_to_color_map({
            r"\Delta v": pal.COLOR_VELOCITY, "V_{eq}": pal.COLOR_HIGHLIGHT,
            r"\ln\!\left(\dfrac{m_i}{m_f}\right)": pal.COLOR_MASS,
        })
        flipped.move_to(evaluated)

        self.play(TransformMatchingTex(evaluated, flipped), run_time=1.2)
        self.wait(0.3)

        final_box = SurroundingRectangle(flipped, color=pal.COLOR_HIGHLIGHT, buff=0.2)
        name_tag = Text("La ecuación del cohete de Tsiolkovsky", font_size=26,
                         color=pal.COLOR_HIGHLIGHT)
        name_tag.next_to(final_box, DOWN, buff=0.3)
        self.play(Create(final_box), FadeIn(name_tag, shift=UP * 0.2), run_time=0.9)
        self.wait(1.0)

        # move the headline result up out of the way of the live demo below
        result_group = VGroup(flipped, final_box, name_tag)
        self.play(result_group.animate.scale(0.85).to_edge(UP, buff=1.1), run_time=0.8)

        # ------------------------------------------------------------------
        # Step 5: live demo -- mass ratio dial drives tank, rocket and graph
        # ------------------------------------------------------------------
        demo_caption = Text("Quemar más combustible aumenta Δv, pero cada vez menos",
                             font_size=22, color=pal.TEXT_SECONDARY)
        demo_caption.next_to(result_group, DOWN, buff=0.35)
        self.play(FadeIn(demo_caption, shift=UP * 0.2), run_time=0.7)

        # mass ratio R = m_i / m_f, animated from 1 (no propellant burned) up to 9
        ratio = ValueTracker(1.0)
        R_MAX = 9.0

        # --- fuel tank (left) -------------------------------------------------
        tank_outline = Rectangle(width=1.2, height=2.4, color=pal.TEXT_SECONDARY,
                                  stroke_width=3)
        tank_outline.next_to(demo_caption, DOWN, buff=0.6).shift(LEFT * 4.6)
        tank_label = Text("combustible", font_size=20, color=pal.TEXT_SECONDARY)
        tank_label.next_to(tank_outline, UP, buff=0.12)

        fuel = always_redraw(lambda: Rectangle(
            width=1.2 - 0.08, height=(2.4 - 0.08) * (1.0 / ratio.get_value()),
            color=pal.COLOR_MASS, fill_color=pal.COLOR_MASS, fill_opacity=0.85,
            stroke_width=0,
        ).move_to(tank_outline.get_bottom() + UP * 0.04, aligned_edge=DOWN))

        # --- rocket + growing velocity arrow (middle) -------------------------
        rocket = build_rocket(height=1.1).rotate(-90 * DEGREES)
        rocket_anchor = tank_outline.get_center() + RIGHT * 3.0
        rocket.move_to(rocket_anchor)
        flame = build_flame(rocket)
        rocket_group = VGroup(rocket, flame)

        v_arrow = always_redraw(lambda: Arrow(
            rocket.get_right() + RIGHT * 0.15,
            rocket.get_right() + RIGHT * (0.15 + 1.7 * np.log(ratio.get_value()) / np.log(R_MAX)),
            buff=0, color=pal.COLOR_VELOCITY, stroke_width=6,
            max_tip_length_to_length_ratio=0.22,
        ))
        dv_value = always_redraw(lambda: MathTex(
            r"\Delta v = " + f"{np.log(ratio.get_value()):.2f}\\,V_{{eq}}",
            color=pal.COLOR_VELOCITY, font_size=30,
        ).next_to(v_arrow, UP, buff=0.18))

        # --- Delta v / V_eq vs mass ratio graph (right) -----------------------
        axes = Axes(
            x_range=[1, R_MAX, 2], y_range=[0, np.log(R_MAX) * 1.15, 1],
            x_length=3.6, y_length=2.6,
            axis_config={"color": pal.GRID_LINE, "include_tip": True,
                         "tip_width": 0.12, "tip_height": 0.12},
        )
        axes.next_to(rocket_group, RIGHT, buff=1.3)

        x_axis_label = MathTex("m_i / m_f", font_size=24, color=pal.TEXT_SECONDARY)
        x_axis_label.next_to(axes.x_axis.get_right(), DOWN, buff=0.15)
        y_axis_label = MathTex(r"\Delta v / V_{eq}", font_size=24, color=pal.TEXT_SECONDARY)
        y_axis_label.next_to(axes.y_axis.get_top(), UP, buff=0.1)

        curve = axes.plot(lambda x: np.log(x), x_range=[1, R_MAX], color=pal.COLOR_VELOCITY,
                           stroke_width=3)

        tracking_dot = always_redraw(lambda: Dot(
            axes.c2p(ratio.get_value(), np.log(ratio.get_value())),
            radius=0.07, color=pal.COLOR_HIGHLIGHT,
        ))

        demo_group = VGroup(
            tank_outline, tank_label, fuel, rocket_group, v_arrow, dv_value,
            axes, x_axis_label, y_axis_label, curve, tracking_dot,
        )

        self.play(
            FadeIn(VGroup(tank_outline, tank_label, fuel)),
            FadeIn(rocket_group, shift=RIGHT * 0.3),
            FadeIn(VGroup(axes, x_axis_label, y_axis_label)),
            run_time=1.0,
        )
        self.play(Create(curve), run_time=1.0)
        self.play(FadeIn(v_arrow), FadeIn(dv_value), FadeIn(tracking_dot), run_time=0.6)
        self.wait(0.3)

        # the dial: as the mass ratio climbs, fuel drains, the arrow grows,
        # Delta v ticks up, and the dot slides along the curve -- all driven
        # by the single `ratio` ValueTracker
        self.play(ratio.animate.set_value(R_MAX), run_time=4.0, rate_func=linear)
        self.wait(0.4)

        diminishing = Text("rendimientos decrecientes: ln(R) crece cada vez más despacio",
                            font_size=20, color=pal.COLOR_HIGHLIGHT)
        diminishing.next_to(demo_group, DOWN, buff=0.25)
        self.play(FadeIn(diminishing, shift=UP * 0.2), run_time=0.8)
        self.wait(1.2)

        # ------------------------------------------------------------------
        # Outro
        # ------------------------------------------------------------------
        self.play(FadeOut(VGroup(
            title, result_group, demo_caption, demo_group, diminishing,
        )), run_time=1.0)
