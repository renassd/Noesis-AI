"""
Scene 4 -- Conservation of momentum for a variable-mass system.

This is the heart of the original video's chalkboard derivation, redone with
`TransformMatchingTex` so each algebraic step visibly *morphs* into the next
instead of hard-cutting between static text cards.  A small "before / after"
diagram (time t vs. time t+dt) makes the abstract dm, du, v terms concrete:
the rocket's mass drops by dm while a chunk of exhaust leaves with velocity
(u - v) in the ground frame.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from manim import *

from utils import palette as pal
from utils.rocket import build_rocket, build_flame, get_nozzle_point, get_thrust_axis


def small_rocket_diagram(label_m, label_u, show_ejecta=False):
    """A compact rocket icon with mass/velocity labels, optionally showing a
    just-ejected exhaust packet for the "t + dt" snapshot."""
    rocket = build_rocket(height=1.2).rotate(90 * DEGREES)
    flame = build_flame(rocket)
    group = VGroup(rocket, flame)

    m_label = MathTex(label_m, color=pal.COLOR_MASS, font_size=34)
    m_label.next_to(rocket.body, UP, buff=0.12)

    u_arrow = Arrow(rocket.get_right(), rocket.get_right() + RIGHT * 1.0, buff=0.1,
                     color=pal.COLOR_VELOCITY, stroke_width=5,
                     max_tip_length_to_length_ratio=0.25)
    u_label = MathTex(label_u, color=pal.COLOR_VELOCITY, font_size=34)
    u_label.next_to(u_arrow, UP, buff=0.1)

    group_all = VGroup(group, m_label, u_arrow, u_label)

    if show_ejecta:
        nozzle = get_nozzle_point(rocket)
        backward = -get_thrust_axis(rocket)
        dm_dot = Dot(nozzle + backward * 0.7, radius=0.06, color=pal.COLOR_EXHAUST)
        dm_arrow = Arrow(dm_dot.get_center(), dm_dot.get_center() + backward * 0.8, buff=0.05,
                          color=pal.COLOR_EXHAUST, stroke_width=5,
                          max_tip_length_to_length_ratio=0.25)
        dm_label = MathTex("dm,\\;(u - v)", color=pal.COLOR_EXHAUST, font_size=28)
        dm_label.next_to(dm_arrow, DOWN, buff=0.1)
        group_all.add(dm_dot, dm_arrow, dm_label)

    return group_all


class MomentumConservationScene(Scene):
    def construct(self):
        self.camera.background_color = pal.SPACE_BG

        title = Text("Conservación del momento lineal", font_size=44,
                      weight=BOLD, color=pal.TEXT_PRIMARY)
        self.play(Write(title), run_time=1.0)
        self.play(title.animate.scale(0.6).to_edge(UP, buff=0.4), run_time=0.7)

        # ------------------------------------------------------------------
        # Before / after diagrams
        # ------------------------------------------------------------------
        before = small_rocket_diagram("M", "u")
        after = small_rocket_diagram("M - dm", "u + du", show_ejecta=True)

        before_label = Text("instante  t", font_size=26, color=pal.TEXT_SECONDARY)
        after_label = Text("instante  t + dt", font_size=26, color=pal.TEXT_SECONDARY)

        before_group = VGroup(before, before_label).arrange(DOWN, buff=0.25)
        after_group = VGroup(after, after_label).arrange(DOWN, buff=0.25)

        diagrams = VGroup(before_group, after_group).arrange(RIGHT, buff=2.2)
        diagrams.next_to(title, DOWN, buff=0.6)

        arrow_between = Arrow(before_group.get_right(), after_group.get_left(),
                               buff=0.2, color=pal.TEXT_SECONDARY, stroke_width=4)
        dt_label = MathTex("dt", color=pal.TEXT_SECONDARY, font_size=32)
        dt_label.next_to(arrow_between, UP, buff=0.05)

        self.play(FadeIn(before_group, shift=RIGHT * 0.3), run_time=0.8)
        self.play(GrowArrow(arrow_between), FadeIn(dt_label), run_time=0.6)
        self.play(FadeIn(after_group, shift=LEFT * 0.3), run_time=0.8)
        self.wait(0.4)

        diagram_group = VGroup(diagrams, arrow_between, dt_label)
        self.play(diagram_group.animate.scale(0.62).to_edge(UP, buff=1.1), run_time=0.8)

        # ------------------------------------------------------------------
        # Step 1: momentum at time t and t + dt
        # ------------------------------------------------------------------
        p_t = MathTex("p(t)", "=", "M", "u").set_color_by_tex_to_color_map({
            "M": pal.COLOR_MASS, "u": pal.COLOR_VELOCITY,
        })
        p_t1 = MathTex(
            "p(t+dt)", "=", "(M - dm)", "(u + du)", "+", "dm", "(u - v)"
        ).set_color_by_tex_to_color_map({
            "(M - dm)": pal.COLOR_MASS, "(u + du)": pal.COLOR_VELOCITY,
            "dm": pal.COLOR_MASS, "(u - v)": pal.COLOR_EXHAUST,
        })

        eqs = VGroup(p_t, p_t1).arrange(DOWN, buff=0.5, aligned_edge=LEFT)
        eqs.next_to(diagram_group, DOWN, buff=0.7)

        self.play(Write(p_t), run_time=1.0)
        self.play(Write(p_t1), run_time=1.4)
        self.wait(0.6)

        # ------------------------------------------------------------------
        # Step 2: expand, drop the second-order term dm*du
        # ------------------------------------------------------------------
        expanded = MathTex(
            r"p(t+dt) = Mu + M\,du - u\,dm + u\,dm - v\,dm \;",
            r"+\; \underbrace{dm\,du}_{\approx\,0}"
        )
        expanded[0].set_color_by_tex_to_color_map({
            "M": pal.COLOR_MASS, "du": pal.COLOR_VELOCITY,
            "u": pal.COLOR_VELOCITY, "dm": pal.COLOR_MASS, "v": pal.COLOR_EXHAUST,
        })
        expanded[1].set_color(pal.COLOR_NEGLECT)
        expanded.scale(0.78)
        expanded.move_to(p_t1, aligned_edge=LEFT).shift(DOWN * 1.0)

        self.play(TransformFromCopy(p_t1, expanded[0]), run_time=1.2)
        self.play(FadeIn(expanded[1]), run_time=0.6)
        self.wait(0.3)
        self.play(FadeOut(expanded[1]), run_time=0.5)

        # ------------------------------------------------------------------
        # Step 3: change of momentum
        # ------------------------------------------------------------------
        delta_p = MathTex(
            r"\Delta p = p(t+dt) - p(t) = ", "M\\,du", "-", "v\\,dm"
        ).set_color_by_tex_to_color_map({
            "M\\,du": pal.COLOR_VELOCITY, "v\\,dm": pal.COLOR_EXHAUST,
        })
        delta_p.move_to(expanded[0], aligned_edge=LEFT)

        self.play(
            FadeOut(p_t), FadeOut(p_t1),
            TransformMatchingShapes(expanded[0], delta_p),
            run_time=1.2,
        )
        box_dp = SurroundingRectangle(delta_p, color=pal.COLOR_HIGHLIGHT, buff=0.15)
        self.play(Create(box_dp), run_time=0.6)
        self.wait(0.6)

        # the before/after diagram has served its purpose -- clear the way
        self.play(FadeOut(diagram_group), run_time=0.6)

        # ------------------------------------------------------------------
        # Step 4: external force (pressure thrust, weight neglected)
        # ------------------------------------------------------------------
        self.play(
            VGroup(delta_p, box_dp).animate.scale(0.85).to_edge(UP, buff=1.3),
            run_time=0.7,
        )

        force_eq = MathTex(
            "F", "=", "(p - p_0)A", "-", "Mg\\cos\\theta"
        ).set_color_by_tex_to_color_map({
            "(p - p_0)A": pal.COLOR_PRESSURE, "Mg\\cos\\theta": pal.COLOR_GRAVITY,
            "F": pal.COLOR_FORCE,
        })
        note_drag = Text("(se desprecia la resistencia del aire)", font_size=24,
                          color=pal.TEXT_SECONDARY)
        force_group = VGroup(force_eq, note_drag).arrange(DOWN, buff=0.25)
        force_group.next_to(delta_p, DOWN, buff=0.9)

        self.play(Write(force_eq), run_time=1.2)
        self.play(FadeIn(note_drag), run_time=0.6)
        self.wait(0.4)

        # cross out the gravity term -- "neglect weight"
        cross = Cross(force_eq[4], stroke_color=pal.COLOR_NEGLECT, stroke_width=5)
        note_weight = Text("(se desprecia el peso frente al empuje)", font_size=24,
                            color=pal.COLOR_NEGLECT)
        note_weight.next_to(force_group, DOWN, buff=0.3)
        self.play(Create(cross), FadeIn(note_weight), run_time=0.8)
        self.wait(0.4)

        force_simplified = MathTex("F", "=", "(p - p_0)A").set_color_by_tex_to_color_map({
            "(p - p_0)A": pal.COLOR_PRESSURE, "F": pal.COLOR_FORCE,
        })
        force_simplified.move_to(force_eq, aligned_edge=LEFT)
        self.play(
            FadeOut(force_eq[3]), FadeOut(force_eq[4]), FadeOut(cross),
            FadeOut(note_drag), FadeOut(note_weight),
            ReplacementTransform(force_eq[0], force_simplified[0]),
            ReplacementTransform(force_eq[1], force_simplified[1]),
            ReplacementTransform(force_eq[2], force_simplified[2]),
            run_time=1.0,
        )
        self.wait(0.4)

        # ------------------------------------------------------------------
        # Step 5: impulse - momentum theorem -> the rocket's equation of motion
        # ------------------------------------------------------------------
        impulse_note = Text("Impulso = variación de momento  (F·dt = Δp)",
                             font_size=26, color=pal.TEXT_SECONDARY)
        impulse_note.next_to(force_simplified, DOWN, buff=0.5)
        self.play(FadeIn(impulse_note), run_time=0.8)
        self.wait(0.3)

        final_eq = MathTex(
            "M\\,du", "=", "(p - p_0)A\\,dt", "+", "v\\,dm"
        ).set_color_by_tex_to_color_map({
            "M\\,du": pal.COLOR_VELOCITY, "(p - p_0)A\\,dt": pal.COLOR_PRESSURE,
            "v\\,dm": pal.COLOR_EXHAUST,
        })
        final_eq.scale(1.15)
        final_eq.move_to(impulse_note).shift(DOWN * 0.9)

        self.play(
            FadeOut(impulse_note),
            TransformFromCopy(VGroup(delta_p, force_simplified), final_eq),
            run_time=1.4,
        )
        final_box = SurroundingRectangle(final_eq, color=pal.COLOR_HIGHLIGHT, buff=0.2)
        self.play(Create(final_box), run_time=0.6)
        self.wait(1.0)

        # ------------------------------------------------------------------
        # Transition out
        # ------------------------------------------------------------------
        self.play(FadeOut(VGroup(
            title, diagram_group, delta_p, box_dp, force_simplified, final_eq, final_box,
        )), run_time=0.8)
