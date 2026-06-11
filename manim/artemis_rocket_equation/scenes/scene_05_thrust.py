"""
Scene 5 -- The equivalent exhaust velocity V_eq.

The original video jumps straight from the impulse equation to the
definition of V_eq.  Here we slow down and *show* what V_eq physically
bundles together: a "momentum thrust" term (mass ejected at speed v) and a
"pressure thrust" term ((p - p0)A from the pressure mismatch at the nozzle
exit).  A draining fuel-tank visual (driven by a ValueTracker +
always_redraw) makes the substitution dm = -dM concrete before we arrive at
du = -V_eq dM / M.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from manim import *

from utils import palette as pal
from utils.rocket import build_rocket, build_flame, get_nozzle_point, get_thrust_axis


class ThrustEquationScene(Scene):
    def construct(self):
        self.camera.background_color = pal.SPACE_BG

        title = Text("Velocidad de escape equivalente", font_size=42,
                      weight=BOLD, color=pal.TEXT_PRIMARY)
        self.play(Write(title), run_time=1.0)
        self.play(title.animate.scale(0.6).to_edge(UP, buff=0.4), run_time=0.7)

        # ------------------------------------------------------------------
        # Recap of the previous result
        # ------------------------------------------------------------------
        recap = MathTex(
            "M\\,du", "=", "(p - p_0)A\\,dt", "+", "v\\,dm"
        ).set_color_by_tex_to_color_map({
            "M\\,du": pal.COLOR_VELOCITY, "(p - p_0)A\\,dt": pal.COLOR_PRESSURE,
            "v\\,dm": pal.COLOR_EXHAUST,
        })
        recap.next_to(title, DOWN, buff=0.5)
        self.play(FadeIn(recap, shift=UP * 0.2), run_time=0.8)

        rate_note = MathTex(
            r"dm = \dot m \, dt"
        ).set_color_by_tex_to_color_map({r"\dot m": pal.COLOR_MASS})
        rate_note.next_to(recap, DOWN, buff=0.4)
        self.play(FadeIn(rate_note, shift=UP * 0.2), run_time=0.7)
        self.wait(0.4)

        # ------------------------------------------------------------------
        # Two contributions to thrust, drawn at the nozzle
        # ------------------------------------------------------------------
        rocket = build_rocket(height=1.6).rotate(90 * DEGREES)
        flame = build_flame(rocket)
        rocket_group = VGroup(rocket, flame)
        rocket_group.move_to(LEFT * 3.6 + DOWN * 1.0)

        nozzle = get_nozzle_point(rocket)
        backward = -get_thrust_axis(rocket)

        momentum_thrust = Arrow(nozzle, nozzle + backward * 1.4 + DOWN * 0.5, buff=0.05,
                                 color=pal.COLOR_EXHAUST, stroke_width=6,
                                 max_tip_length_to_length_ratio=0.18)
        momentum_label = MathTex(r"\dot m\,v", color=pal.COLOR_EXHAUST, font_size=34)
        momentum_label.next_to(momentum_thrust.get_end(), DOWN, buff=0.1)
        momentum_caption = Text("empuje de momento", font_size=22, color=pal.COLOR_EXHAUST)
        momentum_caption.next_to(momentum_label, DOWN, buff=0.05)

        pressure_thrust = Arrow(nozzle, nozzle + backward * 0.6 + UP * 0.9, buff=0.05,
                                 color=pal.COLOR_PRESSURE, stroke_width=6,
                                 max_tip_length_to_length_ratio=0.18)
        pressure_label = MathTex("(p - p_0)A", color=pal.COLOR_PRESSURE, font_size=34)
        pressure_label.next_to(pressure_thrust.get_end(), UP, buff=0.1)
        pressure_caption = Text("empuje de presión", font_size=22, color=pal.COLOR_PRESSURE)
        pressure_caption.next_to(pressure_label, UP, buff=0.05)

        self.play(FadeIn(rocket_group, shift=RIGHT * 0.3), run_time=0.8)
        self.play(
            GrowArrow(momentum_thrust), FadeIn(momentum_label), FadeIn(momentum_caption),
            run_time=0.8,
        )
        self.play(
            GrowArrow(pressure_thrust), FadeIn(pressure_label), FadeIn(pressure_caption),
            run_time=0.8,
        )

        # combine into a single resultant: V_eq * mdot
        resultant = Arrow(nozzle, nozzle + backward * 1.6 + DOWN * 0.1, buff=0.05,
                           color=pal.COLOR_HIGHLIGHT, stroke_width=7,
                           max_tip_length_to_length_ratio=0.16)
        resultant_label = MathTex(r"V_{eq}\,\dot m", color=pal.COLOR_HIGHLIGHT, font_size=38)
        resultant_label.next_to(resultant.get_end(), RIGHT, buff=0.15)

        plus_sign = MathTex("+", font_size=40).move_to(
            (momentum_thrust.get_center() + pressure_thrust.get_center()) / 2 + RIGHT * 0.6
        )

        self.play(FadeIn(plus_sign), run_time=0.4)
        self.play(
            FadeOut(VGroup(momentum_thrust, pressure_thrust, momentum_label, pressure_label,
                            momentum_caption, pressure_caption, plus_sign)),
            GrowArrow(resultant), FadeIn(resultant_label),
            run_time=1.0,
        )

        # ------------------------------------------------------------------
        # Definition of V_eq
        # ------------------------------------------------------------------
        veq_def = MathTex(
            "V_{eq}", "=", r"\dfrac{(p - p_0)A}{\dot m}", "+", "v"
        ).set_color_by_tex_to_color_map({
            "V_{eq}": pal.COLOR_HIGHLIGHT, r"\dfrac{(p - p_0)A}{\dot m}": pal.COLOR_PRESSURE,
            "v": pal.COLOR_EXHAUST,
        })
        veq_def.to_edge(RIGHT, buff=0.8).shift(UP * 0.5)
        self.play(Write(veq_def), run_time=1.2)
        self.wait(0.6)

        self.play(FadeOut(VGroup(rocket_group, resultant, resultant_label)), run_time=0.6)

        # ------------------------------------------------------------------
        # Substituting V_eq into the equation of motion
        # ------------------------------------------------------------------
        substituted = MathTex(
            "M\\,du", "=", "V_{eq}\\,\\dot m\\,dt"
        ).set_color_by_tex_to_color_map({
            "M\\,du": pal.COLOR_VELOCITY, "V_{eq}\\,\\dot m\\,dt": pal.COLOR_HIGHLIGHT,
        })
        substituted.move_to(recap)

        self.play(
            FadeOut(rate_note),
            TransformMatchingTex(VGroup(recap, veq_def), substituted),
            run_time=1.2,
        )
        self.wait(0.4)

        # ------------------------------------------------------------------
        # Draining fuel tank: dm = -dM  (mass lost by rocket = mass ejected)
        # ------------------------------------------------------------------
        tank_outline = Rectangle(width=1.4, height=2.6, color=pal.TEXT_SECONDARY,
                                  stroke_width=3)
        tank_outline.next_to(substituted, DOWN, buff=1.0).shift(LEFT * 3.0)

        level = ValueTracker(0.85)  # fraction full

        fuel = always_redraw(lambda: Rectangle(
            width=1.4 - 0.08, height=(2.6 - 0.08) * level.get_value(),
            color=pal.COLOR_MASS, fill_color=pal.COLOR_MASS, fill_opacity=0.85,
            stroke_width=0,
        ).move_to(tank_outline.get_bottom() + UP * 0.04, aligned_edge=DOWN))

        m_label = always_redraw(lambda: MathTex("M(t)", color=pal.COLOR_MASS, font_size=32)
                                 .next_to(tank_outline, UP, buff=0.15))

        self.play(FadeIn(tank_outline), FadeIn(fuel), FadeIn(m_label), run_time=0.8)

        dM_eq = MathTex(
            "dm = -\\,dM", ",\\quad dM < 0"
        ).set_color_by_tex_to_color_map({"dm = -\\,dM": pal.COLOR_MASS})
        dM_eq.next_to(tank_outline, RIGHT, buff=1.0)

        self.play(FadeIn(dM_eq, shift=RIGHT * 0.3), run_time=0.8)
        self.play(level.animate.set_value(0.35), run_time=2.2, rate_func=linear)
        self.wait(0.3)

        # ------------------------------------------------------------------
        # Final form: du = -V_eq dM / M
        # ------------------------------------------------------------------
        final_eq = MathTex(
            "M\\,du", "=", "-\\,V_{eq}\\,dM"
        ).set_color_by_tex_to_color_map({
            "M\\,du": pal.COLOR_VELOCITY, "-\\,V_{eq}\\,dM": pal.COLOR_HIGHLIGHT,
        })
        final_eq2 = MathTex(
            "du", "=", "-\\,V_{eq}\\,\\dfrac{dM}{M}"
        ).set_color_by_tex_to_color_map({
            "du": pal.COLOR_VELOCITY, "-\\,V_{eq}\\,\\dfrac{dM}{M}": pal.COLOR_HIGHLIGHT,
        })

        final_group = VGroup(final_eq, final_eq2).arrange(DOWN, buff=0.4)
        final_group.next_to(dM_eq, DOWN, buff=0.6).align_to(dM_eq, LEFT)

        self.play(TransformFromCopy(substituted, final_eq), run_time=1.0)
        self.play(TransformFromCopy(final_eq, final_eq2), run_time=1.0)

        final_box = SurroundingRectangle(final_eq2, color=pal.COLOR_HIGHLIGHT, buff=0.15)
        self.play(Create(final_box), run_time=0.6)
        self.wait(1.0)

        # ------------------------------------------------------------------
        # Transition out
        # ------------------------------------------------------------------
        self.play(FadeOut(VGroup(
            title, substituted, tank_outline, fuel, m_label, dM_eq, final_eq, final_eq2,
            final_box,
        )), run_time=0.8)
