"""
Juego de la Viborita - Code in Place
Controles: flechas del teclado para mover la serpiente
"""

import time
import random
from graphics import Canvas

# Configuracion del tablero
CELL_SIZE = 20
COLS = 25
ROWS = 25
WIDTH = COLS * CELL_SIZE
HEIGHT = ROWS * CELL_SIZE

# Colores
COLOR_BG = "black"
COLOR_SNAKE_HEAD = "#00ff88"
COLOR_SNAKE_BODY = "#00cc66"
COLOR_FOOD = "#ff4444"
COLOR_TEXT = "white"

# Direcciones
UP = (0, -1)
DOWN = (0, 1)
LEFT = (-1, 0)
RIGHT = (1, 0)

KEY_MAP = {
    "ArrowUp": UP,
    "ArrowDown": DOWN,
    "ArrowLeft": LEFT,
    "ArrowRight": RIGHT,
    "w": UP,
    "s": DOWN,
    "a": LEFT,
    "d": RIGHT,
}

OPPOSITE = {UP: DOWN, DOWN: UP, LEFT: RIGHT, RIGHT: LEFT}


def draw_cell(canvas, col, row, color):
    x1 = col * CELL_SIZE + 1
    y1 = row * CELL_SIZE + 1
    x2 = x1 + CELL_SIZE - 2
    y2 = y1 + CELL_SIZE - 2
    return canvas.create_rectangle(x1, y1, x2, y2, color)


def random_food(snake):
    while True:
        col = random.randint(0, COLS - 1)
        row = random.randint(0, ROWS - 1)
        if (col, row) not in snake:
            return (col, row)


def draw_score(canvas, score):
    canvas.create_text(
        WIDTH // 2, 12,
        text=f"Puntos: {score}",
        font="Arial",
        font_size=14,
        color=COLOR_TEXT,
    )


def draw_game_over(canvas, score):
    canvas.create_rectangle(WIDTH // 2 - 110, HEIGHT // 2 - 40,
                             WIDTH // 2 + 110, HEIGHT // 2 + 50, "#222222")
    canvas.create_text(
        WIDTH // 2, HEIGHT // 2 - 15,
        text="GAME OVER",
        font="Arial",
        font_size=24,
        color="#ff4444",
    )
    canvas.create_text(
        WIDTH // 2, HEIGHT // 2 + 20,
        text=f"Puntaje final: {score}",
        font="Arial",
        font_size=16,
        color=COLOR_TEXT,
    )


def main():
    canvas = Canvas(WIDTH, HEIGHT)
    canvas.set_canvas_background_color(COLOR_BG)

    # Estado inicial: serpiente en el centro mirando a la derecha
    start_col, start_row = COLS // 2, ROWS // 2
    snake = [(start_col, start_row), (start_col - 1, start_row), (start_col - 2, start_row)]
    direction = RIGHT
    food = random_food(snake)
    score = 0
    speed = 0.15  # segundos entre frames

    while True:
        # --- Input ---
        key = canvas.get_key()
        new_dir = KEY_MAP.get(key)
        if new_dir and new_dir != OPPOSITE.get(direction):
            direction = new_dir

        # --- Mover serpiente ---
        head_col, head_row = snake[0]
        new_col = head_col + direction[0]
        new_row = head_row + direction[1]

        # Colision con paredes
        if not (0 <= new_col < COLS and 0 <= new_row < ROWS):
            break

        new_head = (new_col, new_row)

        # Colision con ella misma
        if new_head in snake:
            break

        snake.insert(0, new_head)

        # Comer comida
        if new_head == food:
            score += 1
            food = random_food(snake)
            # Acelerar un poco
            speed = max(0.06, speed - 0.005)
        else:
            snake.pop()

        # --- Dibujar ---
        canvas.clear()

        # Comida
        draw_cell(canvas, food[0], food[1], COLOR_FOOD)

        # Serpiente
        for i, (col, row) in enumerate(snake):
            color = COLOR_SNAKE_HEAD if i == 0 else COLOR_SNAKE_BODY
            draw_cell(canvas, col, row, color)

        draw_score(canvas, score)

        time.sleep(speed)

    # Game over
    canvas.clear()
    draw_game_over(canvas, score)


if __name__ == "__main__":
    main()
